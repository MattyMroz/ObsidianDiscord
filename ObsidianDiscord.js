// ==UserScript==
// @name         Obsidian Discord Theme
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Adds the Obsidian theme to Discord, fetching the prebuilt bundle once so Discord's CSP cannot block Material Discord
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

    // The bundle, not the theme and not ObsidianDiscordThemeOnline.css.
    //
    // Discord sends style-src 'self' 'unsafe-inline' and img-src 'self' blob:
    // data:, so pasted CSS text applies but anything the page has to fetch from
    // capnkitten.github.io does not. Fetching the theme left Material Discord
    // blocked in the browser - all four of its stylesheets - because the theme
    // reaches Material through @import. The bundle is that whole chain inlined
    // ahead of time by scripts/build_browser_css.py, its icons turned into data:
    // URIs, its fonts repointed at fonts.gstatic.com, and the theme appended last
    // so it still overrides.
    //
    // GM_xmlhttpRequest is not bound by the page policy, which is the only reason
    // any of this works.
    const cssUrl =
        'https://mattymroz.github.io/ObsidianDiscord/ObsidianDiscordBrowser.css';

    let styleElement = null;
    let cachedCss = null;

    // The bundle is ~650 KB. Version 2.0 refetched on every URL change, which was
    // free at 22 KB and is not free now, so it is fetched once and the element is
    // only put back when Discord tears it out of the DOM.
    function ensureStyle() {
        if (cachedCss === null) {
            return;
        }
        if (styleElement && styleElement.isConnected) {
            return;
        }
        styleElement = GM_addStyle(cachedCss);
    }

    function loadCSS() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: cssUrl,
            onload: (response) => {
                if (response.status !== 200) {
                    console.error('ObsidianDiscord: HTTP', response.status);
                    return;
                }
                cachedCss = response.responseText;
                ensureStyle();
            },
            onerror: (error) => {
                console.error('ObsidianDiscord: fetch failed', error);
            },
        });
    }

    // GM_addStyle, the load event and the URL handling below are the structure
    // that is known to work in a browser. An earlier 2.0 replaced them with
    // document-start and a MutationObserver, was never run in one, and had to be
    // reverted. The poll is the backstop; the history hooks only make the
    // reattach immediate instead of up to 100 ms late.
    function init() {
        loadCSS();
        setInterval(ensureStyle, 100);

        window.addEventListener('popstate', ensureStyle);
        window.addEventListener('hashchange', ensureStyle);

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function () {
            originalPushState.apply(this, arguments);
            ensureStyle();
        };

        history.replaceState = function () {
            originalReplaceState.apply(this, arguments);
            ensureStyle();
        };
    }

    window.addEventListener('load', init);
})();
