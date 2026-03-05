// ==UserScript==
// @name         Hover menu
// @version      0.1
// @description  adds hover back to ddb's site menu
// @author       Azmoria
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @match        https://www.dndbeyond.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dndbeyond.com
// @downloadURL  https://github.com/Azmoria/ddb-user-scripts/raw/refs/heads/main/ddb-hover-menus.user.js.user.js
// @updateURL    https://github.com/Azmoria/ddb-user-scripts/raw/refs/heads/main/ddb-hover-menus.user.js.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    const body = $('body');
    add_observer();
    insert_styles(body);
})();
function add_observer(){
    const menuObserver = new MutationObserver(function(mutationList, observer) {
        mutationList.forEach(mutation => {
            adjust_menu(mutation);
        });
    })

    const mutation_target = $('body')[0];
    //observers changes to body direct children being removed/added
    const mutation_config = { attributes: true, childList: true, characterData: false, subtree: true };
    menuObserver.observe(mutation_target, mutation_config);
}
function adjust_menu(mutation){
    try {
        let mutationTarget = $(mutation.target);
        //Remove beyond20 popup and swtich to gamelog
        if(mutationTarget.is(`:is([class*='NavigationMenu_wrapper'], [class*='_NavigationMenuContainer_']) [inert]`)){
            mutationTarget.removeAttr('inert')
        }
    } catch{
        console.warn("failed to parse mutation", error, mutation);
    }
}
function insert_styles(container = window.document.body) {
    const styles = `<style>
        [class*='NavigationMenu_wrapper'] {
        [class*='NavigationMenu_panelButton'] [class*='NavigationMenu_panel'] {
			transition: 0s all 0.4s;
		}
		[class*='NavigationMenu_panelButton']:hover [class*='NavigationMenu_panel'],
        [class*='NavigationMenu_panelButton'] [class*='NavigationMenu_panel']:hover{
			transition: 0s all 0s;
			opacity: 1;
			transform: translateY(0);
			pointer-events: auto;
		}

		li[class*='_panelButton_']>button[class*='_menuLink']~ [class*='_panel_']:hover  {
			transition: 0s all 0s;
			opacity: 1;
			transform: translateY(0);
			pointer-events: auto;
		}
    }

   	[class*='_NavigationMenuContainer_'] [class*='_menuNavList_']{
		li[class*='_panelButton_']>button[class*='_menuLink'] ~ [class*='_panel_'] {
			transition: 0s all 0.4s;
		}
		li[class*='_panelButton_']>button[class*='_menuLink']:hover ~ [class*='_panel_'],
        li[class*='_panelButton_']>button[class*='_menuLink']~ [class*='_panel_']:hover {
			transition: 0s all 0s;
			opacity: 1;
			transform: translateY(0);
			pointer-events: auto;
		}
	}
</style>`
    container.append(styles);
}
