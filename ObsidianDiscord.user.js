// ==UserScript==
// @name         Obsidian Discord Theme
// @namespace    http://tampermonkey.net/
// @version      5.0
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

    // Adopted, not a <style> element. Discord ships its CSS in hundreds of
    // chunks, many loaded only when a screen or dialog first opens, and appends
    // each one to <head>. A <style> put there at document-start sat in the middle
    // of that queue, and every chunk loaded after it beat Material wherever both
    // used the same specificity: channel rows grew from 36 to 44 px and the
    // create-channel dialog fell apart. Adopted sheets cascade after every sheet
    // in the document however late those arrive, and Discord never touches them,
    // so nothing has to be moved, polled or put back.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

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
            sheet.replaceSync(css);
        },
        onerror: (error) => {
            console.error('ObsidianDiscord: fetch failed', error);
        },
    });
})();
