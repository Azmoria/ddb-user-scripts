// ==UserScript==
// @name         Inject DDB Dice on all pages
// @namespace    github.com/azmoria
// @version      1.0
// @description  Adds D&D Beyond's new 3D dice roller to almost all DDB pages
// @author       Azmoria
// @downloadURL  https://github.com/Azmoria/dice-on-all-ddb-pages/raw/refs/heads/main/inject-dice-on-all-ddb-pages.user.js
// @updateURL    https://github.com/Azmoria/dice-on-all-ddb-pages/raw/refs/heads/main/inject-dice-on-all-ddb-pages.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dndbeyond.com
// @match        https://www.dndbeyond.com/*
// @exclude      https://www.dndbeyond.com/*abovevtt*
// @exclude      https://www.dndbeyond.com/my-dice*
// @exclude     https://www.dndbeyond.com/*encounter*
// @exclude     https://www.dndbeyond.com/*character*
// @exclude     /^https://www.dndbeyond.com/campaigns/\d+.*popoutgamelog=true.*/
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
    const DICE_PARSE_PATTERN = /([+-]?)(\d*)d(4|6|8|10|12|20|100)\b/gi;
    const ROLL_BUTTON_PATTERN = /\(?\d+d(?:4|6|8|10|12|20|100)(?:\s*[+−-]\s*\d+)?\)?|\bd(?:4|6|8|10|12|20|100)\b|[+−-]\d+/gi;
    const state = {
        physicsWorker: undefined,
        renderer: undefined,
        diceSets: [],
        diceConfig: undefined,
        userId: undefined,
        counts: {},
        modifier: 0,
        diceButtonsExpanded: false,
        rollKind: ''
    };


    let cobaltToken;
    let cobaltTokenExpiration = 0;
    let diceDetailsPromise;

    async function get_cobalt_token() {
        if (cobaltToken && Date.now() < cobaltTokenExpiration) return cobaltToken;
        const response = await fetch('https://auth-service.dndbeyond.com/v1/cobalt-token', {
            method: 'POST',
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`cobalt-token request failed: ${response.status}`);
        const data = await response.json();
        cobaltToken = data.token;
        cobaltTokenExpiration = Date.now() + (data.ttl * 1000) - 10000;
        return cobaltToken;
    }

    function decode_jwt_payload(token) {
        try {
            const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(decodeURIComponent(escape(atob(payload))));
        } catch (error) {
            console.warn('Failed to decode cobalt token', error);
            return {};
        }
    }

    function find_user_id(tokenClaims) {
        if (window.Cobalt?.User?.ID) return `${window.Cobalt.User.ID}`;
        const claimKey = Object.keys(tokenClaims).find(key => /primarysid|nameidentifier|userid|\bsub\b/i.test(key));
        return claimKey ? `${tokenClaims[claimKey]}` : '0';
    }

    async function load_dice_details() {
        const token = await get_cobalt_token();
        state.userId = find_user_id(decode_jwt_payload(token));

        const request = async url => {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include'
            });
            if (!response.ok) {
                console.warn(`Dice service request failed for ${url}`, response.status);
                return undefined;
            }
            return response.json();
        };

        const [diceConfig, familySets] = await Promise.all([
            request('https://dice-service.dndbeyond.com/diceuserconfig/v1/get'),
            request('https://dice-service.dndbeyond.com/dice/v1/getallfamilysets')
        ]);

        state.diceConfig = diceConfig;
        state.diceSets = extract_dice_sets(familySets);
    }

    function ensure_dice_details_loaded() {
        if (!diceDetailsPromise) {
            diceDetailsPromise = load_dice_details();
        }
        return diceDetailsPromise;
    }

    function extract_dice_sets(response) {
        const diceFamilies = response?.data?.familySets ?? response?.data?.diceSets ?? response?.familySets ?? response?.diceSets ?? response?.data ?? response;
        if (!Array.isArray(diceFamilies)) return [];
        return diceFamilies.flatMap(family => family?.sets?.definitionData ?? []);
    }


    function get_dice_worker_urls_from_resources(resourceUrls) {
        const physicsWorkerUrl = resourceUrls.find(url => url.includes('/dice/mobile/physicsWorker.'));
        const renderedWorkerUrl = resourceUrls.find(url => url.includes('/dice/mobile/renderedWorker.'));
        if (!physicsWorkerUrl || !renderedWorkerUrl) return undefined;
        return { physicsWorkerUrl, renderedWorkerUrl };
    }

    function discover_dice_worker_urls() {
        const currentPageResources = performance.getEntriesByType('resource').map(entry => entry.name);
        const currentPageWorkerUrls = get_dice_worker_urls_from_resources(currentPageResources);
        if (currentPageWorkerUrls) return Promise.resolve(currentPageWorkerUrls);

        return new Promise(resolve => {
            const iframe = document.createElement('iframe');
            let pollingInterval;
            let timeout;
            let settled = false;

            const finish = workerUrls => {
                if (settled) return;
                settled = true;
                clearInterval(pollingInterval);
                clearTimeout(timeout);
                iframe.remove();
                resolve(workerUrls);
            };

            const findWorkerUrls = () => {
                try {
                    const resourceUrls = iframe.contentWindow.performance
                        .getEntriesByType('resource')
                        .map(entry => entry.name);
                    const workerUrls = get_dice_worker_urls_from_resources(resourceUrls);
                    if (workerUrls) {
                        finish(workerUrls);
                    }
                } catch (error) {
                    // cross-origin/not-ready yet; keep polling
                }
            };

            iframe.hidden = true;
            iframe.style.display = 'none';
            iframe.addEventListener('load', () => {
                findWorkerUrls();
                pollingInterval = setInterval(findWorkerUrls, 150);
            }, { once: true });
            timeout = setTimeout(() => finish(undefined), 8000);
            iframe.src = '/my-dice';
            document.body.append(iframe);
        });
    }

    function create_dice_worker(url, name) {
        const worker = new Worker(url, {
            name: JSON.stringify({
                name,
                isDebug: false,
                isPhysicsDebug: false,
                isMobileApp: false,
                isAnimationsDisabled: false,
                nodeEnv: 'production',
                env: 'production',
                user: { id: state.userId }
            }),
            type: 'module'
        });

        const originalPostMessage = worker.postMessage.bind(worker);
        worker.postMessage = function (message, transfer) {
            const result = originalPostMessage(message, transfer);
            // DDB resets frameloop to 'always' on resize, which pins the GPU; force it back to 'demand'.
            if (message && typeof message === 'object' && message.type === 'resize') {
                setTimeout(() => originalPostMessage({ type: 'props', payload: { dpr: 1, frameloop: 'demand' } }), 60);
            }
            return result;
        };
        return worker;
    }

    function initialize_dice_worker(worker, drawingSurface, frameloop) {
        const props = { dpr: 1, frameloop };
        worker.postMessage({
            type: 'init',
            payload: {
                props,
                drawingSurface,
                width: drawingSurface.width,
                height: drawingSurface.height,
                top: 0,
                left: 0,
                pixelRatio: 1
            }
        }, [drawingSurface]);
        worker.postMessage({ type: 'props', payload: props });
    }

    function configure_rendered_dice(renderer, physicsWorker) {
        const setId = state.diceConfig?.data?.setId;
        const userSettings = state.diceConfig?.data?.settings;

        renderer.postMessage({ type: 'diceSets', payload: state.diceSets });
        renderer.postMessage({ type: 'preRoll', payload: { data: { setId } } });
        renderer.postMessage({
            type: 'userSettings',
            payload: {
                shadowQuality: userSettings?.shadowQuality,
                particlesEnabled: userSettings?.particlesEnabled,
                volume: userSettings?.volume
            }
        });
        physicsWorker.postMessage({ type: 'props', payload: { dpr: 1, frameloop: 'never' } });
        renderer.postMessage({ type: 'props', payload: { dpr: 1, frameloop: 'demand' } });
    }

    async function configure_rendered_dice_when_ready(renderer, physicsWorker) {
        await ensure_dice_details_loaded();
        configure_rendered_dice(renderer, physicsWorker);
    }

    async function add_new_dice() {
        const workerUrls = await discover_dice_worker_urls();
        if (!workerUrls) {
            console.warn('Could not discover DDB dice worker URLs; 3D dice not injected.');
            return false;
        }
        const { physicsWorkerUrl, renderedWorkerUrl } = workerUrls;

        const canvas = document.createElement('canvas');
        canvas.classList.add('ddbdice-container');
        const canvas2 = document.createElement('canvas');
        canvas2.classList.add('ddbdice-container');

        const getDiceViewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });

        const initialSize = getDiceViewportSize();
        canvas.width = canvas2.width = initialSize.width;
        canvas.height = canvas2.height = initialSize.height;

        document.body.append(canvas, canvas2);

        const physicsWorker = create_dice_worker(physicsWorkerUrl, 'physics');
        const renderer = create_dice_worker(renderedWorkerUrl, 'rendered');
        state.physicsWorker = physicsWorker;
        state.renderer = renderer;
        let rendererConfigured = false;

        initialize_dice_worker(physicsWorker, canvas.transferControlToOffscreen(), 'never');
        initialize_dice_worker(renderer, canvas2.transferControlToOffscreen(), 'demand');

        physicsWorker.onmessage = e => {
            if (e.data.type === 'preRoll') {
                renderer.postMessage(e.data);
                physicsWorker.postMessage({ ...e.data, type: 'startRoll' });
            }
            if (e.data.type === 'renderDice') {
                renderer.postMessage(e.data);
            }
        };

        renderer.onmessage = event => {
            if (event.data.type === 'componentMounted' && !rendererConfigured) {
                rendererConfigured = true;
                void configure_rendered_dice_when_ready(renderer, physicsWorker);
            }
        };

        const resizeDiceCanvases = () => {
            const { width, height } = getDiceViewportSize();
            canvas.style.width = canvas2.style.width = `${width}px`;
            canvas.style.height = canvas2.style.height = `${height}px`;
            const payload = { width, height, top: 0, left: 0 };
            physicsWorker.postMessage({ type: 'resize', payload });
            renderer.postMessage({ type: 'resize', payload });
        };
        window.addEventListener('resize', resizeDiceCanvases);
        resizeDiceCanvases();

        return true;
    }

    function clear_dice() {
        state.physicsWorker?.postMessage({ type: 'resetStore' });
        state.renderer?.postMessage({ type: 'resetStore' });
    }


    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function roll_die(dieType) {
        const sides = parseInt(dieType.replace('d', ''), 10);
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);
        return (buffer[0] % sides) + 1;
    }

    function format_signed(value) {
        return value >= 0 ? `+${value}` : `${value}`;
    }

    function get_die_sides(dieType) {
        return parseInt(dieType.replace('d', ''), 10);
    }

    function join_formula_terms(terms) {
        if (!Array.isArray(terms) || terms.length === 0) return '(none)';
        let expression = '';
        for (const term of terms) {
            if (!term) continue;
            if (!expression) {
                expression = term.startsWith('+') ? term.slice(1) : term;
                continue;
            }
            if (term.startsWith('-')) {
                expression += term;
            } else if (term.startsWith('+')) {
                expression += `+${term.slice(1)}`;
            } else {
                expression += `+${term}`;
            }
        }
        return expression || '(none)';
    }

    function classify_roll_value(value, sides) {
        const absoluteValue = Math.abs(value);
        if (absoluteValue === sides) return 'max';
        if (absoluteValue === 1) return 'min';
        return 'none';
    }

    function render_breakdown_html(parts) {
        if (!Array.isArray(parts) || parts.length === 0) return '(none)';

        const classFor = kind => (kind === 'max' ? 'ddbdice-value-max' : kind === 'min' ? 'ddbdice-value-min' : '');

        const partToHtml = part => {
            if (part.kind === 'single') {
                const sign = part.value < 0 ? '-' : '+';
                const cls = classFor(classify_roll_value(part.value, part.sides));
                const valueHtml = cls ? `<span class="${cls}">${Math.abs(part.value)}</span>` : `${Math.abs(part.value)}`;
                return `${sign}${valueHtml}`;
            }

            if (part.kind === 'pair') {
                const pairSign = part.keepFirst ? (part.first < 0 ? '-' : '') : (part.second < 0 ? '-' : '');
                const firstDropped = !part.keepFirst;
                const secondDropped = part.keepFirst;
                const firstClass = classFor(classify_roll_value(part.first, part.sides));
                const secondClass = classFor(classify_roll_value(part.second, part.sides));
                const firstValue = firstClass ? `<span class="${firstClass}">${Math.abs(part.first)}</span>` : `${Math.abs(part.first)}`;
                const secondValue = secondClass ? `<span class="${secondClass}">${Math.abs(part.second)}</span>` : `${Math.abs(part.second)}`;
                const firstHtml = firstDropped ? `<span class="ddbdice-value-dropped">d${firstValue}</span>` : firstValue;
                const secondHtml = secondDropped ? `<span class="ddbdice-value-dropped">d${secondValue}</span>` : secondValue;
                return `${pairSign}(${firstHtml},${secondHtml})`;
            }

            return '';
        };

        const tokens = parts.map(partToHtml).filter(Boolean);
        if (tokens.length === 0) return '(none)';

        let expression = '';
        for (const token of tokens) {
            if (!expression) {
                expression = token.startsWith('+') ? token.slice(1) : token;
                continue;
            }
            if (token.startsWith('-')) expression += token;
            else if (token.startsWith('+')) expression += `+${token.slice(1)}`;
            else expression += `+${token}`;
        }
        return expression || '(none)';
    }

    function build_roll_message(counts, modifier, rollKind = '') {
        const set = [];
        const values = [];
        const signedValues = [];
        const individualDisplay = [];
        const individualParts = [];
        const notation = [];
        let hasMax = false;
        let hasMin = false;

        for (const dieType of DICE_TYPES) {
            const count = counts[dieType] || 0;
            if (count === 0) continue;
            const rollCount = Math.abs(count);
            const isNegative = count < 0;
            const dice = [];

            for (let i = 0; i < rollCount; i++) {
                const sides = get_die_sides(dieType);
                if (rollKind === 'advantage' || rollKind === 'disadvantage') {
                    const first = roll_die(dieType);
                    const second = roll_die(dieType);
                    dice.push({ dieType, dieValue: first });
                    dice.push({ dieType, dieValue: second });
                    const kept = rollKind === 'advantage' ? Math.max(first, second) : Math.min(first, second);
                    values.push(kept);
                    signedValues.push(isNegative ? -kept : kept);
                    if (kept === sides) hasMax = true;
                    if (kept === 1) hasMin = true;

                    const signedFirst = isNegative ? -first : first;
                    const signedSecond = isNegative ? -second : second;
                    const keepFirst = rollKind === 'advantage' ? first >= second : first <= second;
                    const keptSigned = keepFirst ? signedFirst : signedSecond;
                    const firstDisplay = keepFirst ? `${Math.abs(signedFirst)}` : `d${Math.abs(signedFirst)}`;
                    const secondDisplay = keepFirst ? `d${Math.abs(signedSecond)}` : `${Math.abs(signedSecond)}`;
                    const pairTerm = `(${firstDisplay},${secondDisplay})`;
                    individualDisplay.push(keptSigned < 0 ? `-${pairTerm}` : pairTerm);
                    individualParts.push({
                        kind: 'pair',
                        first: signedFirst,
                        second: signedSecond,
                        keepFirst,
                        sides
                    });
                } else {
                    const dieValue = roll_die(dieType);
                    dice.push({ dieType, dieValue });
                    values.push(dieValue);
                    const signedValue = isNegative ? -dieValue : dieValue;
                    signedValues.push(signedValue);
                    if (dieValue === sides) hasMax = true;
                    if (dieValue === 1) hasMin = true;
                    individualDisplay.push(format_signed(signedValue));
                    individualParts.push({ kind: 'single', value: signedValue, sides });
                }
            }

            set.push({ dice, count: dice.length, dieType, operation: isNegative ? 1 : 0 });

            if (rollKind === 'advantage') {
                notation.push(`${isNegative ? '-' : ''}${rollCount}x(2${dieType}kh1)`);
            } else if (rollKind === 'disadvantage') {
                notation.push(`${isNegative ? '-' : ''}${rollCount}x(2${dieType}kl1)`);
            } else {
                notation.push(`${isNegative ? '-' : ''}${rollCount}${dieType}`);
            }
        }

        if (set.length === 0) return undefined;

        const total = signedValues.reduce((sum, value) => sum + value, 0) + modifier;

        let expression = '';
        for (const term of notation) {
            if (!expression) expression = term;
            else expression += term.startsWith('-') ? term : `+${term}`;
        }
        if (modifier !== 0) expression += modifier < 0 ? `${modifier}` : `+${modifier}`;

        const resultText = signedValues.reduce((text, value, index) => {
            if (index === 0) return `${value}`;
            return `${text}${value < 0 ? '' : '+'}${value}`;
        }, '');

        const highlight = hasMax && hasMin ? 'mixed' : hasMax ? 'max' : hasMin ? 'min' : 'none';

        return {
            id: uuid(),
            dateTime: `${Date.now()}`,
            userId: `${state.userId}`,
            source: 'web',
            persist: false,
            messageScope: 'userId',
            messageTarget: `${state.userId}`,
            entityId: `${state.userId}`,
            entityType: 'user',
            eventType: 'dice/roll/deferred',
            data: {
                action: 'custom',
                setId: state.diceConfig?.data?.setId,
                context: {
                    entityId: `${state.userId}`,
                    entityType: 'user',
                    messageScope: 'userId',
                    messageTarget: `${state.userId}`
                },
                rollId: uuid(),
                rolls: [{
                    diceNotation: { set, constant: modifier },
                    diceNotationStr: expression,
                    rollType: 'roll',
                    rollKind,
                    result: {
                        constant: modifier,
                        values,
                        individualResults: [...signedValues],
                        individualDisplay,
                        individualParts,
                        highlight,
                        total,
                        text: `${resultText}${modifier ? (modifier < 0 ? modifier : `+${modifier}`) : ''}`
                    }
                }]
            }
        };
    }

    function animate_roll(message) {
        if (!state.physicsWorker) return;
        state.physicsWorker.postMessage({
            type: 'dice/roll/deferred',
            payload: { ...message, eventType: 'dice/roll/deferred' }
        });
    }

    function roll_pending_dice(rollKind = state.rollKind) {
        const message = build_roll_message(state.counts, state.modifier, rollKind);
        if (!message) return;
        animate_roll(message);
        show_result(message);
        reset_pending_dice();
    }

    function roll_expression(expression, rollKind = '') {
        if (!state.physicsWorker) return false;
        let text = `${expression ?? ''}`.replace(/\s+/g, '').replace(/−/g, '-');
        if (/^[+-]\d+$/.test(text)) text = `1d20${text}`;
        else if (/^d(?:4|6|8|10|12|20|100)$/i.test(text)) text = `1${text}`;
        const counts = {};
        let modifier = 0;
        let hasDice = false;
        DICE_PARSE_PATTERN.lastIndex = 0;
        const remainder = text.replace(DICE_PARSE_PATTERN, (_match, sign, countText, sidesText) => {
            const dieType = `d${sidesText}`.toLowerCase();
            const count = parseInt(countText, 10) || 1;
            const signedCount = sign === '-' ? -count : count;
            counts[dieType] = (counts[dieType] || 0) + signedCount;
            hasDice = true;
            return '';
        });

        if (!hasDice) return false;
        for (const modifierText of remainder.match(/[+-]?\d+/g) || []) {
            modifier += parseInt(modifierText, 10);
        }

        state.counts = counts;
        state.modifier = modifier;
        roll_pending_dice(rollKind);
        return true;
    }

    window.ddbDiceRoller = {
        roll: roll_expression,
        addRollButtons: add_roll_buttons
    };

    function add_roll_buttons(root = document.body) {
        if (!root) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            const parent = node.parentElement;
            if (!parent || parent.closest('button, a, script, style, textarea, input, #ddbdice-toolbar, #ddbdice-results, canvas')) continue;
            ROLL_BUTTON_PATTERN.lastIndex = 0;
            if (ROLL_BUTTON_PATTERN.exec(node.nodeValue)) textNodes.push(node);
        }

        for (const textNode of textNodes) {
            const text = textNode.nodeValue;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            ROLL_BUTTON_PATTERN.lastIndex = 0;
            while ((match = ROLL_BUTTON_PATTERN.exec(text))) {
                fragment.append(text.slice(lastIndex, match.index));
                const expression = match[0];
                const normalizedExpression = expression.replace(/−/g, '-');
                const rollExpression = /^[+-]\d+$/.test(normalizedExpression)
                    ? `1d20${normalizedExpression}`
                    : /^d(?:4|6|8|10|12|20|100)$/i.test(expression)
                        ? `1${expression}`
                        : expression;
                const button = document.createElement('button');
                button.className = 'integrated-dice__container ddbdice-inline-roll';
                button.type = 'button';
                button.textContent = expression;
                button.title = `Roll ${expression}`;
                button.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    roll_expression(rollExpression);
                });
                fragment.append(button);
                lastIndex = dicePattern.lastIndex;
            }
            fragment.append(text.slice(lastIndex));
            textNode.replaceWith(fragment);
        }
    }

    let rollButtonScanTimer;
    const rollButtonObserver = new MutationObserver(() => {
        clearTimeout(rollButtonScanTimer);
        rollButtonScanTimer = setTimeout(() => add_roll_buttons(), 150);
    });
    rollButtonObserver.observe(document.body, { childList: true, subtree: true });

    function add_styles() {
        const style = document.createElement('style');
        style.textContent = `
            .ddbdice-container {
                position: fixed;
                top: 0;
                left: 0;
                z-index: 999999999;
                pointer-events: none;
            }
            #ddbdice-toolbar {
                position: fixed;
                bottom: 12px;
                left: 12px;
                z-index: 1000000000;
                display: flex;
                flex-direction: column;
                align-items: stretch;
                gap: 3px;
                padding: 4px;
                border-radius: 12px;
                background: #182026;
                box-shadow: 2px 2px 6px rgba(0,0,0,.6);
                font-family: Roboto, sans-serif;
                color: #fff;
                width: min(82vw, 182px);
                max-height: 62vh;
                overflow-y: auto;
            }
            #ddbdice-toolbar-panel {
                display: none;
                flex-direction: column;
                align-items: stretch;
                gap: 4px;
            }
            #ddbdice-toolbar-panel.expanded {
                display: flex;
            }
            #ddbdice-dice-buttons {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 3px;
                width: 100%;
            }
            #ddbdice-roll-actions {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 3px;
                width: 100%;
            }
            #ddbdice-toolbar button {
                min-width: 0;
                width: 100%;
                height: 26px;
                padding: 0 6px;
                border: 1px solid #394b59;
                border-radius: 13px;
                background: #202b33;
                color: #bfccd6;
                cursor: pointer;
                font-size: 12px;
                font-weight: 700;
            }
            #ddbdice-toggle-controls {
                background: #30404d;
                color: #fff;
                border-color: #5c7080;
                min-width: 0;
                font-weight: 800;
            }
            #ddbdice-toggle-controls:hover {
                background: #5c7080;
            }
            #ddbdice-toolbar button:hover { background: #394b59; color: #fff; }
            #ddbdice-toolbar button[data-count]:after {
                content: attr(data-count);
                margin-left: 4px;
                color: #f5a623;
            }
            #ddbdice-roll-actions button.ddbdice-active-mode {
                background: #5c7080;
                color: #fff;
                border-color: #8a9ba8;
            }
            #ddbdice-toolbar input {
                width: 100%;
                height: 26px;
                border: 1px solid #394b59;
                border-radius: 13px;
                background: #202b33;
                color: #fff;
                text-align: center;
                font-size: 11px;
            }
            #ddbdice-toolbar .ddbdice-roll { background: #c53131; color: #fff; border-color: #c53131; }
            #ddbdice-results {
                position: fixed;
                bottom: 60px;
                left: 12px;
                z-index: 1000000000;
                display: flex;
                flex-direction: column;
                gap: 6px;
                pointer-events: auto !important;
                font-family: Roboto, sans-serif;
                transition: bottom 120ms ease;
            }
            #ddbdice-results > div {
                position: relative;
                padding: 8px 12px;
                border-radius: 8px;
                background: #182026;
                color: #fff;
                box-shadow: 2px 2px 6px rgba(0,0,0,.6);
                font-size: 14px;
                pointer-events: auto !important;
            }
            #ddbdice-results > div strong {
                font-size: inherit;
                line-height: 1;
            }
            .ddbdice-result-line {
                display: flex;
                align-items: baseline;
                gap: 6px;
                font-size: 24px;
                line-height: 1;
            }
            .ddbdice-result-line .ddbdice-result-separator {
                color: #8a9ba8;
            }
            .ddbdice-result-line > strong {
                margin-left: auto;
            }
            #ddbdice-results .ddbdice-result-separator { margin: 0 4px; }
            #ddbdice-results strong.ddbdice-total-max { color: #48c774 !important; }
            #ddbdice-results strong.ddbdice-total-min { color: #ff6b6b !important; }
            #ddbdice-results strong.ddbdice-total-mixed { color: #5aa9ff !important; }
            .ddbdice-roll-breakdown-inline {
                color: #fff;
                font-size: inherit;
                line-height: inherit;
                word-break: break-word;
            }
            .ddbdice-roll-breakdown-inline .ddbdice-value-max {
                color: #48c774;
            }
            .ddbdice-roll-breakdown-inline .ddbdice-value-min {
                color: #ff6b6b;
            }
            .ddbdice-roll-breakdown-inline .ddbdice-value-dropped {
                opacity: 0.25;
            }
            .ddbdice-roll-caption {
                margin-top: 2px;
                color: #8a9ba8;
                font-size: 16px;
                line-height: 1.1;
                word-break: break-word;
            }
            .ddbdice-inline-roll {
                color: #b43c35;
                border: 1px solid #b43c35;
                border-radius: 4px;
                background-color: #fff;
                white-space: nowrap;
                font-size: 14px;
                font-weight: 600;
                font-family: Roboto Condensed,Open Sans,Helvetica,sans-serif;
                line-height: 18px;
                letter-spacing: 1px;
                padding: 1px 4px 0;
                cursor: pointer;
            }
        `;
        document.head.append(style);
    }

    function reset_pending_dice() {
        state.counts = {};
        state.modifier = 0;
        document.querySelectorAll('#ddbdice-toolbar button[data-dice]').forEach(button => button.removeAttribute('data-count'));
        const modInput = document.querySelector('#ddbdice-modifier');
        if (modInput) modInput.value = 0;
    }

    function show_result(message) {
        const container = document.querySelector('#ddbdice-results');
        if (!container) return;
        const roll = message.data.rolls[0];
        const entry = document.createElement('div');
        entry.innerHTML = `<div class="ddbdice-result-line"><span class="ddbdice-roll-breakdown-inline"></span><span class="ddbdice-result-separator">|</span><strong></strong></div><div class="ddbdice-roll-caption"></div>`;
        entry.querySelector('.ddbdice-roll-caption').textContent = roll.diceNotationStr;
        const totalNode = entry.querySelector('strong');
        totalNode.textContent = roll.result.total;

        const highlight = roll.result?.highlight;
        if (highlight === 'max') totalNode.classList.add('ddbdice-total-max');
        else if (highlight === 'min') totalNode.classList.add('ddbdice-total-min');
        else if (highlight === 'mixed') totalNode.classList.add('ddbdice-total-mixed');

        const individualDisplay = Array.isArray(roll.result?.individualDisplay) ? roll.result.individualDisplay : [];
        const individualResults = Array.isArray(roll.result?.individualResults) ? roll.result.individualResults : [];
        const individualParts = Array.isArray(roll.result?.individualParts) ? roll.result.individualParts : [];
        const breakdown = individualDisplay.length
            ? join_formula_terms(individualDisplay)
            : individualResults.length
                ? join_formula_terms(individualResults.map(value => (value >= 0 ? `+${value}` : `${value}`)))
            : '(none)';
        const breakdownNode = entry.querySelector('.ddbdice-roll-breakdown-inline');
        breakdownNode.innerHTML = individualParts.length ? render_breakdown_html(individualParts) : breakdown;

        container.append(entry);
        setTimeout(() => entry.remove(), 12000);
    }

    function build_toolbar() {
        const results = document.createElement('div');
        results.id = 'ddbdice-results';

        const toolbar = document.createElement('div');
        toolbar.id = 'ddbdice-toolbar';

        const toggleDiceButtons = document.createElement('button');
        toggleDiceButtons.id = 'ddbdice-toggle-controls';
        toggleDiceButtons.textContent = 'Roll ▸';
        toggleDiceButtons.title = 'Expand roll controls';

        const toolbarPanel = document.createElement('div');
        toolbarPanel.id = 'ddbdice-toolbar-panel';

        const diceButtons = document.createElement('div');
        diceButtons.id = 'ddbdice-dice-buttons';

        const rollActions = document.createElement('div');
        rollActions.id = 'ddbdice-roll-actions';

        const updateResultPosition = () => {
            results.style.bottom = `${toolbar.offsetHeight + 20}px`;
        };

        const setDiceButtonsExpanded = expanded => {
            state.diceButtonsExpanded = expanded;
            toolbarPanel.classList.toggle('expanded', expanded);
            toggleDiceButtons.textContent = expanded ? 'Roll ▾' : 'Roll ▸';
            toggleDiceButtons.title = expanded ? 'Collapse roll controls' : 'Expand roll controls';
            updateResultPosition(expanded);
        };

        toggleDiceButtons.addEventListener('click', () => {
            setDiceButtonsExpanded(!state.diceButtonsExpanded);
        });

        toolbarPanel.append(diceButtons);
        toolbar.append(toggleDiceButtons, toolbarPanel);

        for (const dieType of DICE_TYPES) {
            const button = document.createElement('button');
            button.textContent = dieType;
            button.dataset.dice = dieType;
            button.title = 'Left-click to add, right-click to subtract';
            button.addEventListener('click', () => {
                state.counts[dieType] = (state.counts[dieType] || 0) + 1;
                if (state.counts[dieType] !== 0) button.dataset.count = state.counts[dieType];
                else button.removeAttribute('data-count');
            });
            button.addEventListener('contextmenu', event => {
                event.preventDefault();
                const next = (state.counts[dieType] || 0) - 1;
                state.counts[dieType] = next;
                if (state.counts[dieType] !== 0) button.dataset.count = state.counts[dieType];
                else button.removeAttribute('data-count');
            });
            diceButtons.append(button);
        }

        const modInput = document.createElement('input');
        modInput.id = 'ddbdice-modifier';
        modInput.type = 'number';
        modInput.step = '1';
        modInput.value = '0';
        modInput.title = 'Modifier';
        modInput.addEventListener('change', () => {
            state.modifier = parseInt(modInput.value, 10) || 0;
        });
        diceButtons.append(modInput);

        const advantage = document.createElement('button');
        advantage.textContent = 'ADV';
        advantage.title = 'Toggle advantage mode';
        advantage.className = 'ddbdice-adv-mode';
        advantage.addEventListener('click', () => {
            state.rollKind = state.rollKind === 'advantage' ? '' : 'advantage';
            updateRollModeButtons();
        });

        const disadvantage = document.createElement('button');
        disadvantage.textContent = 'DIS';
        disadvantage.title = 'Toggle disadvantage mode';
        disadvantage.className = 'ddbdice-dis-mode';
        disadvantage.addEventListener('click', () => {
            state.rollKind = state.rollKind === 'disadvantage' ? '' : 'disadvantage';
            updateRollModeButtons();
        });

        const updateRollModeButtons = () => {
            advantage.classList.toggle('ddbdice-active-mode', state.rollKind === 'advantage');
            disadvantage.classList.toggle('ddbdice-active-mode', state.rollKind === 'disadvantage');
        };

        const rollButton = document.createElement('button');
        rollButton.className = 'ddbdice-roll';
        rollButton.textContent = 'Roll';
        rollButton.addEventListener('click', () => roll_pending_dice());

        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear';
        clearButton.title = 'Clear dice from the screen';
        clearButton.addEventListener('click', () => {
            clear_dice();
            reset_pending_dice();
        });

        rollActions.append(advantage, disadvantage, rollButton, clearButton);
        toolbarPanel.append(rollActions);

        setDiceButtonsExpanded(false);
        updateRollModeButtons();
        document.body.append(results, toolbar);
        updateResultPosition();
    }

    async function init() {
        try {
            if (new URL(window.top.location.href).searchParams.get('abovevtt') === 'true') return;
        } catch (error) {}
        if (window.__ddbDiceInjected) return;
        window.__ddbDiceInjected = true;

        try {
            add_styles();
            const [injected] = await Promise.all([
                add_new_dice(),
                ensure_dice_details_loaded()
            ]);
            if (!injected) return;
            build_toolbar();
            add_roll_buttons();
        } catch (error) {
            console.error('Failed to inject DDB 3D dice', error);
        }
    }

    init();
})();
