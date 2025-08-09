// ==UserScript==
// @name         Backpack.tf+Gladiator.tf Floating Stats (BETA)_EN
// @namespace    http://tampermonkey.net/
// @version      1.10
// @description  Floating Gladiator.tf stats widget over backpack.tf
// @match        https://backpack.tf/stats/*
// @match        https://backpack.tf/classifieds*
// @grant        GM_xmlhttpRequest
// @connect      gladiator.tf
// @author       mrTranzister+GPT
// ==/UserScript==

(function () {
    'use strict';

    function getItemNameFromURL() {
        let urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('item')) {
            return decodeURIComponent(urlParams.get('item')).trim();
        }
        let meta = document.querySelector('meta[name="title"]');
        if (meta && meta.content.trim()) return meta.content.trim();
        return null;
    }

    let itemName = getItemNameFromURL();
    if (!itemName) return;

    let gladiatorUrl = `https://gladiator.tf/sales?item=${encodeURIComponent(itemName)}`;

    GM_xmlhttpRequest({
        method: "GET",
        url: gladiatorUrl,
        onload: function (response) {
            let parser = new DOMParser();
            let doc = parser.parseFromString(response.responseText, "text/html");
            let statsSection = doc.querySelector('.card-body-dark');

            let content = statsSection
                ? statsSection.innerHTML
                : `<div style="color:#ff6666;">Не знайдено статистику для "${itemName}"</div>`;

            let widget = document.createElement('div');
            widget.innerHTML = `
                <div style="
                    position: relative;
                    background: #1b1b1b;
                    color: #eee;
                    padding: 14px 40px 14px 14px;
                    border-radius: 10px;
                    font-size: 13px;
                    box-shadow: 0 0 12px rgba(0,0,0,0.65);
                    width: 360px;
                    max-height: 90vh;
                    overflow-y: auto;
                    line-height: 1.4;
                ">
                    <button id="toggleBtn" title="Show / Hide" style="
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: transparent;
                        border: none;
                        color: #ff9900;
                        font-size: 18px;
                        cursor: pointer;
                        font-weight: bold;
                        line-height: 1;
                        padding: 0;
                        user-select: none;
                    ">×</button>
                    <h3 style="font-size: 15px; margin: 0 0 12px; color: #ff9900;">
                        📊 Gladiator.tf Statistics
                    </h3>
                    <div id="contentArea">
                        ${content}
                    </div>
                    <div style="margin-top: 10px; font-size: 11px; color: #aaa;">
                        Дані з <a href="${gladiatorUrl}" target="_blank" style="color: #ffcc66;">Gladiator.tf</a>
                    </div>
                </div>
            `;

            widget.style.position = "fixed";
            widget.style.top = "80px";
            widget.style.right = "20px";
            widget.style.zIndex = "9999";
            widget.style.transition = "opacity 0.3s ease-in-out";
            widget.style.opacity = "0.95";

            widget.addEventListener("mouseenter", () => widget.style.opacity = "1");
            widget.addEventListener("mouseleave", () => widget.style.opacity = "0.95");

            document.body.appendChild(widget);

            let toggleBtn = widget.querySelector('#toggleBtn');
            let contentArea = widget.querySelector('#contentArea');
            let isVisible = true;

            toggleBtn.addEventListener('click', () => {
                if (isVisible) {
                    contentArea.style.display = "none";
                    toggleBtn.style.color = "#666";
                    isVisible = false;
                } else {
                    contentArea.style.display = "block";
                    toggleBtn.style.color = "#ff9900";
                    isVisible = true;
                }
            });
        }
    });
})();
