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
    // script that are already installed.
    const ALIAS_URL =
        'https://mattymroz.github.io/ObsidianDiscord/ObsidianDiscordThemeOnline.css';
    const OWN_HOST = 'mattymroz.github.io';
    const MAX_DEPTH = 4;

    let styleElement = null;

    function fetchText(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                onload: (response) => {
                    if (response.status === 200) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error(`HTTP ${response.status} for ${url}`));
                    }
                },
                onerror: () => reject(new Error(`request failed for ${url}`)),
            });
        });
    }

    // Discord sends style-src 'self' 'unsafe-inline' plus its own hosts. Inline CSS
    // is therefore allowed, but a stylesheet the browser has to fetch from
    // mattymroz.github.io is not: an @import left in the injected text is dropped
    // and nothing applies. So our own files get pasted in here instead.
    //
    // Foreign imports are deliberately left as they are. Material Discord, which
    // this theme builds on, has always been blocked by the same rule in the
    // browser, and pulling in its 600 kB would change how Discord looks here
    // rather than restore it.
    async function inlineOwnImports(css, baseUrl, depth) {
        if (depth >= MAX_DEPTH) {
            return css;
        }

        const pattern = /@import\s+url\(\s*(['"]?)([^'")]+)\1\s*\)\s*;/g;
        const targets = [];
        for (const match of css.matchAll(pattern)) {
            const resolved = new URL(match[2], baseUrl);
            if (resolved.host === OWN_HOST) {
                targets.push({ statement: match[0], url: resolved.href });
            }
        }

        let result = css;
        for (const target of targets) {
            const imported = await fetchText(target.url);
            const expanded = await inlineOwnImports(
                imported,
                target.url,
                depth + 1,
            );
            // Function replacement: the CSS carries $ sequences that a string
            // replacement would interpret as capture group references.
            result = result.replace(target.statement, () => expanded);
        }
        return result;
    }

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
        // which an earlier version did on every single URL change.
        new MutationObserver(attach).observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    (async () => {
        try {
            const alias = await fetchText(ALIAS_URL);
            inject(await inlineOwnImports(alias, ALIAS_URL, 0));
        } catch (error) {
            console.error('[Obsidian Discord]', error.message);
        }
    })();
})();
