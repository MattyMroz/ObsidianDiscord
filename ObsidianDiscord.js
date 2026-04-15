// ==UserScript==
// @name         Obsidian Discord Theme
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Dodaje motyw Obsidian do Discorda, intensywnie odświeża na początku, potem monitoruje zmiany URL
// @author       Matty_Mroz
// @match        https://discord.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/MattyMroz/ObsidianDiscord/main/ObsidianDiscord.js
// @downloadURL  https://raw.githubusercontent.com/MattyMroz/ObsidianDiscord/main/ObsidianDiscord.js
// ==/UserScript==

(function () {
    'use strict';

    const cssUrls = [
        'https://mattymroz.github.io/ObsidianDiscord/ObsidianDiscordThemeOnline.css',
    ];

    let styleElement = null;
    let lastUrl = location.href;
    let initialLoadCount = 0;

    function loadCSS(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function (response) {
                    if (styleElement) {
                        styleElement.remove();
                    }
                    styleElement = GM_addStyle(response.responseText);
                    resolve();
                },
                onerror: reject
            });
        });
    }

    function loadAllCSS() {
        Promise.all(cssUrls.map(loadCSS))
            .catch(error => {
                console.error('Błąd podczas ładowania CSS:', error);
            });
    }

    function checkUrlChange() {
        if (lastUrl !== location.href) {
            lastUrl = location.href;
            loadAllCSS();
        }
    }

    function initialLoad() {
        loadAllCSS();
        initialLoadCount++;
        if (initialLoadCount < 10) {
            setTimeout(initialLoad, 500);
        } else {
            setInterval(checkUrlChange, 100);
        }
    }

    function init() {
        loadAllCSS();
        initialLoad();

        window.addEventListener('popstate', loadAllCSS);
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function () {
            originalPushState.apply(this, arguments);
            loadAllCSS();
        };

        history.replaceState = function () {
            originalReplaceState.apply(this, arguments);
            loadAllCSS();
        };

        window.addEventListener('hashchange', loadAllCSS);
    }

    window.addEventListener('load', init);

})();