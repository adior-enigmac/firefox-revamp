// ==UserScript==
// @name           firefox-revamp
// @description    Zen-style: nav buttons + tabs left, actions right in the
//                 one-liner; the URL bar is a FLOATING PALETTE in the CENTER
//                 OF THE SCREEN (Ctrl+L / dblclick-tab), invisible idle:
//                 [ back fwd reload ] [ tabs ] …spring… [ pinned ext ][ ext ][ ☰ ]
// @include        main
// @ignorecache
// ==/UserScript==

(() => {
  console.log("[revamp] evaluating");

  // --- Vertical-tabs mode awareness -----------------------------------------
  // GROUND-UP CONTRACT: STOCK owns vertical mode — its sidebar, the strip's
  // orientation (browser-sidebar.js toggleTabstrip() sets orient="vertical"
  // on the element itself), pinned tabs, the launcher. We never touch the
  // strip in that mode; we only move the nav-bar CONTROLS into rows above it
  // (syncControlsHome below). On the way back to horizontal, stock drops the
  // strip into #TabsToolbar (hidden by our CSS) and we instantly re-home it
  // into the nav-bar target.
  const Services =
    globalThis.Services ??
    ChromeUtils.importESModule("resource://gre/modules/Services.sys.mjs").Services;

  const isVerticalTabs = () => {
    try { return Services.prefs.getBoolPref("sidebar.verticalTabs", false); }
    catch { return false; }
  };

  // --- Part 1: move the tab strip into the nav bar so tabs sit in the middle ---
  // The nav bar already contains [back fwd reload] … [padlock shield star] …
  // [extensions] [menu]. By relocating #tabbrowser-tabs into the nav bar's
  // customization target and using CSS `order`, we interleave tabs between the
  // reload button and the security icons. Firefox supports relocating the tab
  // container (vertical tabs does the same), and id-based lookups keep working.
  const relocateTabs = () => {
    if (isVerticalTabs()) return false;   // stock's sidebar owns the strip now
    const tabs = document.getElementById("tabbrowser-tabs");
    const target = document.getElementById("nav-bar-customization-target");
    if (!tabs || !target) return false;
    // already moved?
    if (tabs.parentElement === target) return true;
    // Insert as first child; CSS `order` will position it. Use the reference
    // node so we don't disturb the tabs custom element's connected state more
    // than necessary.
    target.insertBefore(tabs, target.firstChild);
    // Hide the now-empty original TabsToolbar via a marker attribute.
    document.documentElement.setAttribute("uc-tabs-in-navbar", "true");
    console.log("[revamp] relocated tab strip into nav bar");
    return true;
  };

  // Re-home the strip into the one-liner AFTER a toggle back to horizontal —
  // anywhere else (#TabsToolbar = hidden by our CSS) the tabs would be lost.
  // No-op while vertical mode is on: stock's sidebar owns the strip there.
  const ensureTabHome = () => {
    if (isVerticalTabs()) return;
    const tabs = document.getElementById("tabbrowser-tabs");
    const target = document.getElementById("nav-bar-customization-target");
    if (!tabs || !target || tabs.parentElement === target) return;
    target.insertBefore(tabs, target.firstChild);
    document.documentElement.setAttribute("uc-tabs-in-navbar", "true");
    console.log("[revamp] re-homed tab strip after toggle");
    try { remeasure(); } catch {}
  };

  // --- Vertical-mode CONTROLS: bring the buttons into stock's sidebar ----
  // While vertical mode is on, the nav bar collapses to 0 height, so its
  // controls would vanish with it. We move them into stock's OWN strip area
  // (#vertical-tabs — the element CustomizableUI uses for the strip widget),
  // in two rows around the strip:
  //   #uc-vt-top  [◀][▶][⟳][🧩][☰]       (above the strip)
  //   #uc-vt-ext        [pinned ext…]    (below the strip)
  // The rows are real <toolbar> elements: stock's button design (padding,
  // rounded hover/active background, focus ring) is keyed on
  // `toolbar .toolbarbutton-1`, and #vertical-tabs is a plain <box> — without
  // a toolbar ancestor the buttons lose that look. Rows flex-wrap, so the
  // layout follows the sidebar's width (collapsed rail → one icon per line).
  // The ext row is right-aligned.
  // Exact original slots are remembered and restored on toggle-off. Plain
  // DOM moves are safe: toolbar buttons keep all their listeners (stock
  // itself moves nodes like this in toggleTabstrip/initializeForTabsOrientation).
  const CTRL_HOME = new Map(); // node -> { parent, next } original slot
  const ROW_TOP_ID = "uc-vt-top";
  const ROW_EXT_ID = "uc-vt-ext";
  const TOP_IDS = [
    "back-button", "forward-button", "stop-reload-button",
    "unified-extensions-button", "PanelUI-button",
  ];

  // Some stock buttons have NO listeners of their own: navigator-toolbox.js
  // delegates their mousedown/keypress from #navigator-toolbox (e.g. 🧩 →
  // gUnifiedExtensions.togglePanel). Moved into the sidebar they sit outside
  // the toolbox and go dead, so the rows forward those events to the same
  // stock handlers. (back/forward/reload use command attributes, ☰ and
  // extension browser-actions carry their own listeners — unaffected.)
  const DELEGATED = {
    "unified-extensions-button": e => window.gUnifiedExtensions?.togglePanel(e),
  };
  const forwardDelegated = e => {
    if (e.type === "keypress" && e.key !== "Enter" && e.key !== " ") return;
    const btn = e.target.closest?.(Object.keys(DELEGATED).map(id => "#" + id).join(","));
    if (btn) DELEGATED[btn.id](e);
  };

  const ensureRow = (stripArea, id) => {
    let row = document.getElementById(id);
    if (!row) {
      row = document.createXULElement("toolbar");
      row.id = id;
      row.className = "uc-vt-row";
      row.setAttribute("mode", "icons");
      row.addEventListener("mousedown", forwardDelegated);
      row.addEventListener("keypress", forwardDelegated, { capture: true });
    }
    if (row.parentElement !== stripArea) stripArea.prepend(row);
    return row;
  };

  // --- Vertical-mode: hide stock's ⚙ "Customize sidebar" button -----------
  // It lives in <sidebar-main>'s shadow DOM (.tools-and-extensions),
  // unreachable for userChrome CSS, so a sheet is adopted into the shadow
  // root. The tools group's whole wrapper (+ its splitter) hides only when
  // customize was its sole button, so tools the user adds later still show.
  // Customize stays reachable from the sidebar's right-click menu.
  // `.bottom-actions` exists only in horizontal mode — that state is untouched.
  const CUSTOMIZE_VIEW = "viewCustomizeSidebar";
  const SHADOW_CSS = `
    .tools-and-extensions > moz-button[view="${CUSTOMIZE_VIEW}"] { display: none !important; }
    .wrapper:not(:has(.tools-and-extensions:not(.overflow-button) > moz-button:not([view="${CUSTOMIZE_VIEW}"])))
      > :is(.buttons-wrapper:not(:has(.bottom-actions)), #sidebar-tools-and-extensions-splitter) {
      display: none !important;
    }`;
  let shadowSheet = null;

  const adoptShadowSheet = () => {
    const root = document.querySelector("sidebar-main")?.shadowRoot;
    if (!root) return;
    if (!shadowSheet) {
      shadowSheet = new CSSStyleSheet();
      shadowSheet.replaceSync(SHADOW_CSS);
    }
    if (!root.adoptedStyleSheets.includes(shadowSheet)) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, shadowSheet];
    }
  };

  const moveInto = (row, node) => {
    if (!node || node.parentElement === row) return;
    if (!CTRL_HOME.has(node)) {
      CTRL_HOME.set(node, { parent: node.parentElement, next: node.nextSibling });
    }
    row.appendChild(node);
    console.log(`[revamp] moved ${node.id || node.localName} into ${row.id}`);
  };

  const syncControlsHome = () => {
    const stripArea = document.getElementById("vertical-tabs");
    if (isVerticalTabs() && stripArea) {
      // row placement around the strip is CSS `order` (top above, ext below)
      const extRow = ensureRow(stripArea, ROW_EXT_ID);
      const topRow = ensureRow(stripArea, ROW_TOP_ID);
      for (const id of TOP_IDS) moveInto(topRow, document.getElementById(id));
      adoptShadowSheet();
      // ONLY the extension buttons already pinned in the
      // one-liner. The extension query is scoped to the nav-bar target:
      // `.unified-extensions-item` also names the ALL-EXTENSIONS panel's
      // list rows (name+description card markup) — grabbing one of those
      // drags the panel mess into the sidebar. Pinned browser-actions live
      // in the target; panel rows never do. DIRECT children only: the pinned
      // toolbaritem wrapper also contains its own .webextension-browser-action
      // button (…-BAP); a descendant query moves that button out of its
      // wrapper on its own, splitting one extension into two sidebar cells.
      for (const node of document.querySelectorAll(
        "#nav-bar-customization-target > .webextension-browser-action," +
          " #nav-bar-customization-target > .unified-extensions-item"
      )) {
        moveInto(extRow, node);
      }
    } else {
      // Restore from the MAP, not a re-derived id list: after the move the
      // nodes sit in the sidebar, so looking them up in the nav bar would
      // miss them and leave them stranded in the (now-hidden) strip area.
      // The saved `next` is often ANOTHER moved control (back's next is
      // forward) that is still in the sidebar — insertBefore() with a
      // reference outside the parent throws NotFoundError, which aborted the
      // loop and stranded every control in the hidden strip area. So: use
      // `next` only while it's really a child of the home parent, and run two
      // passes — the first brings everything home, the second puts each node
      // back before a neighbour that has meanwhile returned too.
      // Only nodes still sitting in OUR rows are ours to restore. Stock may
      // have moved one meanwhile — unpinning an extension in vertical mode
      // sends it to the extensions panel — and "restoring" that one would
      // drag it out of the panel into the one-liner, among the tabs.
      for (const node of CTRL_HOME.keys()) {
        if (!node.parentElement?.classList.contains("uc-vt-row")) CTRL_HOME.delete(node);
      }
      const fallback = document.getElementById("nav-bar-customization-target");
      for (let pass = 0; pass < 2; pass++) {
        for (const [node, home] of CTRL_HOME) {
          const parent = home.parent?.isConnected ? home.parent : fallback;
          if (!parent) continue;
          const next = home.next?.parentNode === parent ? home.next : null;
          if (node.parentElement === parent && (!next || node.nextSibling === next)) continue;
          try {
            parent.insertBefore(node, next);
            if (pass === 0) console.log(`[revamp] restored ${node.id || node.localName} to nav bar`);
          } catch (err) {
            console.warn(`[revamp] restore failed for ${node.id || node.localName}`, err);
          }
        }
      }
      // drop the rows — only once nothing is left in them, so a failed
      // restore can never take a control down with its row
      for (const id of [ROW_TOP_ID, ROW_EXT_ID]) {
        const row = document.getElementById(id);
        if (row && !row.children.length) row.remove();
      }
    }
  };

  // --- Fix: auto-hide the sidebar when switching VERTICAL -> HORIZONTAL ----
  // KNOWN FIREFOX BEHAVIOUR: entering horizontal mode RE-SHOWS the sidebar
  // launcher (the icon strip): on the orientation switch the verticalTabs pref
  // observer (browser-sidebar.js) normalizes visibility to "hide-on-close"
  // and calls _state.updateVisibility(true, false). hide() only closes the
  // panel and no-ops when it's already closed, so the leftover the user sees
  // is the LAUNCHER, not the panel. Fx159 drives it with
  // _state.updateVisibility(false) — the same call stock's own "Hide sidebar"
  // context-menu item makes (sidebar-main.mjs) — so we use that (idempotent;
  // the sidebar button can still reopen it on demand). The old
  // `_state.userLauncherVisible` property no longer exists in Fx159, so
  // setting it silently did nothing.
  const hideSidebarOnHorizontal = () => {
    if (isVerticalTabs()) return;                 // only acts on the way back to horizontal
    const sc = window.SidebarController;
    if (!sc || !sc._state) {
      console.warn("[revamp] SidebarController._state unavailable");
      return false;
    }
    try { sc.hide(); } catch {}                    // close any open panel (no-op if none)
    try {
      if (!sc._state.launcherVisible) return true; // already hidden
      sc._state.updateVisibility(false);           // hide the launcher strip
    } catch (e) { console.warn("[revamp] launcher hide failed:", e); return false; }
    console.log("[revamp] hid sidebar launcher on horizontal");
    return true;
  };

  const attachTabHomeWatch = () => {
    // 1) DOM watch — stock's vertical-tabs toggle PHYSICALLY moves
    //    #tabbrowser-tabs between #vertical-tabs (its sidebar area) and
    //    #TabsToolbar: a childList mutation on those parents fires regardless
    //    of internal timing. ensureTabHome() decides per-mode whether to act.
    const syncAll = () => { ensureTabHome(); syncControlsHome(); };
    const mo = new MutationObserver(syncAll);
    for (const id of [
      "vertical-tabs", "sidebar-container", "nav-bar",
      "nav-bar-customization-target", "TabsToolbar",
      "sidebar-box", "sidebar", "tabbrowser-tabbox",
    ]) {
      const el = document.getElementById(id);
      if (el) mo.observe(el, { childList: true });
    }
    // 2) pref watch (backstop + instant reaction) — stock sometimes moves
    //    the nodes a beat AFTER the pref flips; recheck a few times.
    const onPref = () => {
      syncAll();
      setTimeout(syncAll, 50);
      setTimeout(syncAll, 300);
      // Firefox re-shows the launcher when entering horizontal (mode-entry is
      // async), so hide it a few times to land after its own update settles.
      if (!isVerticalTabs()) {
        setTimeout(hideSidebarOnHorizontal, 200);
        setTimeout(hideSidebarOnHorizontal, 600);
        setTimeout(hideSidebarOnHorizontal, 1100);
      }
    };
    Services.prefs.addObserver("sidebar.verticalTabs", onPref);
    window.addEventListener("unload", () => {
      try { Services.prefs.removeObserver("sidebar.verticalTabs", onPref); } catch {}
      mo.disconnect();
    }, { once: true });
    syncAll();   // initial state (started in vertical mode?)
    console.log("[revamp] vertical-tabs re-home watch attached");
  };

  // --- Part 2: measure the FLOATING urlbar palette → CSS vars -------------
  // The palette centers itself with pure CSS (position:fixed, left:50% of
  // the viewport). JS only REPORTS its exact box so the position:fixed
  // suggestions view lands pixel-identical under it — SAME left and,
  // especially, SAME WIDTH (--uc-fx-w = the query field's width) — using
  // viewport coords. Nothing depends on tab geometry anymore.
  const measureField = () => {
    const target = document.getElementById("nav-bar-customization-target");
    const field = document.getElementById("urlbar-container");
    if (!target || !field) return false;
    const t = field.getBoundingClientRect();
    // IGNORE not-yet-laid-out rects (idle = the hidden 0×0 box) — keep the
    // previous (valid) vars; the ResizeObserver re-fires once the palette
    // is shown
    if (t.width < 10 || t.height < 10) return false;
    const s = target.style;
    // viewport coords: the view is position:fixed, so its left/top must be
    // measured against the viewport, not the target
    s.setProperty("--uc-fx-x", Math.round(t.left) + "px");
    s.setProperty("--uc-fx-y", Math.round(t.top) + "px");
    s.setProperty("--uc-fx-w", Math.round(t.width) + "px");
    s.setProperty("--uc-fx-h", Math.round(t.height) + "px");
    return true;
  };

  // Re-measure whenever geometry can change — PLUS a short chain of settling
  // re-measures (the first read can race initial layout/zoom; the chain
  // self-corrects until stable).
  let lastSettle = 0;
  const remeasure = () => {
    try { measureField(); } catch {}
    const now = Date.now();
    if (now - lastSettle < 60) return;
    lastSettle = now;
    const again = () => { try { measureField(); } catch {} };
    requestAnimationFrame(again);
    setTimeout(again, 80);
    setTimeout(again, 250);
    setTimeout(again, 600);
  };
  const attachMeasure = () => {
    remeasure();
    // the pill moves/resizes with the window (left:50% + clamp(…38vw…))
    window.addEventListener("resize", remeasure);
    // measure right when the urlbar is about to be shown — must be "focusin"
    // (bubbles from the inner input); plain "focus" never fires on the wrapper
    const urlbar = document.getElementById("urlbar");
    if (urlbar) {
      urlbar.addEventListener("focusin", remeasure);
      urlbar.addEventListener("popupshown", remeasure);
    }
    // pill box changes with viewport width / density / zoom — observe the
    // FIELD itself (tab geometry no longer matters: the pill never moves
    // with tabs)
    const field = document.getElementById("urlbar-container");
    if (field) new ResizeObserver(remeasure).observe(field);
    console.log("[revamp] field measurement attached");
  };

  // --- Part 3: double-click a tab = Ctrl+L (focus the address bar) --------
  // Focus the address bar the same way Ctrl+L does. Synchronous: the "focusin"
  // listener re-measures the palette before it paints.
  const focusUrlbar = () => {
    try {
      gURLBar.focus();
      gURLBar.select();
      console.log("[revamp] urlbar focused");
      return true;
    } catch (err) {
      console.log("[revamp] urlbar focus failed", err);
      return false;
    }
  };

  const attachDblClick = () => {
    const gB = window.gBrowser;
    const tc = gB.tabContainer;
    tc.addEventListener("dblclick", (e) => {
      // don't hijack the close button / mute overlay
      if (e.target.closest?.(".tab-close-button, .tab-icon-overlay")) return;
      const tab = e.target.closest?.(".tabbrowser-tab");
      if (!tab) {
        // empty strip space → new tab. Stock on_dblclick bails in horizontal
        // mode with a custom titlebar (defers to the WM's titlebar action),
        // so only cover that case; vertical mode already works natively.
        if (
          e.button === 0 &&
          CustomTitlebar.enabled &&
          !tc.verticalMode &&
          e.target === tc.arrowScrollbox &&
          e.composedTarget?.localName !== "toolbarbutton" &&
          !tc._blockDblClick
        ) {
          BrowserCommands.openTab();
          e.preventDefault();
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (tab !== gB.selectedTab) gB.selectedTab = tab; // TabSelect → remeasure
      focusUrlbar();
    });
    console.log("[revamp] double-click → urlbar attached");
  };

  const attach = () => {
    const gB = window.gBrowser;
    if (!gB) return;
    relocateTabs();
    attachTabHomeWatch();
    attachMeasure();
    attachDblClick();
    console.log("[revamp] attached");
  };

  const UC = window.UC_API;
  if (UC?.Runtime?.startupFinished) {
    UC.Runtime.startupFinished().then(attach);
  } else if (window.gBrowser) {
    attach();
  } else {
    let tries = 0;
    const t = setInterval(() => {
      if (window.gBrowser || ++tries > 100) { clearInterval(t); attach(); }
    }, 100);
  }
})();
