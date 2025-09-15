// ==UserScript==
// @name        Revert Naver Blog Reaction Button
// @namespace   Revert Naver Blog Reaction Button Script
// @description Add-on script to revert Naver Blog's reaction button icon back to the previous "zero face" icon when the button is in the "off" state (not reacted).
// @match       https://blog.naver.com/*
// @match       https://section.blog.naver.com/*
// @downloadURL https://raw.githubusercontent.com/potatosalad775/revertNBlogReactionBtn/main/revertNBlogReactionBtn.user.js
// @updateURL   https://raw.githubusercontent.com/potatosalad775/revertNBlogReactionBtn/main/revertNBlogReactionBtn.user.js
// @grant       none
// @version     1.0.1
// @author      potatosalad775
// @run-at      document-end
// ==/UserScript==

(() => {
  "use strict";

  const HOST = location.host;

  // Build host-scoped selector list
  const selectors = [];
  if (HOST === "section.blog.naver.com") {
    selectors.push(".list_post_article .u_likeit_list_module .u_likeit_button"); // reactionBtnSection
  } else if (HOST === "blog.naver.com") {
    selectors.push(
      ".post-btn .wrap_postcomment .area_sympathy > .like_area .u_likeit_list_module .u_likeit_button", // reactionBtnPost
      ".floating_bottom .wrap_postcomment .area_sympathy > .like_area .u_likeit_list_module .u_likeit_button" // reactionBtnFloating
    );
  }

  if (selectors.length === 0) return; // Not a matched host

  const BUTTONS_SEL = selectors.join(",");
  const ICONS_SEL = ".u_likeit_icons";
  const INJECTED_CLASS = "__zeroface_injected";

  function ensureInjected(parentEl) {
    if (!parentEl) return null;
    let injected = parentEl.querySelector(`.${INJECTED_CLASS}`);
    if (!injected) {
      injected = document.createElement("span");
      injected.className = `u_likeit_icon _icons __reaction__zeroface ${INJECTED_CLASS}`;
      injected.setAttribute("style", "margin-right: 5px;");
      injected.setAttribute("data-like-click-area", "face.release");
      if (parentEl.querySelector(".u_likeit_text"))
        parentEl.insertBefore(
          injected,
          parentEl.querySelector(".u_likeit_text")
        );
      else parentEl.appendChild(injected);
    }
    return injected;
  }

  function revertIfOff(btn) {
    if (!btn || !(btn instanceof Element)) return;
    if (!btn.matches(BUTTONS_SEL)) return;
    if (!btn.classList.contains("off")) return;
    const icons = btn.querySelector(ICONS_SEL);
    if (!icons) return;
    const parent = icons.parentElement;
    const injected = ensureInjected(parent);
    if (injected) injected.style.removeProperty("display");
    icons.style.setProperty("display", "none", "important");
  }

  function revertIfOn(btn) {
    if (!btn || !(btn instanceof Element)) return;
    if (!btn.matches(BUTTONS_SEL)) return;
    if (btn.classList.contains("off")) return;
    const icons = btn.querySelector(ICONS_SEL);
    if (!icons) return;
    const parent = icons.parentElement;
    const injected = parent ? parent.querySelector(`.${INJECTED_CLASS}`) : null;
    icons.style.removeProperty("display");
    if (injected) injected.style.setProperty("display", "none", "important");
  }

  function updateButtonView(btn) {
    if (!(btn instanceof Element) || !btn.matches(BUTTONS_SEL)) return;
    if (btn.classList.contains("off")) revertIfOff(btn);
    else revertIfOn(btn);
  }

  function closestButtonFromIcon(node) {
    if (!(node instanceof Element)) return null;
    // Some structures may have icons inside the button or just next to it within module
    const button =
      node.closest(BUTTONS_SEL) ||
      node.parentElement?.closest?.(BUTTONS_SEL) ||
      null;
    return button;
  }

  function scanAll() {
    document.querySelectorAll(BUTTONS_SEL).forEach(updateButtonView);
  }

  // Initial pass once DOM is ready enough
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanAll, { once: true });
  } else {
    scanAll();
  }

  // Observe changes: new nodes, subtree, and class changes on like buttons
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes") {
        // class changes on buttons potentially toggle on/off
        if (m.target instanceof Element) {
          if (m.target.matches(BUTTONS_SEL)) {
            updateButtonView(m.target);
          } else if (m.target.matches(ICONS_SEL)) {
            const btn = closestButtonFromIcon(m.target);
            if (btn) updateButtonView(btn);
          }
        }
        continue;
      }

      // childList: check added nodes and their descendants minimally
      if (m.type === "childList") {
        if (m.addedNodes && m.addedNodes.length) {
          for (const node of m.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.matches && node.matches(BUTTONS_SEL)) {
              updateButtonView(node);
              continue;
            }
            // If new icon container appears or is rewritten, map back to button
            if (node.matches && node.matches(ICONS_SEL)) {
              const btn = closestButtonFromIcon(node);
              if (btn) updateButtonView(btn);
            }
            // query within newly added subtree for buttons
            const foundButtons = node.querySelectorAll
              ? node.querySelectorAll(BUTTONS_SEL)
              : [];
            if (foundButtons && foundButtons.length)
              foundButtons.forEach(updateButtonView);
            // query within subtree for icon containers
            const foundIcons = node.querySelectorAll
              ? node.querySelectorAll(ICONS_SEL)
              : [];
            if (foundIcons && foundIcons.length) {
              foundIcons.forEach((iconNode) => {
                const btn = closestButtonFromIcon(iconNode);
                if (btn) updateButtonView(btn);
              });
            }
          }
        }
        // Also handle characterData/innerHTML changes indirectly via target container
        if (m.target instanceof Element && m.target.matches(ICONS_SEL)) {
          const btn = closestButtonFromIcon(m.target);
          if (btn) updateButtonView(btn);
        }
      }
    }
  });

  observer.observe(document.documentElement || document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
  });
})();