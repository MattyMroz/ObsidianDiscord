// ==UserScript==
// @name         Obsidian Discord Theme
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Adds the Obsidian theme to Discord, from cache before the first paint so no unstyled frame is ever shown
// @author       Matty_Mroz
// @match        https://discord.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      mattymroz.github.io
// The .user.js suffix is load-bearing: Tampermonkey only offers its install
// screen for URLs that end in it. Named ObsidianDiscord.js, the raw link opened
// as plain text and clicking it installed nothing.
// @updateURL    https://raw.githubusercontent.com/MattyMroz/ObsidianDiscord/main/ObsidianDiscord.user.js
// @downloadURL  https://raw.githubusercontent.com/MattyMroz/ObsidianDiscord/main/ObsidianDiscord.user.js
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

    const cacheKey = 'obsidian-discord-css';

    // Version 3 fetched 650 KB after the load event and styled the page only once
    // it arrived, so every reload showed plain Discord first. The stylesheet is
    // kept in Tampermonkey storage instead and applied from there at
    // document-start, which is what removes that flash; the network copy is
    // fetched afterwards and only swapped in when it actually differs.
    let css = '';
    try {
        css = GM_getValue(cacheKey, '');
    } catch (error) {
        console.error('ObsidianDiscord: cache unreadable', error);
    }

    let styleElement = null;

    function ensureStyle() {
        if (!css) {
            return;
        }
        if (styleElement && styleElement.isConnected) {
            return;
        }

        // At document-start there may be no <head> yet. <html> takes a <style>
        // just as well, and the poll below moves it once the head exists.
        const parent = document.head || document.documentElement;
        if (!parent) {
            return;
        }

        styleElement = document.createElement('style');
        styleElement.id = 'obsidian-discord';
        styleElement.textContent = css;
        parent.appendChild(styleElement);
    }

    // Injecting this early means Discord's own stylesheets load after it, and the
    // rules Material does not mark !important would lose to them on equal
    // specificity. appendChild on a node already in the document moves it, so
    // this puts the theme back at the end once Discord is done adding its own.
    function moveLast() {
        if (!styleElement || !document.head) {
            return;
        }
        if (document.head.lastElementChild === styleElement) {
            return;
        }
        document.head.appendChild(styleElement);
    }

    function refresh() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: cssUrl,
            onload: (response) => {
                if (response.status !== 200) {
                    console.error('ObsidianDiscord: HTTP', response.status);
                    return;
                }
                if (response.responseText === css) {
                    return;
                }

                css = response.responseText;
                try {
                    GM_setValue(cacheKey, css);
                } catch (error) {
                    console.error('ObsidianDiscord: cache unwritable', error);
                }

                if (styleElement) {
                    styleElement.remove();
                    styleElement = null;
                }
                ensureStyle();
                moveLast();
            },
            onerror: (error) => {
                console.error('ObsidianDiscord: fetch failed', error);
            },
        });
    }

    // Styled from the first frame, on every load after the first one.
    ensureStyle();
    refresh();

    // The poll is the backstop for Discord tearing the element out; the history
    // hooks only make that reattach immediate instead of up to 100 ms late.
    setInterval(ensureStyle, 100);

    document.addEventListener('DOMContentLoaded', () => {
        ensureStyle();
        moveLast();
    });

    window.addEventListener('load', () => {
        ensureStyle();
        moveLast();
    });

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
})();
