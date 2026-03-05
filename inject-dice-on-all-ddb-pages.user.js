// ==UserScript==
// @name         Inject Dice on all DDB pages
// @namespace    github.com/azmoria
// @version      0.9
// @description  Add dice to more DDB pages
// @author       Azmoria
// @downloadURL  https://github.com/Azmoria/dice-on-all-ddb-pages/raw/refs/heads/main/inject-dice-on-all-ddb-pages.user.js
// @updateURL    https://github.com/Azmoria/dice-on-all-ddb-pages/raw/refs/heads/main/inject-dice-on-all-ddb-pages.user.js
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require https://code.jquery.com/jquery-3.6.0.min.js
// @match        https://www.dndbeyond.com/*
// @exclude     https://www.dndbeyond.com/*abovevtt*
// @exclude     https://www.dndbeyond.com/*encounter*
// @exclude     https://www.dndbeyond.com/*character*
// @exclude     /^https://www.dndbeyond.com/campaigns/\d+$/
// @exclude     /^https://www.dndbeyond.com/campaigns/\d+.*popoutgamelog=true.*/
// @run-at       document-end

// ==/UserScript==

(function() {
    'use strict';
    inject_dice()
})();

function inject_dice(){
    const body = $('body');
    add_styles(body);
    add_gamelog(body);
    add_message_broker(body);
    add_dice(body);
    add_observer()
}

function add_observer(){
    window.encounterBuilderObserver = new MutationObserver(function(mutationList, observer) {
        mutationList.forEach(mutation => {
            remove_injected_elements(mutation);
        });
    })

    const mutation_target = $('body')[0];
    //observers changes to body direct children being removed/added
    const mutation_config = { attributes: false, childList: true, characterData: false, subtree: true };
    window.encounterBuilderObserver.observe(mutation_target, mutation_config);
    setTimeout(function(){
        window.encounterBuilderObserver.disconnect();
        delete window.encounterBuilderObserver;
    }, 20000);
}
function remove_injected_elements(mutation){
    try {
        let mutationTarget = $(mutation.target);
        //Remove beyond20 popup and swtich to gamelog
        if(mutationTarget.hasClass(['encounter-details', 'encounter-builder', 'release-indicator'])){
            mutationTarget.remove();
        }
        if($(mutation.addedNodes).is('.encounter-builder, .release-indicator, [class*="-Notification"]')){
            $(mutation.addedNodes).remove();
        }

    } catch{
        console.warn("inject ddb dice failed to parse mutation", error, mutation);
    }
}
function add_gamelog(container){
    const isMAPS = window.location.href.match(/\/games\/\d+/gi)
    const addGamelog = isMAPS ? '' : `<div id="game-log-client" data-targetingdisabled="true" data-config="{&quot;authUrl&quot;:&quot;https://auth-service.dndbeyond.com/v1/cobalt-token&quot;,&quot;baseUrl&quot;:&quot;https://www.dndbeyond.com&quot;,&quot;diceServiceUrl&quot;:&quot;https://dice-service.dndbeyond.com&quot;,&quot;diceThumbnailsUrl&quot;:&quot;https://www.dndbeyond.com/dice/images/thumbnails&quot;,&quot;ddbApiUrl&quot;:&quot;https://api.dndbeyond.com&quot;,&quot;debug&quot;:false,&quot;environment&quot;:&quot;production&quot;,&quot;launchDarkylyClientId&quot;:&quot;5c63387e40bda9329a652b74&quot;,&quot;production&quot;:true,&quot;version&quot;:&quot;4.0.1&quot;}" data-environment="production"><div class="tss-1r5d1qn-Notification"><button class="tss-1k8nyp9-gamelog-button"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em" class="tss-9hvl8q-gamelog-button__icon"><path d="M243.9 7.7C231.5.7 216.3.8 204 8L19.8 115.6C7.5 122.8 0 135.9 0 150.1v216.5c0 14.5 7.8 27.8 20.5 34.9l184 103c12.1 6.8 26.9 6.8 39.1 0l184-103c12.6-7.1 20.5-20.4 20.5-34.9V146.8c0-14.4-7.7-27.7-20.3-34.8zM71.8 140.8l152.4-89.1 152 86.2-152.4 90.3zM48 182.4l152 87.4v177.3L48 361.9zm200 264.7V269.7l152-90.1v182.3z"></path></svg>Game Log</button></div></div> <link href="https://media.dndbeyond.com/game-log-client/css/_dndbeyond_game_log_client.f9120ac7.css" rel="stylesheet">
<script src="https://media.dndbeyond.com/game-log-client/_dndbeyond_game_log_client.cfdd861d040c0e140af1.bundle.js"></script>`
    $(container).append(addGamelog);
}
//This injects the message broker element only. It does not connect to DDB websocket. Its here to prevent errors if it doesn't exists. Prehaps in the future we could connect to the websocket of an active game page.
function add_message_broker(container){
    container.append(`<div name="message-broker-client">
       <div id="message-broker-client" data-source="web" data-connecturl="wss://game-log-api-live.dndbeyond.com/v1" data-getmessagesurl="https://game-log-rest-live.dndbeyond.com/v1/getmessages" data-gameid="0" data-userid="0" data-config="{&quot;authUrl&quot;:&quot;https://auth-service.dndbeyond.com/v1/cobalt-token&quot;,&quot;baseUrl&quot;:&quot;https://www.dndbeyond.com&quot;,&quot;diceServiceUrl&quot;:&quot;https://dice-service.dndbeyond.com&quot;,&quot;diceThumbnailsUrl&quot;:&quot;https://www.dndbeyond.com/dice/images/thumbnails&quot;,&quot;debug&quot;:false,&quot;environment&quot;:&quot;production&quot;,&quot;launchDarkylyClientId&quot;:&quot;5c63387e40bda9329a652b74&quot;,&quot;production&quot;:true,&quot;version&quot;:&quot;2.2.0&quot;}" data-environment="production">
    </div>`)
}

function add_dice(container){
    container.append(`
<div class="container no-transform">
<div id="encounter-builder-root" data-config="{&quot;assetBasePath&quot;:&quot;https://media.dndbeyond.com/encounter-builder&quot;,&quot;authUrl&quot;:&quot;https://auth-service.dndbeyond.com/v1/cobalt-token&quot;,&quot;campaignDetailsPageBaseUrl&quot;:&quot;https://www.dndbeyond.com/campaigns&quot;,&quot;campaignServiceUrlBase&quot;:&quot;https://www.dndbeyond.com/api/campaign&quot;,&quot;characterServiceUrlBase&quot;:&quot;https://character-service-scds.dndbeyond.com/v2/characters&quot;,&quot;diceApi&quot;:&quot;https://dice-service.dndbeyond.com&quot;,&quot;gameLogBaseUrl&quot;:&quot;https://www.dndbeyond.com&quot;,&quot;ddbApiUrl&quot;:&quot;https://api.dndbeyond.com&quot;,&quot;ddbBaseUrl&quot;:&quot;https://www.dndbeyond.com&quot;,&quot;ddbConfigUrl&quot;:&quot;https://www.dndbeyond.com/api/config/json&quot;,&quot;debug&quot;:false,&quot;encounterServiceUrl&quot;:&quot;https://encounter-service.dndbeyond.com/v1&quot;,&quot;featureFlagsDomain&quot;:&quot;https://api.dndbeyond.com&quot;,&quot;mediaBucket&quot;:&quot;https://media.dndbeyond.com&quot;,&quot;monsterServiceUrl&quot;:&quot;https://monster-service.dndbeyond.com/v1/Monster&quot;,&quot;sourceUrlBase&quot;:&quot;https://www.dndbeyond.com/sources/&quot;,&quot;subscriptionUrl&quot;:&quot;https://www.dndbeyond.com/subscribe&quot;,&quot;toastAutoDeleteInterval&quot;:3000000}" >
<div class="encounter-details">
           </div>
           <div class="dice-rolling-panel">
              <div class="dice-toolbar  ">
                 <div class="dice-toolbar__dropdown ">
                    <div class=" dice-toolbar__dropdown-die"><span class="dice-icon-die dice-icon-die--d20"></span></div>
                    <div role="group" class="MuiButtonGroup-root MuiButtonGroup-outlined dice-toolbar__target css-3fjwge" aria-label="roll actions">
                       <button class="MuiButtonBase-root MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-sizeMedium MuiButton-outlinedSizeMedium MuiButtonGroup-grouped MuiButtonGroup-groupedHorizontal MuiButtonGroup-groupedOutlined MuiButtonGroup-groupedOutlinedHorizontal MuiButtonGroup-groupedOutlinedPrimary MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-sizeMedium MuiButton-outlinedSizeMedium MuiButtonGroup-grouped MuiButtonGroup-groupedHorizontal MuiButtonGroup-groupedOutlined MuiButtonGroup-groupedOutlinedHorizontal MuiButtonGroup-groupedOutlinedPrimary css-79xub" tabindex="0" type="button">
                          <div class="MuiBox-root css-dgzhqv">
                             <p class="MuiTypography-root MuiTypography-body1 dice-toolbar__target-roll css-9l3uo3">Roll</p>
                          </div>
                       </button>
                    </div>
                    <div class="dice-toolbar__dropdown-top" style="display: none;">
                       <div class="dice-die-button" data-dice="d20">
                          <span class="dice-icon-die dice-icon-die--d20"></span>
                          <div class="dice-die-button__tooltip">
                             <div class="dice-die-button__tooltip__pip"></div>
                             d20
                          </div>
                       </div>
                       <div class="dice-die-button" data-dice="d12">
                          <span class="dice-icon-die dice-icon-die--d12"></span>
                          <div class="dice-die-button__tooltip">
                             <div class="dice-die-button__tooltip__pip"></div>
                             d12
                          </div>
                       </div>
                       <div class="dice-die-button" data-dice="d10">
                          <span class="dice-icon-die dice-icon-die--d10"></span>
                          <div class="dice-die-button__tooltip">
                             <div class="dice-die-button__tooltip__pip"></div>
                             d10
                          </div>
                       </div>
                       <div class="dice-die-button" data-dice="d100">
                          <span class="dice-icon-die dice-icon-die--d100"></span>
                          <div class="dice-die-button__tooltip">
                             <div class="dice-die-button__tooltip__pip"></div>
                             d100
                          </div>
                       </div>
                       <div class="dice-die-button" data-dice="d8">
                          <span class="dice-icon-die dice-icon-die--d8"></span>
                          <div class="dice-die-button__tooltip">
                             <div class="dice-die-button__tooltip__pip"></div>
                             d8
                          </div>
                       </div>
                       <div class="dice-die-button" data-dice="d6">
                          <span class="dice-icon-die dice-icon-die--d6"></span>
                          <div class="dice-die-button__tooltip">
                             <div class="dice-die-button__tooltip__pip"></div>
                             d6
                          </div>
                       </div>
                       <div class="dice-die-button" data-dice="d4">
                          <span class="dice-icon-die dice-icon-die--d4"></span>
                          <div class="dice-die-button__tooltip">
                             <div class="dice-die-button__tooltip__pip"></div>
                             d4
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
              <canvas class="dice-rolling-panel__container" width="1917" height="908" data-engine="Babylon.js v6.3.0" touch-action="none" tabindex="1" style="touch-action: none; -webkit-tap-highlight-color: transparent;"></canvas>
           </div>
        </div>
  </div>
          <script src="https://media.dndbeyond.com/encounter-builder/static/js/main.221d749b.js"></script>
        <script src="https://media.dndbeyond.com/message-broker-client/_dndbeyond_message_broker_client.00a081b659ffc6309334.bundle.js"></script>
        <link rel="stylesheet" href="https://media.dndbeyond.com/game-log-client/css/_dndbeyond_game_log_client.f9120ac7.css" />
</div>`)
}

function add_styles(container){
    container.append(`<style>
            .no-transform {
                -webkit-transform: none !improtant;
                transform: none !important;
                backface-visibility: unset !important;
                perspective: unset !important;
            }
            .sidebar{
              position: fixed !important;
              top: 120px !important;
              height: calc(100% - 120px) !important;
            }
            .dice-rolling-panel,.dice-rolling-panel__container {
              width: 100%;
              height: 100%;
              position: fixed;
              top: 0;
              pointer-events: none;
              left: 0;
              z-index: 10000000;
            }

            .dice-rolling-panel .dice-toolbar {
              position: fixed;
              z-index: 1;
              bottom: 10px;
              left: 10px;
              pointer-events: all
            }

            body.body-digitaldice #site #site-main header.page-header {
                display: none!important
            }

            body.body-digitaldice #site #site-main .container {
                max-width: none!important
            }

            body.body-digitaldice #site #site-main .container #content {
                padding: 0!important
            }

            body.body-digitaldice #site #site-main #footer-push {
                display: none!important
            }

            body.body-digitaldice #site footer#footer {
                margin-top: 0!important
            }
            @media screen and (min-width: 1025px) {
                .dice .hero__text-wrapper {
                    background-color:transparent
                }
            }

            .integrated-dice-menu {
                border-radius: 12px;
                box-shadow: 0 0 8px rgba(140,112,128,.25);
                color: #fff;
                display: flex;
                flex-direction: column;
                font-size: 14px;
                position: fixed;
                text-transform: uppercase;
                z-index: 10000000
            }

            .integrated-dice-menu__item {
                align-items: center;
                background: #182026;
                border-style: solid;
                border-width: 0 2px 2px;
                color: inherit;
                display: flex;
                font-family: Roboto;
                font-size: 12px;
                height: 34px;
                justify-content: center;
                letter-spacing: 1px;
                outline: none;
                text-transform: inherit;
                width: 162px
            }

            .integrated-dice-menu__item:hover {
                background: #394b59
            }

            .integrated-dice-menu__item:first-of-type {
                border-radius: 12px 12px 0 0;
                border-width: 2px
            }

            .integrated-dice-menu__item:last-of-type {
                border-radius: 0 0 12px 12px
            }

            .integrated-dice-menu__item--advantage {
                background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' class='ddbc-svg ddbc-advantage-svg ddbc-svg--positive'%3E%3Cpath fill='%23fff' d='m33 6 5 30H10l6-30z'/%3E%3Cpath fill='%232C9400' d='m24 14 4 12h-8l4-12z'/%3E%3Cpath fill='%232C9400' d='M44.39 12.1 23.89.39 3.5 12.29l.11 23.61 20.5 11.71 20.39-11.9ZM31 36l-2-6H19l-2 6h-7L21 8h6l11 28Z'/%3E%3C/svg%3E");
                height: 16px;
                margin-right: 3px;
                width: 16px
            }

            .integrated-dice-menu__item--disadvantage {
                background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' class='ddbc-svg ddbc-disadvantage-svg ddbc-svg--negative'%3E%3Cpath fill='%23fff' d='m35 8 1 31H12l2-31z'/%3E%3Cpath fill='%23b00000' d='M27.38 17.75a9.362 9.362 0 0 1 1.44 5.68v1.12a9.442 9.442 0 0 1-1.44 5.71A5.22 5.22 0 0 1 23 32h-2V16h2a5.194 5.194 0 0 1 4.38 1.75Z'/%3E%3Cpath fill='%23b00000' d='M44.39 12.1 23.89.39 3.5 12.29l.11 23.61 20.5 11.71 20.39-11.9Zm-9.18 12.45a13.503 13.503 0 0 1-1.5 6.41 11.093 11.093 0 0 1-4.25 4.42A12.01 12.01 0 0 1 23.34 37H15V11h8.16a12.36 12.36 0 0 1 6.2 1.56 10.975 10.975 0 0 1 4.29 4.41 13.31 13.31 0 0 1 1.56 6.39Z'/%3E%3C/svg%3E");
                height: 16px;
                margin-right: 3px;
                width: 16px
            }

            .integrated-dice-menu-carrot {
                border-left: 15px solid transparent;
                border-right: 15px solid transparent;
                border-top: 20px solid #182026;
                margin: -2px 0;
                position: fixed;
                text-align: center;
                width: 0;
                z-index: 10000000
            }

            .integrated-dice-menu-carrot:after {
                border-left: 13px solid transparent;
                border-right: 13px solid transparent;
                border-top: 17px solid #182026;
                content: "";
                margin: -21px -10px 0 -13px;
                position: absolute;
                text-align: center;
                width: 0;
                z-index: 0
            }

            .integrated-dice-menu-carrot--flipped {
                margin: 3px 0;
                -webkit-transform: rotateX(180deg);
                transform: rotateX(180deg)
            }

            .dice-toolbar {
                align-items: center;
                background-color: var(--dice-color);
                border-radius: 25px;
                box-shadow: 2px 2px 6px rgba(0,0,0,.6);
                cursor: pointer;
                display: flex;
                font-family: Roboto;
                height: 50px;
                position: relative
            }

            .dice-toolbar div {
                box-sizing: content-box
            }

            .dice-toolbar__dropdown {
                border-radius: 25px;
                display: flex
            }

            .dice-toolbar__dropdown-top {
                bottom: 50px;
                position: absolute
            }

            .dice-toolbar__dropdown-die {
                align-items: center;
                border-radius: 25px;
                display: flex;
                height: 50px;
                justify-content: center;
                width: 50px
            }

            .dice-toolbar__dropdown-die .dice-icon-die {
                background-color: #fff
            }

            .dice-toolbar__dropdown-die .die-button-count {
                display: none
            }

            .dice-toolbar__dropdown-die:hover {
                background-color: var(--dice-color-hover)
            }

            .dice-toolbar__dropdown-selected .dice-toolbar__dropdown-die {
                background: #182026;
                border: 3px solid var(--dice-color);
                color: #182026;
                height: 44px;
                min-width: 44px;
                width: 44px
            }

            .dice-toolbar__dropdown-selected .dice-toolbar__dropdown-die .dice-icon-die {
                background-color: #fff;
                margin: 0;
                mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='18' height='18' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M16 8h-6V2a1 1 0 1 0-2 0v6H2a1 1 0 1 0 0 2h6v6a1 1 0 1 0 2 0v-6h6a1 1 0 1 0 0-2Z' fill='%23BFCCD6'/%3E%3C/svg%3E");
                -webkit-mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='18' height='18' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M16 8h-6V2a1 1 0 1 0-2 0v6H2a1 1 0 1 0 0 2h6v6a1 1 0 1 0 2 0v-6h6a1 1 0 1 0 0-2Z' fill='%23BFCCD6'/%3E%3C/svg%3E");
                mask-size: 30px;
                -webkit-mask-size: 30px;
                -webkit-transform: rotate(45deg);
                transform: rotate(45deg)
            }

            .dice-toolbar__dropdown-selected .dice-toolbar__dropdown-die:hover {
                background-color: #8a9ba8
            }

            .dice-toolbar__dropdown-selected .dice-toolbar__dropdown-die.dice-toolbar--hover {
                border: 3px solid var(--dice-color-hover)
            }

            .dice-toolbar__dropdown .dice-toolbar__target {
                height: 0;
                opacity: 0;
                overflow: hidden;
                width: 0
            }

            .dice-toolbar__dropdown .dice-toolbar__target>* {
                border: none;
                color: hsla(0,0%,100%,.8);
                white-space: nowrap
            }

            .dice-toolbar__dropdown .dice-toolbar__target>button:first-child {
                flex: 1 1 auto
            }

            .dice-toolbar__dropdown .dice-toolbar__target>button:first-child:hover {
                background-color: unset
            }

            .dice-toolbar__dropdown .dice-toolbar__target-menu-button {
                background-color: var(--dice-color);
                border-bottom-right-radius: 25px;
                border-top-right-radius: 25px;
                flex: 0 0 50px
            }

            .dice-toolbar__dropdown .dice-toolbar__target-menu-button:hover {
                background-color: var(--dice-color-hover)
            }

            .dice-toolbar__dropdown .dice-toolbar__target-menu-button:after {
                background: hsla(0,0%,100%,.5);
                bottom: 25%;
                content: "";
                height: 50%;
                left: 0;
                position: absolute;
                width: 1px
            }

            .dice-toolbar__dropdown .dice-toolbar__target-user {
                color: hsla(0,0%,100%,.8);
                font-size: 13px;
                font-weight: 500;
                line-height: 15px
            }

            .dice-toolbar__dropdown .dice-toolbar__target-roll {
                font-size: 18px;
                font-weight: 900;
                line-height: 21px;
                min-width: 60px;
                text-align: start
            }

            .dice-toolbar--hover {
                background-color: var(--dice-color-hover)
            }

            .dice-toolbar__roll {
                align-items: center;
                color: #fff;
                display: flex;
                font-size: 18px;
                font-style: normal;
                font-weight: 700;
                height: 100%;
                justify-content: center;
                opacity: 0;
                position: absolute;
                transition: visibility 0s,opacity .15s linear;
                -webkit-user-select: none;
                -ms-user-select: none;
                user-select: none;
                visibility: hidden;
                width: 100%
            }

            .dice-toolbar__input {
                background: transparent;
                border: 0;
                display: none;
                height: 50px;
                margin-left: 15px;
                text-transform: uppercase
            }

            .dice-toolbar.rollable .dice-toolbar__target {
                display: inline-flex;
                height: 50px;
                opacity: 1;
                width: 100%
            }

            .dice-toolbar.rollable .dice-toolbar__roll {
                opacity: 1;
                position: relative;
                visibility: visible
            }

            .dice-die-button {
                align-items: center;
                background: #182026;
                border-radius: 25px;
                box-shadow: 2px 2px 6px rgba(0,0,0,.6);
                cursor: pointer;
                display: flex;
                height: 50px;
                justify-content: center;
                margin: 5px 0;
                position: relative;
                user-select: none;
                -moz-user-select: none;
                width: 50px
            }

            .dice-die-button,.dice-die-button__count {
                -webkit-user-select: none;
                -ms-user-select: none
            }

            .dice-die-button__count {
                background-color: #182026;
                border-radius: 15px;
                color: #8a9ba8;
                padding: 2px 8px;
                position: absolute;
                right: -15px;
                top: 0;
                user-select: none;
                z-index: 100
            }

            .dice-die-button__tooltip {
                align-items: center;
                background: #fff;
                border: 1px solid #d7e1e8;
                border-radius: 3px;
                box-sizing: border-box;
                display: none;
                font-size: 12px;
                font-weight: 700;
                height: 32px;
                justify-content: center;
                left: 50px;
                letter-spacing: 1px;
                line-height: 14px;
                position: absolute;
                text-align: center;
                text-transform: uppercase;
                width: 46px
            }

            .dice-die-button__tooltip__pip {
                background: #fff;
                border-color: transparent transparent #d7e1e8 #d7e1e8;
                border-style: solid;
                border-width: 1px;
                height: 8px;
                left: -5px;
                position: absolute;
                -webkit-transform: rotate(45deg);
                transform: rotate(45deg);
                width: 8px
            }


            @media(hover: hover) {
                .dice-die-button:hover {
                    background:#8a9ba8;
                    color: #182026
                }

                .dice-die-button:hover .dice-icon-die {
                    background-color: #182026
                }

                .dice-die-button:hover .dice-die-button__tooltip {
                    display: flex
                }
            }

            .dice-die-button--selected {
                background: #8a9ba8;
                color: #182026
            }

            .dice-die-button--selected .dice-icon-die {
                background-color: #182026
            }

            .dice-preview-panel {
                height: 100%;
                width: 100%
            }

            .dice-preview-panel canvas {
                height: 100%;
                left: 0;
                position: absolute;
                top: 0;
                width: 100%;
                z-index: 0
            }

            .dice-event-bar {
                display: flex;
                flex-wrap: nowrap
            }

            .dice-event-button {
                background-color: #182026;
                border: 1px solid #182026;
                box-sizing: border-box;
                color: #8a9ba8;
                cursor: pointer;
                display: inline-flex;
                justify-content: center;
                margin: 4px;
                padding: 4px;
                position: relative;
                text-align: center;
                width: 100px;
                z-index: 99
            }

            .dice-event-button:hover {
                border-color: #8a9ba8
            }

            @media only screen and (min-width: 700px) {
                .dice-event-bar {
                    bottom:6px;
                    position: absolute
                }
            }

            @media only screen and (max-width: 700px) {
                .dice-event-bar {
                    bottom:6px;
                    display: none;
                    position: absolute
                }
            }

            #noty_layout__bottom,#noty_layout__bottomCenter,#noty_layout__bottomLeft,#noty_layout__bottomRight,#noty_layout__center,#noty_layout__centerLeft,#noty_layout__centerRight,#noty_layout__top,#noty_layout__topCenter,#noty_layout__topLeft,#noty_layout__topRight,.noty_layout_mixin {
                -webkit-font-smoothing: subpixel-antialiased;
                -webkit-backface-visibility: hidden;
                backface-visibility: hidden;
                filter: blur(0);
                -webkit-filter: blur(0);
                margin: 0;
                max-width: 90%;
                padding: 0;
                position: fixed;
                -webkit-transform: translateZ(0) scale(1);
                transform: translateZ(0) scale(1);
                z-index: 9999999
            }

            #noty_layout__top {
                left: 5%;
                top: 0;
                width: 90%
            }

            #noty_layout__topLeft {
                left: 20px;
                top: 20px;
                width: 325px
            }

            #noty_layout__topCenter {
                left: 50%;
                top: 5%;
                -webkit-transform: translate(calc(-50% - .5px)) translateZ(0) scale(1);
                transform: translate(calc(-50% - .5px)) translateZ(0) scale(1);
                width: 325px
            }

            #noty_layout__topRight {
                right: 20px;
                top: 20px;
                width: 325px
            }

            #noty_layout__bottom {
                bottom: 0;
                left: 5%;
                width: 90%
            }

            #noty_layout__bottomLeft {
                bottom: 20px;
                left: 20px;
                width: 325px
            }

            #noty_layout__bottomCenter {
                bottom: 5%;
                left: 50%;
                -webkit-transform: translate(calc(-50% - .5px)) translateZ(0) scale(1);
                transform: translate(calc(-50% - .5px)) translateZ(0) scale(1);
                width: 325px
            }

            #noty_layout__bottomRight {
                bottom: 20px;
                right: 20px;
                width: 325px
            }

            #noty_layout__center {
                left: 50%;
                top: 50%;
                -webkit-transform: translate(calc(-50% - .5px),calc(-50% - .5px)) translateZ(0) scale(1);
                transform: translate(calc(-50% - .5px),calc(-50% - .5px)) translateZ(0) scale(1);
                width: 325px
            }

            #noty_layout__centerLeft {
                left: 20px
            }

            #noty_layout__centerLeft,#noty_layout__centerRight {
                top: 50%;
                -webkit-transform: translateY(calc(-50% - .5px)) translateZ(0) scale(1);
                transform: translateY(calc(-50% - .5px)) translateZ(0) scale(1);
                width: 325px
            }

            #noty_layout__centerRight {
                right: 20px
            }

            .noty_progressbar {
                display: none
            }

            .noty_has_timeout.noty_has_progressbar .noty_progressbar {
                background-color: #646464;
                bottom: 0;
                display: block;
                filter: alpha(opacity=10);
                height: 3px;
                left: 0;
                opacity: .2;
                position: absolute;
                width: 100%
            }

            .noty_bar {
                -webkit-font-smoothing: subpixel-antialiased;
                -webkit-backface-visibility: hidden;
                overflow: hidden;
                -webkit-transform: translate(0) translateZ(0) scale(1);
                transform: translate(0) scale(1)
            }

            .noty_effects_open {
                -webkit-animation: noty_anim_in .5s cubic-bezier(.68,-.55,.265,1.55);
                animation: noty_anim_in .5s cubic-bezier(.68,-.55,.265,1.55);
                -webkit-animation-fill-mode: forwards;
                animation-fill-mode: forwards;
                opacity: 0;
                -webkit-transform: translate(50%);
                transform: translate(50%)
            }

            .noty_effects_close {
                -webkit-animation: noty_anim_out .5s cubic-bezier(.68,-.55,.265,1.55);
                animation: noty_anim_out .5s cubic-bezier(.68,-.55,.265,1.55);
                -webkit-animation-fill-mode: forwards;
                animation-fill-mode: forwards
            }

            .noty_fix_effects_height {
                -webkit-animation: noty_anim_height 75ms ease-out;
                animation: noty_anim_height 75ms ease-out
            }

            .noty_close_with_click {
                cursor: pointer
            }

            .noty_close_button {
                background-color: rgba(0,0,0,.05);
                border-radius: 2px;
                cursor: pointer;
                font-weight: 700;
                height: 20px;
                line-height: 20px;
                position: absolute;
                right: 2px;
                text-align: center;
                top: 2px;
                transition: all .2s ease-out;
                width: 20px
            }

            .noty_close_button:hover {
                background-color: rgba(0,0,0,.1)
            }

            .noty_modal {
                background-color: #000;
                height: 100%;
                left: 0;
                opacity: .3;
                position: fixed;
                top: 0;
                width: 100%;
                z-index: 10000
            }

            .noty_modal.noty_modal_open {
                -webkit-animation: noty_modal_in .3s ease-out;
                animation: noty_modal_in .3s ease-out;
                opacity: 0
            }

            .noty_modal.noty_modal_close {
                -webkit-animation: noty_modal_out .3s ease-out;
                animation: noty_modal_out .3s ease-out;
                -webkit-animation-fill-mode: forwards;
                animation-fill-mode: forwards
            }

            @-webkit-keyframes noty_modal_in {
                to {
                    opacity: .3
                }
            }

            @keyframes noty_modal_in {
                to {
                    opacity: .3
                }
            }

            @-webkit-keyframes noty_modal_out {
                to {
                    opacity: 0
                }
            }

            @keyframes noty_modal_out {
                to {
                    opacity: 0
                }
            }

            @-webkit-keyframes noty_anim_in {
                to {
                    opacity: 1;
                    -webkit-transform: translate(0);
                    transform: translate(0)
                }
            }

            @keyframes noty_anim_in {
                to {
                    opacity: 1;
                    -webkit-transform: translate(0);
                    transform: translate(0)
                }
            }

            @-webkit-keyframes noty_anim_out {
                to {
                    opacity: 0;
                    -webkit-transform: translate(50%);
                    transform: translate(50%)
                }
            }

            @keyframes noty_anim_out {
                to {
                    opacity: 0;
                    -webkit-transform: translate(50%);
                    transform: translate(50%)
                }
            }

            @-webkit-keyframes noty_anim_height {
                to {
                    height: 0
                }
            }

            @keyframes noty_anim_height {
                to {
                    height: 0
                }
            }

            .dice-icon-die {
                background-color: #8a9ba8;
                display: inline-block;
                height: 32px;
                mask-repeat: no-repeat;
                -webkit-mask-repeat: no-repeat;
                width: 32px
            }

            .dice-icon-die--d20 {
                margin-left: 4px;
                mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='28' height='31' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 0 0 7.5v15.2l14 7.5 13-7 1-.6V7.5L14 0Zm-2 8.3-5.9 8.8-3.7-8 9.6-.8ZM8 18l6-9.1 6 9.1H8Zm13.8-.9L16 8.3l9.5.7-3.7 8.1ZM15 2.8l7.4 4-7.4-.6V2.8Zm-2 0v3.4l-7.4.6 7.4-4Zm-11 10 2.7 6L2 20.4v-7.6Zm1 9.3 2.7-1.6 4.4 5.5L3 22.1ZM8 20h11l-5 7.5L8 20Zm9.9 5.9 4.4-5.5L25 22l-7.1 3.9Zm5.6-7-.2-.1 2.7-6v7.6l-2.5-1.5Z'/%3E%3C/svg%3E");
                -webkit-mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='28' height='31' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 0 0 7.5v15.2l14 7.5 13-7 1-.6V7.5L14 0Zm-2 8.3-5.9 8.8-3.7-8 9.6-.8ZM8 18l6-9.1 6 9.1H8Zm13.8-.9L16 8.3l9.5.7-3.7 8.1ZM15 2.8l7.4 4-7.4-.6V2.8Zm-2 0v3.4l-7.4.6 7.4-4Zm-11 10 2.7 6L2 20.4v-7.6Zm1 9.3 2.7-1.6 4.4 5.5L3 22.1ZM8 20h11l-5 7.5L8 20Zm9.9 5.9 4.4-5.5L25 22l-7.1 3.9Zm5.6-7-.2-.1 2.7-6v7.6l-2.5-1.5Z'/%3E%3C/svg%3E")
            }

            .dice-icon-die--d12 {
                margin-left: 1px;
                mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='30' height='32' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25 4 15 0 5 4l-5 7v10l6 7 9 4 9-4 6-7V11l-5-7ZM2 11.9 6 14l3.7 8.2-3.4 3.4L2 21v-9.1ZM12 22l-3.7-7.2L15 9.2l6.7 5.5L18 22h-6Zm16-1-4.3 4.7-3.4-3.4L24 14l4-2.1V21ZM16 2.2l7.8 3.6L27 10l-4.5 2.6L16 7.5V2.2ZM6.2 5.8 14 2.2v5.2l-6.5 5.1-.5-.1L3 10l3.2-4.2Zm2.1 21 3-3h7.5l3 3L15 30l-6.7-3.2Z'/%3E%3C/svg%3E");
                -webkit-mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='30' height='32' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25 4 15 0 5 4l-5 7v10l6 7 9 4 9-4 6-7V11l-5-7ZM2 11.9 6 14l3.7 8.2-3.4 3.4L2 21v-9.1ZM12 22l-3.7-7.2L15 9.2l6.7 5.5L18 22h-6Zm16-1-4.3 4.7-3.4-3.4L24 14l4-2.1V21ZM16 2.2l7.8 3.6L27 10l-4.5 2.6L16 7.5V2.2ZM6.2 5.8 14 2.2v5.2l-6.5 5.1-.5-.1L3 10l3.2-4.2Zm2.1 21 3-3h7.5l3 3L15 30l-6.7-3.2Z'/%3E%3C/svg%3E")
            }

            .dice-icon-die--d10,.dice-icon-die--d100 {
                mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='32' height='29' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M16 0 0 12l1 6 15 11 15-11 1-6L16 0Zm13.7 12.8-.5 3.2-3.5-1.7-5.4-9 9.4 7.5ZM15 19.6v6.1l-11.1-8L7 16.1l8 3.5Zm2 0 8-3.5 3.1 1.6L17 25.8v-6.2Zm6.6-5.1L16 17.9l-7.6-3.4L16 2.9l7.6 11.6ZM2.3 12.8l9.4-7.5-5.4 9L2.8 16l-.5-3.2Z'/%3E%3C/svg%3E");
                -webkit-mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='32' height='29' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M16 0 0 12l1 6 15 11 15-11 1-6L16 0Zm13.7 12.8-.5 3.2-3.5-1.7-5.4-9 9.4 7.5ZM15 19.6v6.1l-11.1-8L7 16.1l8 3.5Zm2 0 8-3.5 3.1 1.6L17 25.8v-6.2Zm6.6-5.1L16 17.9l-7.6-3.4L16 2.9l7.6 11.6ZM2.3 12.8l9.4-7.5-5.4 9L2.8 16l-.5-3.2Z'/%3E%3C/svg%3E")
            }

            .dice-icon-die--d100 {
                margin-top: 7px;
                mask-repeat: space no-repeat;
                -webkit-mask-repeat: space no-repeat;
                mask-size: 50%;
                -webkit-mask-size: 50%;
                width: 48px
            }

            .dice-icon-die--d8 {
                margin-left: 6px;
                mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='26' height='31' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13 0 0 8v13l13 10 13-10V8L13 0Zm11 15.9L17 4.5 24 9v6.9ZM13 2l.1.1L24.2 20H1.8L12.9 2.1 13 2ZM9 4.5 2 15.9V9l7-4.5ZM3.9 22h18.2L13 28.5 3.9 22Z'/%3E%3C/svg%3E");
                -webkit-mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='26' height='31' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13 0 0 8v13l13 10 13-10V8L13 0Zm11 15.9L17 4.5 24 9v6.9ZM13 2l.1.1L24.2 20H1.8L12.9 2.1 13 2ZM9 4.5 2 15.9V9l7-4.5ZM3.9 22h18.2L13 28.5 3.9 22Z'/%3E%3C/svg%3E")
            }

            .dice-icon-die--d6 {
                margin-left: 4px;
                mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='27' height='27' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 6.978h17.602M1 6.978 10.444 1H26M1 6.978V26h17.602m0-19.022L26 1m-7.398 5.978V26M26 1v17.391L18.602 26' stroke='%23fff' stroke-width='1.75'/%3E%3C/svg%3E");
                -webkit-mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='27' height='27' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 6.978h17.602M1 6.978 10.444 1H26M1 6.978V26h17.602m0-19.022L26 1m-7.398 5.978V26M26 1v17.391L18.602 26' stroke='%23fff' stroke-width='1.75'/%3E%3C/svg%3E")
            }

            .dice-icon-die--d4 {
                mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='31' height='27' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14.5 2 2 25.5h22.5M14.5 2l10 23.5M14.5 2l15 11-5 12.5' stroke='%23fff' stroke-width='1.75'/%3E%3C/svg%3E");
                -webkit-mask-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='31' height='27' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14.5 2 2 25.5h22.5M14.5 2l10 23.5M14.5 2l15 11-5 12.5' stroke='%23fff' stroke-width='1.75'/%3E%3C/svg%3E")
            }

            .noty_layout div {
                box-sizing: content-box
            }

            #noty_layout__bottomRight {
                z-index: 60001
            }

            @media screen and (min-width: 1024px) {
                #noty_layout__bottomRight {
                    bottom:40px;
                    right: 40px;
                    width: inherit
                }
            }

            @media screen and (max-width: 1023px) {
                #noty_layout__bottomRight {
                    bottom:72px;
                    right: 17px
                }
            }

            .noty_layout.collapse .noty_bar {
                display: none
            }

            .noty_bar {
                clear: both;
                float: right
            }

            .dice_result {
                background: #182026;
                border-radius: 12px;
                float: left;
                margin-top: 16px
            }

            .dice_result--crit {
                border: 3px solid #1b9af0
            }

            .noty_bar.noty_theme__valhalla-min .dice_result {
                height: 28px;
                padding: 11px
            }

            .noty_bar.noty_theme__valhalla-min .dice_result__rolltype {
                margin-right: 16px
            }

            .noty_bar.noty_theme__valhalla-min .dice_result__info {
                display: flex;
                flex-direction: column;
                justify-content: center;
                margin: 0 10px;
                min-width: inherit
            }

            .noty_bar.noty_theme__valhalla-min .dice_result__info__dicenotation,.noty_bar.noty_theme__valhalla-min .dice_result__info__results {
                display: none
            }

            .noty_bar.noty_theme__valhalla-min .dice_result__divider {
                height: 30px;
                margin-top: 0;
                right: 48px
            }

            .noty_bar.noty_theme__valhalla-min .dice_result__total-container {
                padding: 0;
                position: relative;
                width: 35px
            }

            .noty_bar.noty_theme__valhalla-min .dice_result__total-result {
                font-size: 18px;
                line-height: 28px;
                margin-top: 0
            }

            .noty_bar.noty_theme__valhalla-min .dice_result__total-header {
                display: none
            }

            .dice_result {
                color: #8a9ba8;
                display: flex;
                font-family: Roboto Condensed;
                font-size: 13px;
                font-style: normal;
                font-weight: 700;
                letter-spacing: 1px
            }

            .dice_result__info {
                margin: 18px;
                min-width: 130px
            }

            .dice_result__info__title {
                text-transform: uppercase
            }

            .dice_result__info__rolldetail {
                color: #fff;
                text-transform: uppercase
            }

            .dice_result__info__targetdetail {
                color: #8a9ba8;
                text-transform: uppercase
            }

            .dice_result__info__results {
                display: flex
            }

            .dice_result__info .dice-icon-die {
                background-color: #8a9ba8;
                display: inline-block;
                height: 32px;
                margin: 0 8px 0 0;
                position: relative;
                top: 3px;
                width: 32px
            }

            .dice_result__info .dice-icon-die--d100 {
                width: 64px
            }

            .dice_result__info__breakdown {
                color: #fff;
                font-size: 24px;
                height: 42px;
                line-height: 35px;
                max-width: 160px
            }

            .dice_result__info__breakdown,.dice_result__info__dicenotation {
                display: block;
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap
            }

            .dice_result__info__dicenotation {
                bottom: 24px;
                color: #8a9ba8;
                font-size: 18px;
                line-height: 21px;
                max-width: 200px
            }

            .dice_result__divider {
                background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='19' height='80' viewBox='0 0 19 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23394B59' d='M10 0v100H9V0z'/%3E%3Cpath fill='%23182026' d='M19 68H0V33h19z'/%3E%3Cpath fill='%23394B59' d='M19 57H0v-3h19zM19 47H0v-3h19z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                display: inline-block;
                height: 80px;
                margin-top: 18px;
                position: absolute;
                right: 95px;
                width: 20px
            }

            .dice_result__divider--target {
                margin-top: 31px
            }

            .dice_result__total-container {
                align-content: center;
                align-items: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding-left: 10px;
                padding-right: 5px;
                width: 95px
            }

            .dice_result__total-header {
                position: absolute;
                top: 35px
            }

            .dice_result__total-header--advantage {
                color: #80bc67
            }

            .dice_result__total-header--disadvantage {
                color: #df7b7b
            }

            .dice_result__total-header--crit {
                color: #1b9af0
            }

            .dice_result__total-result {
                color: #fff;
                font-size: 36px
            }

            .dice_result__total-result-target {
                margin-top: 7px
            }

            .dice_notification_controls {
                clear: both;
                font-family: Roboto Condensed;
                font-style: normal;
                height: 40px;
                padding-top: 24px
            }

            .dice_notification_controls .dice_notification_control {
                background-color: #182026;
                border-radius: 16px;
                cursor: pointer;
                float: right;
                height: 33px;
                margin-left: 16px
            }

            .dice_notification_controls span {
                color: #fff;
                float: left;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 1px;
                line-height: 15px;
                margin-top: 10px;
                padding-left: 19px;
                text-align: right;
                text-transform: uppercase
            }

            .dice_notification_controls i {
                background-repeat: no-repeat;
                display: inline-block;
                height: 18px;
                margin: 8px;
                width: 18px
            }

            .dice_notification_controls__collapse i,.dice_notification_controls__uncollapse i {
                background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='18' height='18' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M17.707 4.293a.999.999 0 0 0-1.414 0L9 11.586 1.707 4.293A.999.999 0 1 0 .293 5.707l8 8a.997.997 0 0 0 1.414 0l8-8a.999.999 0 0 0 0-1.414Z' fill='%23BFCCD6'/%3E%3C/svg%3E")
            }

            .dice_notification_controls__uncollapse i {
                -webkit-transform: rotate(180deg);
                transform: rotate(180deg)
            }

            .dice_notification_controls__clear i {
                background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='18' height='18' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M16 8h-6V2a1 1 0 1 0-2 0v6H2a1 1 0 1 0 0 2h6v6a1 1 0 1 0 2 0v-6h6a1 1 0 1 0 0-2Z' fill='%23BFCCD6'/%3E%3C/svg%3E");
                -webkit-transform: rotate(45deg);
                transform: rotate(45deg)
            }

            .rolltype_roll {
                color: #f5a623
            }

            .rolltype_tohit {
                color: #1b9af0
            }

            .rolltype_damage {
                color: #df7b7b
            }

            .rolltype_check,.rolltype_spell {
                color: #b55dff
            }

            .rolltype_heal,.rolltype_save {
                color: #6cbf5b
            }

            .rolltype_advantage {
                color: #080
            }

            .rolltype_disadvantage {
                color: #a00
            }

            @media only screen and (max-width: 320px) {
                #noty_layout__bottomRight {
                    bottom:4px;
                    right: 4px
                }

                .dice_result {
                    margin-top: 4px
                }

                .noty_bar.noty_theme__valhalla .dice_result {
                    padding: 10px
                }
            }

            @media only screen and (max-width: 767px) {
                .dice_result__info__dicenotation {
                    display:none
                }

                .dice_result__divider {
                    margin-top: 8px
                }

                .dice_result__total-result {
                    margin-top: 15px
                }
            }

            .dice-rolling-panel {
                left: 0;
                pointer-events: none;
                position: fixed;
                top: 0;
                z-index: 57000
            }

            .dice-rolling-panel,.dice-rolling-panel__container {
                height: 100%;
                width: 100%
            }

            .dice-rolling-panel .dice-toolbar {
                bottom: 10px;
                left: 10px;
                pointer-events: all;
                position: fixed;
                z-index: 1
            }
            [class*='-NotRoot'] {
                top:unset;
                bottom: 10px;
                left:70px;
            }

            [class*='-NotRoot'] [class*='-MessageRoot']{
                position: relative;
            }

            [class*='-NotRoot'] [class*='-MessageCarrot-MessageRoot']{
                border:none;
            }
        </style>`)
}




