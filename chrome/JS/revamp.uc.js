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

  // --- Part 4: Ctrl+Tab shows EVERY open tab ------------------------------
  // Stock draws browser.ctrlTab.maxPreviews thumbnails (default 7, clamped to
  // 49) plus a "List all N tabs" button. Instead: one preview per tab, and the
  // grid grows columns (smaller thumbnails) until all rows fit the screen.
  const attachCtrlTabAll = () => {
    const ct = window.ctrlTab;
    if (!ct) return;
    try {
      // open() rebuilds the previews whenever this differs from their count
      Object.defineProperty(ct, "maxTabPreviews", {
        configurable: true,
        get() { return Math.max(1, this.tabList?.length ?? 7); },
      });
    } catch (err) {
      console.log("[revamp] ctrlTab override failed", err);
      return;
    }

    const STOCK_PER_ROW = 7;
    const stockOpen = ct.open;
    ct.open = function (...args) {
      if (!this.isOpen) {
        // mirror stock's sizing (open / _openPanel) to pick the column count
        const n = this.tabCount;
        const aspect = window.tabPreviews?.aspectRatio ?? 0.5625;
        const maxH = screen.availHeight * 0.95;
        let cols = STOCK_PER_ROW;
        while (cols < n) {
          const cw = (screen.availWidth * 0.85) / cols;
          const rows = Math.ceil(n / cols);
          // canvas + favicon/label/padding per row, panel chrome on top
          if (rows * (cw * aspect * 1.25 + 40) + 75 <= maxH) break;
          cols++;
        }
        this.previewsPerRow = cols;
      }
      return stockOpen.apply(this, args);
    };

    // every tab is already in the grid → the "List all N tabs" button is noise
    // (set .hidden, not CSS: advanceFocus skips only [hidden] previews)
    const stockUpdate = ct.updatePreviews;
    ct.updatePreviews = function (...args) {
      const r = stockUpdate.apply(this, args);
      this.showAllButton.hidden = true;
      return r;
    };

    // arrows move through the GRID (stock only steps linearly via Tab):
    // ←/→ = previous/next, ↑/↓ = same column one row up/down (no-op at edges)
    const moveTo = (i) => {
      const p = ct.previews[i];
      if (!p || p.hidden || !p._tab) return;
      // same selection handoff as stock advanceFocus
      if (ct._selectedIndex == -1) p.focus();
      else ct._selectedIndex = i;
      gBrowser.warmupTab(p._tab);
      if (ct._timer) {
        clearTimeout(ct._timer);
        ct._timer = null;
        ct._openPanel();
      }
    };
    document.addEventListener("keydown", (e) => {
      if (!ct.isOpen) return;
      const step = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -ct.previewColumnCount,
        ArrowDown: ct.previewColumnCount,
      }[e.key];
      if (!step) return;
      e.preventDefault();
      e.stopPropagation();
      if (Math.abs(step) == 1) {
        ct.advanceFocus(step > 0);
      } else {
        moveTo(ct.previews.indexOf(ct.selected) + step);
      }
    }, true);
    // keep the overlay CENTERED on the monitor: stock positions it once from
    // an estimated height (wrong once the grid has a custom column count), and
    // the real size settles after layout / thumbnail loads
    const recenter = () => {
      const panel = ct.panel;
      if (panel.state != "open") return;
      const r = panel.getOuterScreenRect();
      if (!r.width || !r.height) return;
      panel.moveTo(
        Math.round(screen.left + (screen.width - r.width) / 2),
        Math.round(screen.top + (screen.height - r.height) / 2)
      );
    };
    ct.panel.addEventListener("popupshown", recenter);
    new ResizeObserver(recenter).observe(ct.panel);
    console.log("[revamp] ctrlTab show-all attached");
  };

  // --- Part 5: Ctrl+Alt+Z per mode ------------------------------------------
  // Stock's toggleSidebarKb runs SidebarController.handleToolbarButtonClick(),
  // whose meaning depends on sidebar.visibility: horizontal → shows/hides the
  // launcher (which our CSS never paints); vertical → expands/collapses, or
  // hides and forgets expanded-vs-rail. Instead:
  //   horizontal → hide/show the TOP BAR (revamp.topbar.hidden; CSS section F)
  //   vertical   → hide/show the sidebar, coming back exactly as it was
  //                (expanded or rail: launcherExpanded survives a hide)
  // Set through the launcherVisible setter, not updateVisibility(): that one
  // ignores `false` under "always-show" and forces expanded under
  // "hide-sidebar". Only the shortcut is rerouted: the sidebar toolbar button
  // keeps stock's.
  const TOPBAR_PREF = "revamp.topbar.hidden";
  const GLANCE_PREF = "revamp.glance";
  const prefBool = (p) => {
    try { return Services.prefs.getBoolPref(p, false); } catch { return false; }
  };

  const attachToggleKey = () => {
    const key = document.getElementById("toggleSidebarKb");
    if (!key) return;
    // target-phase listener runs before browser-sets.js's bubbling one on
    // #mainKeyset, so stopping propagation replaces the stock action
    key.addEventListener("command", (e) => {
      const sc = window.SidebarController;
      if (sc?.inSingleTabWindow || sc?.uninitializing) return;
      e.stopPropagation();
      if (!isVerticalTabs()) {
        Services.prefs.setBoolPref(TOPBAR_PREF, !prefBool(TOPBAR_PREF));
        return;
      }
      const s = sc?._state;
      if (!s) return;
      // a key press on a glance-peeked sidebar makes it stay
      if (glance.endSidebarPeek(true)) return;
      setLauncherVisible(!s.launcherVisible);
    });
    console.log("[revamp] Ctrl+Alt+Z per-mode attached");
  };

  // show/hide the vertical launcher keeping expanded-vs-rail; the open panel
  // (bookmarks…) goes with it and comes back with it, as with stock's toggle
  const setLauncherVisible = (visible) => {
    const sc = window.SidebarController;
    const s = sc._state;
    if (visible == s.launcherVisible) return;
    if (sc._animationEnabled && !window.gReduceMotion) sc._animateSidebarContainer();
    s.launcherVisible = visible;
    if (visible && s.command) sc.show(s.command);
    else if (!visible) sc.hide({ dismissPanel: false });
    sc.updateToolbarButton();
  };

  // which side the vertical launcher lives on — from the pref, not the
  // container's box: a HIDDEN launcher has an empty box at x=0, which read as
  // "start" even with the sidebar on the right
  const sidebarAtStart = () => {
    const start = Services.prefs.getBoolPref("sidebar.position_start", true);
    return getComputedStyle(document.documentElement).direction == "rtl" ? !start : start;
  };

  // --- Vertical-mode: drag-narrow snaps to the RAIL ------------------------
  // Stock snaps to collapsed only below LAUNCHER_MINIMUM_WIDTH (100px) on
  // drop — so anything dropped at ~100–240px stays a narrow EXPANDED sidebar,
  // and if the sidebar's content won't let it shrink that far (extension
  // rows, tab content) it never snaps at all. So judge the drop by where the
  // POINTER was released, not by the width the launcher managed to reach:
  // released where the sidebar would be under SNAP_WIDTH → rail, and the
  // expanded width goes back to what it was before the drag (stock stored
  // the narrow one). Runs a frame after the drop so stock's own "command"
  // handler (it re-registers on every show, so listener order isn't fixed)
  // has finished. SidebarController._state is looked up per event, NOT at
  // attach: with a restored session the sidebar finishes initializing after
  // startup, and an attach-time check silently skipped the whole snap.
  const SNAP_WIDTH = 150;
  const attachRailSnap = () => {
    const splitter = document.getElementById("sidebar-launcher-splitter");
    if (!splitter) return;
    const state = () => window.SidebarController?._state;
    let widthBefore = null, pointerX = null;
    const track = (e) => { pointerX = e.clientX; };
    splitter.addEventListener("mousedown", (e) => {
      const s = state();
      if (!s || e.button != 0) return;
      // expandedLauncherWidth is unset until the first resize: use the live one
      widthBefore = s.launcherExpanded ? s.launcherWidth : s.expandedLauncherWidth;
      pointerX = e.clientX;
      window.addEventListener("mousemove", track, true);
    });
    splitter.addEventListener("command", () => {
      window.removeEventListener("mousemove", track, true);
      requestAnimationFrame(() => {
        const s = state();
        const c = window.SidebarController?.sidebarContainer?.getBoundingClientRect();
        // width the sidebar would have with its edge under the pointer
        const wanted = c && pointerX != null
          ? Math.round(sidebarAtStart() ? pointerX - c.left : c.right - pointerX)
          : null;
        const narrow = s && (s.launcherWidth < SNAP_WIDTH || (wanted != null && wanted < SNAP_WIDTH));
        if (!isVerticalTabs() || !s?.launcherExpanded || !narrow) return;
        if (widthBefore) s.expandedLauncherWidth = widthBefore;
        s.launcherExpanded = false;
        console.log("[revamp] snapped sidebar to rail");
      });
    });
    console.log("[revamp] rail snap attached");
  };

  // --- Vertical-mode: no scrollbar on the RAIL -----------------------------
  // With enough tabs to scroll, the strip's scrollbox (arrowscrollbox shadow
  // DOM; stock tabs.css gives it scrollbar-width: thin) reserves the bar's
  // width, so the one-icon-wide rail tabs sit ~3px off the rail's centre.
  // The rail doesn't need a visible bar — wheel scrolling still works — so
  // hide it there; the expanded sidebar keeps it. Inline style, because a
  // user-sheet ::part(scrollbox) rule doesn't reach it.
  const attachRailScrollbar = () => {
    const tc = window.gBrowser.tabContainer;
    const scrollbox = tc.arrowScrollbox?.shadowRoot?.querySelector("scrollbox");
    if (!scrollbox) return;
    const sync = () => {
      if (isVerticalTabs() && !tc.hasAttribute("expanded")) {
        scrollbox.style.setProperty("scrollbar-width", "none", "important");
      } else {
        scrollbox.style.removeProperty("scrollbar-width");
      }
    };
    new MutationObserver(sync).observe(tc, { attributes: true, attributeFilter: ["expanded", "orient"] });
    sync();
    console.log("[revamp] rail scrollbar attached");
  };

  // --- Part 6: GLANCE — edge hover reveals a hidden bar ---------------------
  // Fullscreen already does this (stock FullScreen: top toggler + launcher
  // edge). With revamp.glance on (Tools menu), the same works in normal view
  // for a bar the user hid: horizontal top bar (Ctrl+Alt+Z) → top edge;
  // vertical sidebar (Ctrl+Alt+Z / right-click → Hide sidebar) → its side's
  // edge. Like
  // stock, the bar goes away again once the pointer is back in the page
  // (a 50px band next to the bar keeps it up), never while a popup from it
  // is open or the address bar is focused. Edge detection uses stock's
  // MousePosTracker (pointer position, not a hover target), and a pointer
  // already resting on the edge doesn't count as an arrival.
  // Fullscreen fallback: our top-edge watcher also calls
  // FullScreen.showNavToolbox() when stock's 1px toggler didn't.
  const glance = (() => {
    const root = document.documentElement;
    const toolbox = document.getElementById("navigator-toolbox");
    const box = (el) => window.windowUtils.getBoundsWithoutFlushing(el);
    const viewport = () => box(root);
    const NONE = { top: 0, bottom: -1, left: 0, right: -1 };
    let popups = 0;
    let sidebarPeek = false;

    const blocked = () => popups > 0 || gURLBar?.focused;
    const topbarHidden = () =>
      !isVerticalTabs() && prefBool(TOPBAR_PREF) && !window.fullScreen;
    const sidebarHidden = () => {
      const s = window.SidebarController?._state;
      return isVerticalTabs() && !window.fullScreen && s && !s.launcherVisible;
    };
    const EDGE = 5;   // px of hover strip at the window edge

    // --- top bar ---
    const topEdge = {
      getMouseTargetRect() {
        const fs = window.fullScreen && !root.hasAttribute("inDOMFullscreen");
        if (!fs && !(prefBool(GLANCE_PREF) && topbarHidden())) return NONE;
        if (root.hasAttribute("revamp-topbar-peek")) return NONE;
        return { top: 0, bottom: EDGE - 1, left: 0, right: viewport().width };
      },
      onMouseEnter() {
        if (this._suppress) return;
        if (window.fullScreen) {
          if (window.FullScreen?._isChromeCollapsed) FullScreen.showNavToolbox();
          return;
        }
        root.setAttribute("revamp-topbar-peek", "true");
        MousePosTracker.addListener(topLeave);
      },
    };
    const topLeave = {
      getMouseTargetRect() {
        const v = viewport();
        return { top: box(toolbox).height + 50, bottom: v.height, left: 0, right: v.width };
      },
      onMouseEnter() { if (!blocked()) endTopPeek(); },
    };
    const endTopPeek = () => {
      MousePosTracker.removeListener(topLeave);
      root.removeAttribute("revamp-topbar-peek");
    };

    // --- sidebar ---
    const sideEdge = {
      getMouseTargetRect() {
        if (!prefBool(GLANCE_PREF) || sidebarPeek || !sidebarHidden()) return NONE;
        const v = viewport();
        return sidebarAtStart()
          ? { top: 0, bottom: v.height, left: 0, right: EDGE - 1 }
          : { top: 0, bottom: v.height, left: v.width - EDGE, right: v.width };
      },
      onMouseEnter() {
        if (this._suppress) return;
        sidebarPeek = true;
        setLauncherVisible(true);
        MousePosTracker.addListener(sideLeave);
      },
    };
    const sideLeave = {
      getMouseTargetRect() {
        const v = viewport();
        const c = box(window.SidebarController.sidebarContainer);
        return sidebarAtStart()
          ? { top: 0, bottom: v.height, left: c.right + 50, right: v.width }
          : { top: 0, bottom: v.height, left: 0, right: c.left - 50 };
      },
      onMouseEnter() { if (!blocked()) endSidebarPeek(); },
    };
    // keep = the user made it stay (Ctrl+Alt+Z) → just forget the peek.
    // Returns whether a peek was active.
    const endSidebarPeek = (keep = false) => {
      if (!sidebarPeek) return false;
      sidebarPeek = false;
      MousePosTracker.removeListener(sideLeave);
      if (!keep) setLauncherVisible(false);
      return true;
    };

    // (re)register edge watchers, ignoring a pointer already on the edge
    const rewatch = () => {
      for (const l of [topEdge, sideEdge]) {
        MousePosTracker.removeListener(l);
        l._suppress = true;
        MousePosTracker.addListener(l);
        l._suppress = false;
      }
    };
    const reset = () => {
      endTopPeek();
      endSidebarPeek();
      rewatch();
    };

    // a popup closing may leave the pointer already in the page: re-check
    const onPopup = (e) => {
      const t = e.originalTarget;
      if (t.localName == "tooltip" || t.id == "tab-preview-panel") return;
      popups = Math.max(0, popups + (e.type == "popupshown" ? 1 : -1));
      if (e.type == "popuphidden" && !popups) {
        for (const [l, end] of [[topLeave, endTopPeek], [sideLeave, () => endSidebarPeek()]]) {
          if (l._hover) end();
        }
      }
    };

    const attachMenuItem = () => {
      const popup = document.getElementById("menu_ToolsPopup");
      if (!popup) return;
      const item = document.createXULElement("menuitem");
      item.id = "revamp-glance-menuitem";
      item.setAttribute("type", "checkbox");
      item.setAttribute("label", "Reveal Hidden Bars on Hover");
      item.addEventListener("command", () =>
        Services.prefs.setBoolPref(GLANCE_PREF, !prefBool(GLANCE_PREF)));
      popup.addEventListener("popupshowing", (e) => {
        if (e.target == popup) item.toggleAttribute("checked", prefBool(GLANCE_PREF));
      });
      popup.append(document.createXULElement("menuseparator"), item);
    };

    const attachGlance = () => {
      // toolbox height → CSS section F's collapse offset
      new ResizeObserver(() =>
        root.style.setProperty("--revamp-toolbox-h", toolbox.offsetHeight + "px")
      ).observe(toolbox);
      document.addEventListener("popupshown", onPopup);
      document.addEventListener("popuphidden", onPopup);
      for (const p of [TOPBAR_PREF, GLANCE_PREF, "sidebar.verticalTabs"]) {
        Services.prefs.addObserver(p, reset);
      }
      window.addEventListener("fullscreen", () => setTimeout(reset, 0));
      window.addEventListener("unload", () => {
        for (const p of [TOPBAR_PREF, GLANCE_PREF, "sidebar.verticalTabs"]) {
          try { Services.prefs.removeObserver(p, reset); } catch {}
        }
      }, { once: true });
      attachMenuItem();
      rewatch();
      console.log("[revamp] glance attached");
    };

    return { attachGlance, endSidebarPeek };
  })();

  const attach = () => {
    const gB = window.gBrowser;
    if (!gB) return;
    relocateTabs();
    attachTabHomeWatch();
    attachMeasure();
    attachDblClick();
    attachCtrlTabAll();
    attachToggleKey();
    attachRailSnap();
    attachRailScrollbar();
    glance.attachGlance();
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
