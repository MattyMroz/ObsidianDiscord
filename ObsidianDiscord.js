// ==UserScript==
// @name         Obsidian Discord Theme
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Dodaje motyw Obsidian do Discorda po załadowaniu strony, 10 razy w odstępach 1-sekundowych
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

    function loadCSS(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function (response) {
                    GM_addStyle(response.responseText);
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

    function repeatedLoad(times) {
        if (times > 0) {
            loadAllCSS();
            setTimeout(() => repeatedLoad(times - 1), 500);
        }
    }

    window.addEventListener('load', () => repeatedLoad(10));

})();