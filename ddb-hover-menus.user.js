// ==UserScript==
// @name         Hover menu
// @version      0.12
// @description  adds hover back to ddb's site menu
// @author       Azmoria
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @match        https://www.dndbeyond.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dndbeyond.com
// @downloadURL  https://github.com/Azmoria/ddb-user-scripts/raw/refs/heads/main/ddb-hover-menus.user.js.user.js
// @updateURL    https://github.com/Azmoria/ddb-user-scripts/raw/refs/heads/main/ddb-hover-menus.user.js.user.js
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';
    const body = $('body');
    add_observer();
    insert_styles(body);
    $(`:is([class*='NavigationMenu_wrapper'], [class*='NavigationMenuContainer']) [inert]`);
    body.off('mouseover.hovermenu').on('mouseover.hovermenu', `[class*='NavigationMenuContainer'] [class*='_menuNavList'] li[class*='_panelButton']>button[class*='_menuLink'], [class*='NavigationMenu_wrapper'] [class*='NavigationMenu_panelButton']`, function (e) {
        clearTimeout(window.hoverMenuButtonTimeout);
        window.hoverMenuButtonTimeout = setTimeout(async () => {

            $(`[class*='NavigationMenuContainer'] [class*='_menuNavList'] li[class*='_panelButton']>button[class*='_menuLink']  ~ [class*='_panel_'], [class*='NavigationMenu_wrapper'] [class*='NavigationMenu_panelButton'] [class*='NavigationMenu_panel']`).toggleClass('pointerEventsAll', false);
            const target = $(e.currentTarget);
            if (!target.is(':hover'))
                return;
            if (target.is('[data-item_name="Library"], :has([data-item_name="Library"])')){
                const button = target.is('button') ? target : target.find('>button');
                await button.click();
                await button.click();
            }
            const panel = target.is(`button[class*='_menuLink']`) ? target.siblings(`[class*='_panel']`) : target.find(`[class*='NavigationMenu_panel']`);
            panel.toggleClass('pointerEventsAll', true);
        }, 250)
    });
    body.off('mouseenter.hovermenu').on('mouseenter.hovermenu', `[class*='NavigationMenuContainer'] [class*='_menuNavList'] li[class*='_panelButton']>button[class*='_menuLink']  ~ [class*='_panel'], [class*='NavigationMenu_wrapper'] [class*='NavigationMenu_panelButton'] [class*='NavigationMenu_panel']`, function (e) {
        clearTimeout(window.hoverMenuButtonTimeout);
        clearTimeout(window.hoverMenuFlyoutTimeout);
    });
    body.off('mouseleave.hovermenu').on('mouseleave.hovermenu', `[class*='NavigationMenuContainer'] [class*='_menuNavList'] li[class*='_panelButton']>button[class*='_menuLink']  ~ [class*='_panel'], [class*='NavigationMenu_wrapper'] [class*='NavigationMenu_panelButton'] [class*='NavigationMenu_panel']`, function (e) {
        clearTimeout(window.hoverMenuFlyoutTimeout);
        window.hoverMenuFlyoutTimeout = setTimeout(() => {
            const target = $(e.currentTarget);
            target.toggleClass('pointerEventsAll', false);
        }, 250)
    });
})();
function add_observer() {
    const menuObserver = new MutationObserver(function (mutationList, observer) {
        $(`:is([class*='NavigationMenu_wrapper'], [class*='NavigationMenuContainer']) [inert]`).removeAttr('inert')
        if ($(`#megaMenuForumLink`).length == 0) {
            const forumLink = $(`<li id='megaMenuForumLink'><a href="https://www.dndbeyond.com/forums" data-testid="navigation-link" data-action_detail="navigation" data-item_name="Forums" data-item_format="button" data-target_url="https://www.dndbeyond.com/forums" data-item_index="4">Forums</a></li>`);
            $(`[class*='NavigationMenu'] nav>ul>li:nth-child(4)`).after(forumLink);
        }
    })

    const mutation_target = $('body')[0];
    //observers changes to body direct children being removed/added
    const mutation_config = { attributes: true, childList: true, characterData: false, subtree: true };
    menuObserver.observe(mutation_target, mutation_config);
}

function insert_styles(container = window.document.body) {
    const styles = `<style>
        #megaMenuForumLink a {
    height: 100%;
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--ttui_grey-300);
    text-decoration: none;
    text-transform: uppercase;
    font-weight: 700;
    font-size: 14px;
    line-height: 21px;
    cursor: pointer;
    background: transparent;
    border: none;
    white-space: nowrap;
    fill: currentColor;
margin-right: 32px;
position: relative;
    background-repeat: no-repeat;
    background-position-y: 32px;
    transition: color 0s ease, background-position-y .4s ease;
    background-image: radial-gradient(80% 50% at 50% 100%, #e40712 0%, transparent 50%);
}
#megaMenuForumLink a:hover{
    color: var(--ttui_common-0);
    background-position-y: 0;
}

#megaMenuForumLink a:after{
    content: "";
    display: block;
    position: absolute;
    bottom: calc(var(--border-bottom-height) * -1);
    height: var(--border-bottom-height);
    transition: .4s;
    background-image: linear-gradient(90deg, transparent 0%, #e40712 50%, transparent 100%);
    width: 0;
    left: 50%;
}
#megaMenuForumLink a:hover:after{
     width: 100%;
    left: 0;
}
        [class*='NavigationMenu_wrapper'] {
        [class*='NavigationMenu_panelButton'] [class*='NavigationMenu_panel'] {
			transition: 0s all 500ms;
		}
		[class*='NavigationMenu_panelButton']:hover [class*='NavigationMenu_panel'],
        [class*='NavigationMenu_panelButton'] [class*='NavigationMenu_panel']:hover
		{
			transition: 0s all 0.25s;
			opacity: 1;
			transform: translateY(0);
            z-index: 100000;
		}

    }
.pointerEventsAll{
    pointer-events:auto !important;
}
	[class*='NavigationMenuContainer'] [class*='_menuNavList']{
		li[class*='_panelButton']>button[class*='_menuLink'] ~ [class*='_panel'] {
			transition: 0s all 500ms;

		}
		li[class*='_panelButton']>button[class*='_menuLink']:hover ~ [class*='_panel'],
        li[class*='_panelButton']>button[class*='_menuLink']~ [class*='_panel']:hover {
			transition: 0s all 0.25s;
			opacity: 1;
			transform: translateY(0);
            z-index: 100000;
		}
	}
</style>`
    container.append(styles);
}