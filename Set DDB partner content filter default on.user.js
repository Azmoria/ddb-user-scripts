// ==UserScript==
// @name         Set DDB partner content filter default on
// @namespace    github.com/azmoria
// @version      0.3
// @description  Set default partnered content
// @author       Azmoria
// @downloadURL  https://github.com/Azmoria/ddbsetpartneredcontent/raw/main/Set%20DDB%20partner%20content%20filter%20default%20on.user.js
// @updateURL    https://github.com/Azmoria/ddbsetpartneredcontent/raw/main/Set%20DDB%20partner%20content%20filter%20default%20on.user.js
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require https://code.jquery.com/jquery-3.6.0.min.js
// @match        https://www.dndbeyond.com/*
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    init_links_observe();
})();


function init_links_observe(){
    let mutation_target = $('#mega-menu-target')[0];
	let mutation_config = { attributes: false, childList: true, characterData: false, subtree: true };

	let link_observer = new MutationObserver(function() {
        handle_observe_links()
	});
	link_observer.observe(mutation_target,mutation_config);

}

function handle_observe_links() {
    $(`a[href$='/spells'], a[href$='/monsters'], a[href$='/feats'], a[href$='/magic-items']`).each(function(){
        $(this).attr('href', `${$(this).attr('href')}?filter-partnered-content=t`)
    });
}
