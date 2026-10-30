// =============================================================================
// firefox-revamp — OPTIONAL privacy / de-telemetry / performance prefs
//
// NOT needed for the UI. This is the author's personal user.js, tuned for a
// low-end Linux machine (8 GB RAM, 2-core CPU, Intel iGPU, NVMe). Apply it with
//   ./install.sh --privacy-prefs
// or append the lines you want to <profile>/user.js yourself.
//
// READ BEFORE USING — some lines trade safety for privacy/speed:
//   • extensions.blocklist.enabled = false  → Firefox no longer blocks known
//     MALICIOUS add-ons
//   • browser.safebrowsing.* = false        → no phishing / malware warnings
//   • security.OCSP.enabled = 0             → no live certificate revocation
//     checks (CRLite still on)
//   • network.trr.mode = 3                  → DNS-over-HTTPS ONLY, no fallback:
//     if the DoH resolver is unreachable, name lookups fail
//   • dom.security.https_only_mode = true   → plain-http sites need a click-through
//   • spellchecker.dictionary_path          → Arch/CachyOS hunspell location
// Delete any line you don't want. user.js re-applies its values on every start.
// =============================================================================

user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
/* Oneliner: put nav-bar (arrows/url/ext) on the LEFT, tabs on the RIGHT */
user_pref("userchrome.navbar-tabs-oneliner.tabs-on-right.enabled", true);


/* ============================================================
   Replacement for removed package: cachyos-firefox-settings
   Written: 2026-10-29
   Machine: 8 GB RAM · Intel i3-6100 (2C/4T) · Intel HD 530 iGPU · NVMe SSD

   WHAT CHANGED vs the CachyOS package:
     - KEPT  the privacy / telemetry / anti-sponsor hardening (unchanged).
     - KEPT  DoH (TRR-first) and Safe-Browsing-off stance of the package.
     - DROPPED the "performance" tweaks that actively hurt THIS machine:
         · disk cache disabled          -> re-enabled (you have a fast NVMe)
         · 1 GB mem cache + 3 GB media cache -> removed (too big for 8 GB RAM)
         · huge canvas/skia caches      -> removed (RAM hogs)
         · forced WebRender.all         -> removed (let Firefox auto-tune iGPU)
         · forced HW video decoding     -> removed (HD 530 has no AV1; force can glitch)
         · JIT thresholds 50/500        -> removed (forces costly recompiles on weak CPU)
         · max-connections 1800         -> removed (default 900; 1800 = overhead on 2 cores)
     - ADDED tab-unload-on-low-memory (helps 8 GB).
   Nothing here is "locked"; user.js re-applies on each launch (editable in about:config
   until restart). Safe-Browsing stays OFF to match the package — uBO covers badware/phishing.
   ============================================================ */

/* ---- Locale / integration (kept) ---- */
user_pref("intl.locale.requested", "");
user_pref("spellchecker.dictionary_path", "/usr/share/hunspell");
user_pref("extensions.autoDisableScopes", 11);
user_pref("browser.shell.checkDefaultBrowser", false);

/* ---- GPU: keep light, do NOT force heavy paths on HD 530 ---- */
user_pref("media.webrtc.hw.h264.enabled", true);
user_pref("media.gpu-process-decoder", true);
user_pref("layers.gpu-process.enabled", true);
user_pref("gfx.webrender.precache-shaders", true);
user_pref("gfx.webrender.program-binary-disk", true);
/* NOTE: deliberately NOT setting gfx.webrender.all, and NOT force-enabling
   media.hardware-video-decoding — Firefox auto-detects what HD 530 supports. */

/* ---- Caches: sensible for 8 GB RAM + NVMe (disk cache ON) ---- */
user_pref("browser.cache.disk.enable", true);
user_pref("image.cache.size", 10485760);            /* 10 MB decoded image cache: reasonable */
user_pref("image.mem.shared.unmap.min_expiration_ms", 120000);
user_pref("media.cache_readahead_limit", 7200);
user_pref("media.cache_resume_threshold", 3600);
user_pref("network.buffer.cache.size", 65535);
user_pref("network.ssl_tokens_cache_capacity", 32768);
/* NOTE: dropped browser.cache.memory.capacity (1 GB), media.memory_cache_max_size (1 GB),
   media.memory_caches_combined_limit_kb (3 GB), canvas/skia caches — all too big for 8 GB.
   Firefox now auto-manages memory cache, which suits low-RAM better. */

/* ---- CRLite / OCSP (kept: fewer connections, good for weak CPU) ---- */
user_pref("security.OCSP.enabled", 0);
user_pref("security.pki.crlite_mode", 2);
user_pref("security.remote_settings.crlite_filters.enabled", true);
user_pref("services.settings.poll_interval", 300);

/* ============================================================
   PRIVACY / DE-TELEMETRY  (kept verbatim from the CachyOS package)
   ============================================================ */
user_pref("app.normandy.api_url", "");
user_pref("app.normandy.enabled", false);
user_pref("breakpad.reportURL", "");
user_pref("browser.contentanalysis.default_result", 0);
user_pref("browser.contentanalysis.enabled", false);
user_pref("browser.contentblocking.report.hide_vpn_banner", true);
user_pref("browser.contentblocking.report.lockwise.enabled", false);
user_pref("browser.contentblocking.report.monitor.enabled", false);
user_pref("browser.contentblocking.report.show_mobile_app", false);
user_pref("browser.crashReports.unsubmittedCheck.autoSubmit2", false);
user_pref("browser.dataFeatureRecommendations.enabled", false);
user_pref("browser.discovery.enabled", false);
user_pref("browser.ipProtection.enabled", false);
user_pref("browser.ml.chat.enabled", false);
user_pref("browser.ml.chat.page", false);
user_pref("browser.ml.enable", false);
user_pref("browser.ml.linkPreview.enabled", false);
user_pref("browser.newtabpage.activity-stream.feeds.aboutpreferences", false);
user_pref("browser.newtabpage.activity-stream.feeds.adsfeed", false);
user_pref("browser.newtabpage.activity-stream.feeds.discoverystreamfeed", false);
user_pref("browser.newtabpage.activity-stream.feeds.places", false);
user_pref("browser.newtabpage.activity-stream.feeds.recommendationprovider", false);
user_pref("browser.newtabpage.activity-stream.feeds.system.topsites", false);
user_pref("browser.newtabpage.activity-stream.feeds.system.topstories", false);
user_pref("browser.newtabpage.activity-stream.feeds.topsites", false);
user_pref("browser.newtabpage.activity-stream.showSponsoredCheckboxes", false);
user_pref("browser.newtabpage.activity-stream.system.showSponsored", false);
user_pref("browser.newtabpage.activity-stream.unifiedAds.adsFeed.enabled", false);
user_pref("browser.newtabpage.activity-stream.unifiedAds.adsFeed.spocs.enabled", false);
user_pref("browser.newtabpage.activity-stream.unifiedAds.adsFeed.tiles.enabled", false);
user_pref("browser.newtabpage.activity-stream.unifiedAds.spocs.enabled", false);
user_pref("browser.newtabpage.activity-stream.unifiedAds.tiles.enabled", false);
user_pref("browser.newtabpage.enabled", true);  /* re-enable the NTP itself; every activity-stream feed/sponsor/pocket toggle stays OFF -> clean search + logo only */
user_pref("browser.newtabpage.activity-stream.showSearch", false);  /* hide the search box on the new tab (leaves just the logo/background) */
user_pref("browser.places.interactions.enabled", false);
user_pref("browser.privatebrowsing.vpnpromourl", "");
user_pref("browser.promo.cookiebanners.enabled", false);
user_pref("browser.promo.focus.enabled", false);
user_pref("browser.promo.pin.enabled", false);
user_pref("browser.protections_panel.infoMessage.seen", true);
user_pref("browser.send_to_device_locales", "");
user_pref("browser.tabs.crashReporting.sendReport", false);
user_pref("browser.tabs.groups.smart.userEnabled", false);
user_pref("browser.uitour.enabled", false);
user_pref("browser.urlbar.quicksuggest.enabled", false);
user_pref("browser.urlbar.suggest.addons", false);
user_pref("browser.urlbar.suggest.quicksuggest.fakespot", false);
user_pref("browser.urlbar.suggest.quicksuggest.nonsponsored", false);
user_pref("browser.urlbar.suggest.quicksuggest.sponsored", false);
user_pref("browser.urlbar.suggest.quicksuggest.topsites", false);
user_pref("browser.urlbar.suggest.trending", false);
user_pref("browser.vpn_promo.enabled", false);
user_pref("captivedetect.canonicalURL", "");
user_pref("cookiebanners.ui.desktop.showCallout", false);
user_pref("devtools.debugger.remote-enabled", false);
user_pref("dom.private-attribution.submission.enabled", false);
user_pref("dom.push.enabled", false);
user_pref("dom.security.unexpected_system_load_telemetry_enabled", false);
user_pref("extensions.abuseReport.enabled", false);
user_pref("extensions.blocklist.enabled", false);
user_pref("extensions.getAddons.showPane", false);
user_pref("extensions.htmlaboutaddons.recommendations.enabled", false);
user_pref("extensions.pocket.enabled", false);
user_pref("extensions.webcompat-reporter.enabled", false);
user_pref("media.gmp-gmpopenh264.autoupdate", false);
user_pref("signon.firefoxRelay.feature", "disabled");

/* ---- New-tab / activity-stream telemetry + ads ---- */
user_pref("browser.newtabpage.activity-stream.feeds.telemetry", false);
user_pref("browser.newtabpage.activity-stream.showSponsored", false);
user_pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
user_pref("browser.newtabpage.activity-stream.telemetry", false);
user_pref("browser.newtabpage.activity-stream.telemetry.ut.event", false);
user_pref("browser.newtabpage.activity-stream.trendingSearch.blockedAds", "");
user_pref("browser.newtabpage.activity-stream.trendingSearch.enabled", false);
user_pref("browser.newtabpage.activity-stream.trendingSearch.variant", "");

/* ---- URL-bar feature gates (sponsored / shopping / weather etc.) ---- */
user_pref("browser.urlbar.addons.featureGate", false);
user_pref("browser.urlbar.fakespot.featureGate", false);
user_pref("browser.urlbar.mdn.featureGate", false);
user_pref("browser.urlbar.pocket.featureGate", false);
user_pref("browser.urlbar.weather.featureGate", false);
user_pref("browser.urlbar.yelp.featureGate", false);

/* ---- Broader telemetry kill-switch ---- */
user_pref("browser.ping-centre.telemetry", false);
user_pref("browser.search.serpEventTelemetryCategorization.enabled", false);
user_pref("browser.search.serpEventTelemetryCategorization.regionEnabled", false);
user_pref("browser.search.update", false);
user_pref("browser.shopping.experience2023.enabled", false);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("datareporting.healthreport.uploadEnabled", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("datareporting.usage.uploadEnabled", false);
user_pref("extensions.addonAbuseReport.url", "");
user_pref("extensions.getAddons.cache.enabled", false);
user_pref("network.captive-portal-service.enabled", false);
user_pref("network.connectivity-service.enabled", false);
user_pref("network.traffic_analyzer.enabled", false);
user_pref("network.trr.confirmation_telemetry_enabled", false);
user_pref("security.certerrors.recordEventTelemetry", false);
user_pref("toolkit.contentRelevancy.enabled", false);
user_pref("toolkit.coverage.endpoint.base", "");
user_pref("toolkit.coverage.opt-out", true);
user_pref("toolkit.telemetry.archive.enabled", false);
user_pref("toolkit.telemetry.bhrPing.enabled", false);
user_pref("toolkit.telemetry.cachedClientID", "");
user_pref("toolkit.telemetry.cachedProfileGroupID", "");
user_pref("toolkit.telemetry.coverage.opt-out", true);
user_pref("toolkit.telemetry.enabled", false);
user_pref("toolkit.telemetry.firstShutdownPing.enabled", false);
user_pref("toolkit.telemetry.newProfilePing.enabled", false);
user_pref("toolkit.telemetry.server", "data:,");
user_pref("toolkit.telemetry.shutdownPingSender.enabled", false);
user_pref("toolkit.telemetry.unified", false);
user_pref("toolkit.telemetry.updatePing.enabled", false);

/* ---- Google Safe Browsing: OFF (package stance; uBO covers badware/phishing) ---- */
user_pref("browser.safebrowsing.allowOverride", false);
user_pref("browser.safebrowsing.blockedURIs.enabled", false);
user_pref("browser.safebrowsing.downloads.enabled", false);
user_pref("browser.safebrowsing.downloads.remote.enabled", false);
user_pref("browser.safebrowsing.malware.enabled", false);
user_pref("browser.safebrowsing.phishing.enabled", false);
user_pref("browser.safebrowsing.provider.google.lists", "");
user_pref("browser.safebrowsing.provider.google4.lists", "");
user_pref("browser.safebrowsing.provider.google4.dataSharing.enabled", false);
user_pref("browser.safebrowsing.provider.mozilla.lists", "");

/* ---- DNS-over-HTTPS (package had DoH on; TRR-first = mode 3) ---- */
user_pref("network.trr.mode", 3);

/* ============================================================
   PERFORMANCE — tuned for 8 GB / weak CPU (NOT the high-end set)
   ============================================================ */
user_pref("browser.tabs.unloadOnLowMemory", true);   /* drop idle tabs under pressure: good for 8 GB */
user_pref("content.notify.interval", 100000);
user_pref("network.dnsCacheExpiration", 3600);
user_pref("network.http.max-persistent-connections-per-server", 10);
user_pref("network.http.max-urgent-start-excessive-connections-per-host", 5);
user_pref("network.http.pacing.requests.enabled", false);
/* NOTE: dropped network.http.max-connections=1800 (default 900 is plenty for 2 cores). */

/* ---- Privacy hardening (kept) ---- */
user_pref("browser.contentblocking.category", "strict");
user_pref("browser.download.start_downloads_in_tmp_dir", true);
user_pref("browser.formfill.enable", false);
user_pref("dom.security.https_only_mode", true);
user_pref("media.autoplay.default", 5);
user_pref("network.cookie.cookieBehavior.optInPartitioning", true);
user_pref("network.cookie.cookieBehavior.optInPartitioning.pbmode", true);
user_pref("network.predictor.enable-prefetch", false);
user_pref("network.predictor.enabled", false);
user_pref("network.prefetch-next", false);
user_pref("privacy.query_stripping.strip_list", "__hsfp __hssc __hstc __s _hsenc _openstat dclid fbclid gbraid gclid hsCtaTracking igshid mc_eid ml_subscriber ml_subscriber_hash msclkid oft_n oft_ck oft_d oft_id oft_ids oft_k oft_lk oft_sk oly_anon_id oly_enc_id rb_clickid s_cid twclid vero_conv vero_id wbraid wickedid yclid");
user_pref("urlclassifier.features.socialtracking.skipURLs", "*.instagram.com, *.twitter.com, *.twimg.com");
user_pref("urlclassifier.trackingSkipURLs", "*.reddit.com, *.twitter.com, *.twimg.com");

/* ---- Desktop integration (kept) ---- */
user_pref("widget.use-xdg-desktop-portal.file-picker", 1);

/* ---- UI / smooth-scroll (kept; harmless to CPU) ---- */
user_pref("general.smoothScroll.msdPhysics.continuousMotionMaxDeltaMS", 12);
user_pref("general.smoothScroll.msdPhysics.enabled", true);
user_pref("general.smoothScroll.msdPhysics.motionBeginSpringConstant", 200);
user_pref("general.smoothScroll.msdPhysics.regularSpringConstant", 250);
user_pref("general.smoothScroll.msdPhysics.slowdownMinDeltaMS", 25);
user_pref("general.smoothScroll.msdPhysics.slowdownMinDeltaRatio", "2.0");
user_pref("general.smoothScroll.msdPhysics.slowdownSpringConstant", 250);
user_pref("general.smoothScroll.currentVelocityWeighting", "1.0");
user_pref("general.smoothScroll.stopDecelerationWeighting", "1.0");
user_pref("mousewheel.default.delta_multiplier_y", 300);  /* aggressive 3x scroll speed (package default) */

/* ---- Feature enablement (kept) ---- */
user_pref("layout.css.grid-template-masonry-value.enabled", true);

/* ==== END replacement block ==== */
