// ==UserScript==
// @name         Obsidian Discord Theme
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Applies the Obsidian theme to Discord in the browser: fetched once, re-attached if Discord drops it
// @author       Matty_Mroz
// @match        https://discord.com/*
// @grant        GM_xmlhttpRequest
// @connect      mattymroz.github.io
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/MattyMroz/ObsidianDiscord/main/ObsidianDiscord.js
// @downloadURL  https://raw.githubusercontent.com/MattyMroz/ObsidianDiscord/main/ObsidianDiscord.js
// ==/UserScript==

(() => {
    'use strict';

    // The stable public alias, not the theme file directly. It forwards to whatever
    // the theme file is called today, so renaming it never breaks copies of this
    // script that are already installed. One extra request, cached afterwards.
    const THEME_URL =
        'https://mattymroz.github.io/ObsidianDiscord/ObsidianDiscordThemeOnline.css';

    let styleElement = null;

    // At document-start <head> does not exist yet, so fall back to <html>.
    function attach() {
        if (styleElement && !styleElement.isConnected) {
            (document.head || document.documentElement).appendChild(
                styleElement,
            );
        }
    }

    function inject(css) {
        styleElement = document.createElement('style');
        styleElement.id = 'obsidian-discord-theme';
        styleElement.textContent = css;
        (document.head || document.documentElement).appendChild(styleElement);

        // Discord rebuilds parts of the document on navigation and can drop foreign
        // nodes. Re-attaching the element we already own avoids refetching the CSS,
        // which the previous version did on every single URL change.
        new MutationObserver(attach).observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    GM_xmlhttpRequest({
        method: 'GET',
        url: THEME_URL,
        onload: (response) => {
            if (response.status === 200) {
                inject(response.responseText);
            } else {
                console.error(
                    '[Obsidian Discord] theme request returned HTTP',
                    response.status,
                );
            }
        },
        onerror: () => {
            console.error('[Obsidian Discord] could not reach', THEME_URL);
        },
    });
})();
