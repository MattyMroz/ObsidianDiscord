// ==UserScript==
// @name         Obsidian Discord Theme
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Adds the Obsidian theme to Discord, refreshes hard at first, then watches for URL changes
// @author       Matty_Mroz
// @match        https://discord.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      mattymroz.github.io
// @updateURL    https://raw.githubusercontent.com/MattyMroz/ObsidianDiscord/main/ObsidianDiscord.js
// @downloadURL  https://raw.githubusercontent.com/MattyMroz/ObsidianDiscord/main/ObsidianDiscord.js
// ==/UserScript==

(() => {
    'use strict';

    // The theme file itself, not ObsidianDiscordThemeOnline.css. That file is a
    // single @import, and Discord sends style-src 'self' 'unsafe-inline' plus its
    // own hosts: pasted rules are allowed, but a stylesheet the page has to fetch
    // from mattymroz.github.io is not, so an @import here applies nothing.
    const cssUrls = [
        'https://mattymroz.github.io/ObsidianDiscord/ObsidianDiscord.theme.css',
    ];

    let styleElement = null;
    let lastUrl = location.href;
    let initialLoadCount = 0;

    function loadCSS(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: (response) => {
                    if (styleElement) {
                        styleElement.remove();
                    }
                    styleElement = GM_addStyle(response.responseText);
                    resolve();
                },
                onerror: reject,
            });
        });
    }

    function loadAllCSS() {
        Promise.all(cssUrls.map(loadCSS)).catch((error) => {
            console.error('Error while loading CSS:', error);
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
        if (initialLoadCount < 1) {
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
