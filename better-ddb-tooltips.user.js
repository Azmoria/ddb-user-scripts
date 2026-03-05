// ==UserScript==
// @name         Better tooltips DDB
// @namespace    github.com/azmoria
// @version      0.14
// @description  Better tooltips DDB
// @author       Azmoria
// @downloadURL  https://github.com/Azmoria/better-ddb-tooltips/raw/main/better-ddb-tooltips.user.js
// @updateURL    https://github.com/Azmoria/better-ddb-tooltips/raw/main/better-ddb-tooltips.user.js
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require https://code.jquery.com/jquery-3.6.0.min.js
// @match        https://www.dndbeyond.com/*
// @exclude     https://www.dndbeyond.com/*abovevtt*
// @run-at       document-end
// ==/UserScript==

let removeToolTipTimer = undefined;
(function() {
    'use strict';
    init_links_observe();
    $('body').append(`<style id='better-tooltips'>
        .sidebar-flyout{
            position:fixed !important;
            z-index:10000000 !important;
        }
        .tooltip-body{
            overflow:auto;
            padding-bottom:50px;
        }
        #db-tooltip-container{
            display:none!important;
        }
        .tooltip::after{
           pointer-events:none;
        }
    </style>`)
})();


function init_links_observe(){
    let mutation_target = $('body')[0];
	let mutation_config = { attributes: false, childList: true, characterData: false, subtree: true };

	let link_observer = new MutationObserver(function() {
        handle_observe_links()
	});
	link_observer.observe(mutation_target,mutation_config);

}

function handle_observe_links() {
    $(`a.tooltip-hover:not('.better-tooltip-visited')`).each(function(){
        add_stat_block_hover($(this).parent());
    });
}


function remove_tooltip(delay = 0, removeHoverNote = true) {
    if (delay > 0) {
        removeToolTipTimer = setTimeout(function(){remove_sidebar_flyout(removeHoverNote)}, delay);
    } else {
        clearTimeout(removeToolTipTimer);
        removeToolTipTimer = undefined;
        remove_sidebar_flyout(removeHoverNote);
    }
}
function build_and_display_sidebar_flyout(clientY, buildFunction) {
  let flyout = $(`<div class='sidebar-flyout'></div>`);
  $("body").append(flyout);

  buildFunction(flyout); // we want this built here so we can position the flyout based on the height of it

  let height = flyout.height();
  let halfHeight = (height / 2);
  let top = clientY - halfHeight;
  if (top < 30) { // make sure it's always below the main UI buttons
    top = 30;
  } else if (clientY + halfHeight > window.innerHeight - 30) {
    top = window.innerHeight - height - 30;
  }

  flyout.css({
    "top": top
  });
}
function position_flyout_left_of(container, flyout) {
  if (!container || container.length === 0 || !flyout || flyout.length === 0) {
    console.warn("position_flyout_left_of received an empty object", container, flyout);
    return;
  }
  flyout.css("left", container[0].getBoundingClientRect().left - flyout.width());
}

function position_flyout_right_of(container, flyout) {
  if (!container || container.length === 0 || !flyout || flyout.length === 0) {
    console.warn("position_flyout_right_of received an empty object", container, flyout);
    return;
  }
  flyout.css("left", container[0].getBoundingClientRect().left + container.width());
}
function add_stat_block_hover(statBlockContainer) {
    const tooltip = $(statBlockContainer).find(".tooltip-hover:not(.better-tooltip-visited)");
    if(tooltip.length>0){
        tooltip.addClass('better-tooltip-visited');

        tooltip.hover(function (hoverEvent) {
            hoverEvent.stopPropagation();
            hoverEvent.preventDefault();

            if (hoverEvent.type === "mouseenter") {
                window.tooltipHoverTimeout = setTimeout(function(){
                    const dataTooltipHref = $(hoverEvent.currentTarget).attr("data-tooltip-href");
                    if (typeof dataTooltipHref === "string") {
                        fetch_tooltip(dataTooltipHref, function (tooltipJson) {

                            let container = $(hoverEvent.target);

                            display_tooltip(tooltipJson, container, hoverEvent.clientY);
                        });
                    }
                }, 200);
            } else if (hoverEvent.type === "mouseleave"){
                clearTimeout(window.tooltipHoverTimeout);
                remove_tooltip(500);
            }
        });
    }

}
function remove_sidebar_flyout(removeHoverNote) {
  console.log("remove_sidebar_flyout");
  let flyouts = $(`.sidebar-flyout`)
  let hovered = $(`.tooltip-flyout:hover`).length>0 == true;
  $(`.sidebar-flyout:not('.note-flyout') ~ .sidebar-flyout:not('.hovered')`).remove();
  if(removeHoverNote == false){
    flyouts = $(`.sidebar-flyout:not('.note-flyout')`)
  }
  if(!hovered)
    flyouts.remove();
}
function display_tooltip(tooltipJson, container, clientY) {
    if (typeof tooltipJson?.Tooltip === "string") {
        remove_tooltip(0, false);

        console.log("container", container)
        const tooltipHtmlString = tooltipJson.Tooltip;

        build_and_display_sidebar_flyout(clientY, function (flyout) {
            flyout.addClass("prevent-sidebar-modal-close"); // clicking inside the tooltip should not close the sidebar modal that opened it
            flyout.addClass("tooltip-flyout")
            const tooltipHtml = $(tooltipHtmlString);
            flyout.append(tooltipHtml);



            const didResize = position_flyout_on_best_side_of(container, flyout);
            if (didResize) {
                // only mess with the html that DDB gave us if we absolutely have to
                tooltipHtml.css({
                    "width": "100%",
                    "max-width": "100%",
                    "min-width": "100%"
                });
            }

            flyout.hover(function (hoverEvent) {
                $($(`.sidebar-flyout:not('.note-flyout') ~ .sidebar-flyout`)).toggleClass('hovered', false);
                if (hoverEvent.type === "mouseenter") {
                    $(this).toggleClass('hovered', true);
                    $(this).prevAll('.sidebar-flyout').toggleClass('hovered', true);
                } else {
                    $(this).toggleClass('hovered', false);
                }
                remove_tooltip(500);
            });
            flyout.css("background-color", "#fff");
        });
    }

}
function mydebounce(func, timeout = 800){   // This had to be in both core and here to get this to work due to load orders. I might look at this more later
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}
const fetch_tooltip = mydebounce((dataTooltipHref, callback) => {
    // dataTooltipHref will look something like this `//www.dndbeyond.com/spells/2329-tooltip?disable-webm=1&disable-webm=1`
    // we only want the `spells/2329` part of that
    try {
        if (window.tooltipCache === undefined) {
            window.tooltipCache = {};
        }
        console.log("fetch_tooltip starting for ", dataTooltipHref);

        const parts = dataTooltipHref.split("/");
        const idIndex = parts.findIndex(p => p.includes("-tooltip"));
        const id = parseInt(parts[idIndex]);
        const type = parts[idIndex - 1];
        const typeAndId = `${type}/${id}`;
        // work in progress for homebrew tooltips
        //const name = parts[idIndex].replace(/-tooltip.*/gi, '');
        // const typeAndName = `${type}/${name}`;


        const existingJson = window.tooltipCache[typeAndId];
        if (existingJson !== undefined) {
            console.log("fetch_tooltip existingJson", existingJson);
            callback(existingJson);
            return;
        }
        const convertToJson = function(json){
            return json;
        }
       /* work in progress for homebrew tooltips
            const convertToDetails = function(html){
            const details = $(html).find('section.detail-content').html();
            const tooltipData = {Tooltip: details};
            return tooltipData;
        }*/
        $.get({
            url: `https://www.dndbeyond.com/${typeAndId}/tooltip?callback=convertToJson`,
            beforeSend: function() {
                // only make the call if we don't have it cached.
                // This prevents the scenario where a user triggers `mouseenter`, and `mouseleave` multiple times before the first network request finishes
                const alreadyFetched = window.tooltipCache[typeAndId];
                if (alreadyFetched) {
                    callback(alreadyFetched);
                    return false;
                }
                return true;
            },
            success: function (response) {
                console.log("fetch_tooltip success", response);
                try{
                    window.tooltipCache[typeAndId] = eval(response);
                    callback(window.tooltipCache[typeAndId]);
                }catch(error){
                     /* work in progress for homebrew tooltips
                    $.get({
                        url: `https://www.dndbeyond.com/${typeAndName}`,
                        beforeSend: function() {
                            // only make the call if we don't have it cached.
                            // This prevents the scenario where a user triggers `mouseenter`, and `mouseleave` multiple times before the first network request finishes
                            const alreadyFetched = window.tooltipCache[typeAndId];
                            if (alreadyFetched) {
                                callback(alreadyFetched);
                                return false;
                            }
                            return true;
                        },
                        success: function (response) {
                            console.log("fetch_tooltip success", response);
                            window.tooltipCache[typeAndId] = convertToDetails(response);
                            callback(window.tooltipCache[typeAndId]);
                        },
                        error: function (error) {
                            console.warn("fetch_tooltip error", error);
                        }
                    });*/
                }

            },
            error: function (error) {
                $.get({
                    url: `https://www.dndbeyond.com/${typeAndId}/tooltip-json`,
                    beforeSend: function() {
                        // only make the call if we don't have it cached.
                        // This prevents the scenario where a user triggers `mouseenter`, and `mouseleave` multiple times before the first network request finishes
                        const alreadyFetched = window.tooltipCache[typeAndId];
                        if (alreadyFetched) {
                            callback(alreadyFetched);
                            return false;
                        }
                        return true;
                    },
                    success: function (response) {
                        console.log("fetch_tooltip success", response);
                        window.tooltipCache[typeAndId] = response;
                        callback(response);
                    },
                    error: function (error) {
                        console.warn("fetch_tooltip error", error);
                    }
                });
            }
        });
    } catch(error) {
        console.warn("Failed to find tooltip info in", dataTooltipHref, error);
    }
}, 200);

function position_flyout_on_best_side_of(container, flyout, resizeFlyoutToFit = true) {
  let didResize = false;
  if (!container || container.length === 0 || !flyout || flyout.length === 0) {
    console.warn("position_flyout_on_best_side_of received an empty object", container, flyout);
    return didResize;
  }
  const distanceFromLeft = container[0].getBoundingClientRect().left;
  const distanceFromRight = window.innerWidth - distanceFromLeft - container.width();
  if (distanceFromLeft > distanceFromRight) {
    if (resizeFlyoutToFit && (flyout.width() > distanceFromLeft)) {
      flyout.css("width", distanceFromLeft);
      didResize = true;
    }
    position_flyout_left_of(container, flyout);
  } else {
    if (resizeFlyoutToFit && (flyout.width() > distanceFromRight)) {
      flyout.css("width", distanceFromRight);
      didResize = true;
    }
    position_flyout_right_of(container, flyout);
  }
  return didResize;
}
