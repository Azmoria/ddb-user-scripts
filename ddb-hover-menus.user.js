// ==UserScript==
// @name         Hover menu
// @version      0.3
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
    $(`:is([class*='NavigationMenu_wrapper'], [class*='_NavigationMenuContainer_']) [inert]`);
    body.off('mouseover.hovermenu').on('mouseover.hovermenu', `[class*='_NavigationMenuContainer_'] [class*='_menuNavList_'] li[class*='_panelButton_']>button[class*='_menuLink'], [class*='NavigationMenu_wrapper'] [class*='NavigationMenu_panelButton']`, function (e) {
        clearTimeout(window.hoverMenuButtonTimeout);
        window.hoverMenuButtonTimeout = setTimeout(() => {
            $(`[class*='_NavigationMenuContainer_'] [class*='_menuNavList_'] li[class*='_panelButton_']>button[class*='_menuLink']  ~ [class*='_panel_'], [class*='NavigationMenu_wrapper'] [class*='NavigationMenu_panelButton'] [class*='NavigationMenu_panel']`).css('pointer-events', '');
            const target = $(e.currentTarget);
            const panel = target.is(`button[class*='_menuLink']`) ? target.siblings(`[class*='_panel_']`) : target.find(`[class*='NavigationMenu_panel']`);
            panel.toggleClass('pointerEventsAll', true);
        }, 250)
    });
    body.off('mouseleave.hovermenu').on('mouseleave.hovermenu', `[class*='_NavigationMenuContainer_'] [class*='_menuNavList_'] li[class*='_panelButton_']>button[class*='_menuLink']  ~ [class*='_panel_'], [class*='NavigationMenu_wrapper'] [class*='NavigationMenu_panelButton'] [class*='NavigationMenu_panel']`, function (e) {
        clearTimeout(window.hoverMenuButtonTimeout);
        const target = $(e.currentTarget);
        target.toggleClass('pointerEventsAll', false);
    });
})();
function add_observer() {
    const menuObserver = new MutationObserver(function (mutationList, observer) {
        mutationList.forEach(mutation => {
            $(`:is([class*='NavigationMenu_wrapper'], [class*='_NavigationMenuContainer_']) [inert]`).removeAttr('inert')
        });
    })

    const mutation_target = $('body')[0];
    //observers changes to body direct children being removed/added
    const mutation_config = { attributes: true, childList: true, characterData: false, subtree: true };
    menuObserver.observe(mutation_target, mutation_config);
}

function insert_styles(container = window.document.body) {
    const styles = `<style>
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
	[class*='_NavigationMenuContainer_'] [class*='_menuNavList_']{
		li[class*='_panelButton_']>button[class*='_menuLink'] ~ [class*='_panel_'] {
			transition: 0s all 500ms;

		}
		li[class*='_panelButton_']>button[class*='_menuLink']:hover ~ [class*='_panel_'],
        li[class*='_panelButton_']>button[class*='_menuLink']~ [class*='_panel_']:hover {
			transition: 0s all 0.25s;
			opacity: 1;
			transform: translateY(0);
            z-index: 100000;
		}
	}
</style>`
    container.append(styles);
}