// ==UserScript==
// @name         Allow homebrew tooltips in encounters
// @namespace    github.com/azmoria
// @version      0.5
// @description  Allow homebrew tooltips in encounters
// @author       Azmoria
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @downloadURL  https://github.com/Azmoria/ddbEncounterTooltips/raw/main/ddbEncounterBuilderTooltips.user.js
// @updateURL    https://github.com/Azmoria/ddbEncounterTooltips/raw/main/ddbEncounterBuilderTooltips.user.js
// @require https://code.jquery.com/jquery-3.6.0.min.js
// @match        https://www.dndbeyond.com/*
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    let observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (!mutation.addedNodes) return

            for (let i = 0; i < mutation.addedNodes.length; i++) {
                // do things to your newly added nodes here
                let node = mutation.addedNodes[i]
                if ($(node).attr('data-tooltip-href') != undefined){
                    if($(node).attr('href').startsWith("https://dndbeyond.com/linkout?remoteUrl=https://www.dndbeyond.com")){
                       $(node).attr('href', $(node).attr('href').replace("https://dndbeyond.com/linkout?remoteUrl=", ''))
                    }
                    let tooltipData = $(node).attr('data-tooltip-href').replace(/(.*\/\d+)-tooltip/g, '$1/tooltip-json')
                    $(node).attr('data-tooltip-json-href', tooltipData)
                }
                else if ($(node).find('[data-tooltip-href]').length > 0){
                    let tooltipNodes = $(node).find('[data-tooltip-href]');
                    for(let i = 0; i<tooltipNodes.length; i++){
                      let currNode = $(tooltipNodes[i]);
                       if($(currNode).attr('data-tooltip-href') != undefined){
                           $(currNode).attr('href', $(currNode).attr('href').replace("https://dndbeyond.com/linkout?remoteUrl=", ''))
                           let tooltipData = $(currNode).attr('data-tooltip-href').replace(/(.*\/\d+)-tooltip/g, '$1/tooltip-json')
                           $(currNode).attr('data-tooltip-json-href', tooltipData)
                       }
                    }
                }
            }
        })
    })

    observer.observe(document.body, {
        childList: true
        , subtree: true
        , attributes: false
        , characterData: false
    })
})();
