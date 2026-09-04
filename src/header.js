// ==UserScript==
// @name         nihondex-plus
// @namespace    chapterjason
// @version      1.0.17
// @author       chapterjason
// @homepageURL  https://github.com/chapterjason/nihondex-plus
// @supportURL   https://github.com/chapterjason/nihondex-plus/issues
// @match        https://nihondex.com/*
// @run-at       document-idle
// @connect      localhost
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// Limit: a question starts when the new card shows up in the DOM, roughly
// 40-80ms after it really appeared. Answer times are taken from the actual
// click or keypress, start times cannot be. Measured times run a bit short.
