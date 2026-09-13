// ==UserScript==
// @name         Obsidian Discord Theme
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Adds the Obsidian theme to Discord, fetching the published stylesheet once so Discord's CSP cannot block Material Discord
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

    // The one published stylesheet. Not a second file: the same theme, served
    // with everything it depends on already inside it.
    //
    // Discord sends style-src 'self' 'unsafe-inline' and img-src 'self' blob:
    // data:, so pasted CSS text applies but anything the page has to fetch from
    // capnkitten.github.io does not. The theme reaches Material Discord through
    // @import, so pasting the source alone left all four Material stylesheets
    // blocked. scripts/build_browser_css.py folds that whole chain in ahead of
    // time - icons as data: URIs, fonts repointed at fonts.gstatic.com - and the
    // Pages workflow publishes the result at this URL on every change.
    //
    // GM_xmlhttpRequest is not bound by the page policy, which is the only reason
    // any of this works.
    const cssUrl =
        'https://mattymroz.github.io/ObsidianDiscord/ObsidianDiscord.theme.css';

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
