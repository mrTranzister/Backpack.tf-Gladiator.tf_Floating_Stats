// ==UserScript==
// @name         Backpack.tf+Gladiator.tf Floating Stats (BETA)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Floating Gladiator.tf stats widget over backpack.tf
// @match        https://backpack.tf/stats/*
// @match        https://backpack.tf/classifieds?item=*
// @grant        GM_xmlhttpRequest
// @connect      gladiator.tf
// @author       mrTranzister+GPT
// ==/UserScript==

(function () {
    'use strict';

    const WIDGET_WIDTH = 360;
    const WIDGET_MINI_WIDTH = 110;

    function getCleanText(el) {
        if (!el) return '';
        let clone = el.cloneNode(true);
        clone.querySelectorAll('small, span[data-tip]').forEach(s => s.remove());
        return clone.textContent.replace(/\s+/g, ' ').trim();
    }

    function waitForItemName(callback) {
        let tries = 0;
        const maxTries = 50;

        const interval = setInterval(() => {
            tries++;
            let name = null;

            let titleEl = document.querySelector('.listing-title h5');
            if (titleEl) name = getCleanText(titleEl);

            if (!name) {
                let link = document.querySelector('.item-link');
                if (link) name = getCleanText(link);
            }

            if (!name) {
                let heading = document.querySelector('.media-heading a');
                if (heading) name = getCleanText(heading);
            }

            if (!name) {
                let meta = document.querySelector('meta[name="title"]');
                if (meta && meta.content.trim()) name = meta.content.trim();
            }

            if (name && name.toLowerCase() !== 'classifieds') {
                clearInterval(interval);
                callback(name);
            }

            if (tries >= maxTries) {
                clearInterval(interval);
                console.warn("[Gladiator Stats] Failed to find the item name.");
            }
        }, 100);
    }

    function loadStats(itemName) {
        let gladiatorUrl = `https://gladiator.tf/sales?item=${encodeURIComponent(itemName)}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: gladiatorUrl,
            headers: {
                'User-Agent': `Gladiator.tf Floating Stats / ${GM_info.script.version}`
            },
            onload: function (response) {
                let parser = new DOMParser();
                let doc = parser.parseFromString(response.responseText, "text/html");

                let statsSection = doc.querySelector('.card-body-dark');

                let content = statsSection
                    ? statsSection.innerHTML
                    : `<div style="color:#ff6666;">No statistics found for "${itemName}"</div>`;

                if (content) {
                    let tempDiv = document.createElement('div');
                    tempDiv.innerHTML = content;

                    function removeTimeTextNodes(node) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            let timeRegex = /\b\d{2}:\d{2}:\d{2}\b/;
                            if (timeRegex.test(node.textContent)) {
                                node.textContent = node.textContent.replace(timeRegex, '');
                            }
                        } else {
                            node.childNodes.forEach(removeTimeTextNodes);
                        }
                    }
                    removeTimeTextNodes(tempDiv);

                    let tzRegex = /\([^)]+\)/g;
                    tempDiv.innerHTML = tempDiv.innerHTML.replace(tzRegex, '');

                    let gmtRegex = /GMT[+-]\d{4}/g;
                    tempDiv.innerHTML = tempDiv.innerHTML.replace(gmtRegex, '');

                    function reformatDates(node) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const dateRegex = /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})\b/g;
                            const monthMap = {
                                Jan: '01', Feb: '02', Mar: '03', Apr: '04',
                                May: '05', Jun: '06', Jul: '07', Aug: '08',
                                Sep: '09', Oct: '10', Nov: '11', Dec: '12'
                            };
                            node.textContent = node.textContent.replace(dateRegex, (match, mon, day, year) => {
                                let dd = day.padStart(2, '0');
                                return `${dd}.${monthMap[mon]}.${year}`;
                            });
                        } else {
                            node.childNodes.forEach(reformatDates);
                        }
                    }
                    reformatDates(tempDiv);

                    content = tempDiv.innerHTML;
                }

                let widget = document.createElement('div');
                widget.style.position = "fixed";
                widget.style.top = "80px";
                widget.style.right = "20px";
                widget.style.zIndex = "9999";
                widget.style.width = WIDGET_WIDTH + "px";
                widget.style.maxHeight = "90vh";
                widget.style.overflowY = "auto";
                widget.style.background = "#1b1b1b";
                widget.style.color = "#eee";
                widget.style.borderRadius = "10px";
                widget.style.boxShadow = "0 0 12px rgba(0,0,0,0.65)";
                widget.style.transition = "width 0.3s ease, opacity 0.3s ease-in-out";
                widget.style.opacity = "0.95";
                widget.addEventListener("mouseenter", () => widget.style.opacity = "1");
                widget.addEventListener("mouseleave", () => widget.style.opacity = "0.95");

                let header = document.createElement('div');
                header.style.display = "flex";
                header.style.justifyContent = "space-between";
                header.style.alignItems = "center";
                header.style.padding = "8px 10px";
                header.style.background = "#222";
                header.style.borderBottom = "1px solid #444";

                let title = document.createElement('div');
                title.textContent = "📊 Gladiator.tf Statistics";
                title.style.fontSize = "14px";
                title.style.color = "#ff9900";
                header.appendChild(title);

                let toggleBtn = document.createElement('button');
                toggleBtn.textContent = "–";
                toggleBtn.style.cssText = "background:none;border:none;color:#fff;font-size:16px;cursor:pointer;";
                toggleBtn.addEventListener("click", () => {
                    let contentDiv = widget.querySelector('.glad-content');
                    if (contentDiv.style.display === "none") {
                        contentDiv.style.display = "block";
                        widget.style.width = WIDGET_WIDTH + "px";
                        toggleBtn.textContent = "–";
                    } else {
                        contentDiv.style.display = "none";
                        widget.style.width = WIDGET_MINI_WIDTH + "px";
                        toggleBtn.textContent = "+";
                    }
                });

                header.appendChild(toggleBtn);
                widget.appendChild(header);

                let contentDiv = document.createElement('div');
                contentDiv.className = "glad-content";
                contentDiv.style.padding = "14px";
                contentDiv.innerHTML = `
                    ${content}
                    <div style="margin-top: 10px; font-size: 11px; color: #aaa;">
                        Дані з <a href="${gladiatorUrl}" target="_blank" style="color: #ffcc66;">Gladiator.tf</a>
                    </div>
                `;
                widget.appendChild(contentDiv);

                document.body.appendChild(widget);
            }
        });
    }

    const button = document.createElement('button');
    button.textContent = "Show Gladiator.tf statistics";
    button.style.position = 'fixed';
    button.style.top = '45px';
    button.style.right = '90px';
    button.style.zIndex = '10000';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#ff9900';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.color = '#000';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    button.addEventListener('click', () => {
        waitForItemName(loadStats);
        button.style.display = 'none';
    });

    document.body.appendChild(button);

})();
