# Performance preference audit and reference

Checked against Mozilla's current [preference defaults](https://searchfox.org/firefox-main/source/modules/libpref/init/all.js),
[static preference definitions](https://searchfox.org/firefox-main/source/modules/libpref/init/StaticPrefList.yaml),
and [Firefox performance guidance](https://support.mozilla.org/en-US/kb/performance-settings)
on 2026-11-06. Firefox source is authoritative; about:config can show stale or
build-specific entries. Mozilla's automatic hardware-based settings are the
profile baseline. The three profiles intentionally contain no overrides
because this audit found no universal tweak with a demonstrated benefit across
the target hardware classes.

## Existing combined file classification

`extras/privacy-performance.user.js` is retained as an empty deprecation stub.
It previously mixed the following classes:

| Classification | Previous preference families | Decision |
|---|---|---|
| Genuine performance | `browser.tabs.unloadOnLowMemory`; cache and network limits; GPU process, shader and decoder switches | No profile overrides. These either duplicate adaptive behavior, impose arbitrary limits, have platform-specific defaults, or lack reproducible evidence of a gain. |
| Privacy | Normandy/telemetry, sponsored content, recommendations, tracking protection, prefetch, DoH, form fill, autoplay, URL stripping | A small default subset is in `extras/privacy.user.js`. Review individually. |
| Security | Safe Browsing, extension blocklist, OCSP/CRLite, HTTPS-only | Unsafe disables are removed. Firefox defaults and security updates remain active. HTTPS-only is a user-facing security choice, not a performance tweak. |
| UI customization | Smooth-scroll physics, scroll multiplier, new-tab search and feed presentation | Not performance profiles; customize UI separately. |
| Compatibility/desktop integration | spellchecker dictionary path, default-browser check, XDG portal, locale, extension scope | Machine/distribution-specific; do not distribute as performance values. |
| Obsolete or unsupported | Legacy content-analysis, old feature gates, `layout.css.grid-template-masonry-value.enabled` and stale product-specific toggles | No longer maintained as generally supported user controls or depend on build/version. Do not set. |
| Unverified/counterproductive | `content.notify.interval`, DNS expiration override, per-host connection and urgent-start caps, pacing disable, image/media/network/TLS cache sizes, forced GPU/WebRender/decoder toggles, reduced service polling | No demonstrated cross-device improvement. Several reduce throughput, can increase memory use, or suppress Firefox hardware detection. Omitted. |

### Full preference inventory

Every `user_pref` from the removed combined file is represented below (the
first two UI entries also appear in the current `user.js`).

**UI customization:** `toolkit.legacyUserProfileCustomizations.stylesheets`,
`userchrome.navbar-tabs-oneliner.tabs-on-right.enabled`,
`browser.newtabpage.enabled`, `browser.newtabpage.activity-stream.showSearch`,
`general.smoothScroll.msdPhysics.continuousMotionMaxDeltaMS`,
`general.smoothScroll.msdPhysics.enabled`,
`general.smoothScroll.msdPhysics.motionBeginSpringConstant`,
`general.smoothScroll.msdPhysics.regularSpringConstant`,
`general.smoothScroll.msdPhysics.slowdownMinDeltaMS`,
`general.smoothScroll.msdPhysics.slowdownMinDeltaRatio`,
`general.smoothScroll.msdPhysics.slowdownSpringConstant`,
`general.smoothScroll.currentVelocityWeighting`,
`general.smoothScroll.stopDecelerationWeighting`,
`mousewheel.default.delta_multiplier_y`,
`layout.css.grid-template-masonry-value.enabled`.

**Compatibility or desktop integration:** `intl.locale.requested`,
`spellchecker.dictionary_path`, `extensions.autoDisableScopes`,
`browser.shell.checkDefaultBrowser`, `widget.use-xdg-desktop-portal.file-picker`,
`browser.startup.homepage_override.mstone`. The dictionary path is distro
specific; the last pref suppresses a migration marker and should not be forced.

**Security controls (do not disable):** `security.OCSP.enabled`,
`security.pki.crlite_mode`, `security.remote_settings.crlite_filters.enabled`,
`extensions.blocklist.enabled`, `browser.safebrowsing.allowOverride`,
`browser.safebrowsing.blockedURIs.enabled`,
`browser.safebrowsing.downloads.enabled`,
`browser.safebrowsing.downloads.remote.enabled`,
`browser.safebrowsing.malware.enabled`, `browser.safebrowsing.phishing.enabled`,
`browser.safebrowsing.provider.google.lists`,
`browser.safebrowsing.provider.google4.lists`,
`browser.safebrowsing.provider.google4.dataSharing.enabled`,
`browser.safebrowsing.provider.mozilla.lists`,
`dom.security.https_only_mode`. The old file disabled several of these; none are
included in the new privacy file or performance profiles.

**Privacy / telemetry / feature choices:** `app.normandy.api_url`,
`app.normandy.enabled`, `breakpad.reportURL`,
`browser.contentblocking.report.hide_vpn_banner`,
`browser.contentblocking.report.lockwise.enabled`,
`browser.contentblocking.report.monitor.enabled`,
`browser.contentblocking.report.show_mobile_app`,
`browser.crashReports.unsubmittedCheck.autoSubmit2`,
`browser.dataFeatureRecommendations.enabled`, `browser.discovery.enabled`,
`browser.ipProtection.enabled`, `browser.ml.chat.enabled`,
`browser.ml.chat.page`, `browser.ml.enable`, `browser.ml.linkPreview.enabled`,
all `browser.newtabpage.activity-stream.feeds.*` keys, all
`browser.newtabpage.activity-stream.unifiedAds.*` keys,
`browser.newtabpage.activity-stream.showSponsoredCheckboxes`,
`browser.newtabpage.activity-stream.system.showSponsored`,
`browser.newtabpage.activity-stream.showSponsored`,
`browser.newtabpage.activity-stream.showSponsoredTopSites`,
`browser.newtabpage.activity-stream.telemetry*`,
`browser.newtabpage.activity-stream.trendingSearch.*`,
`browser.places.interactions.enabled`, `browser.privatebrowsing.vpnpromourl`,
`browser.promo.cookiebanners.enabled`, `browser.promo.focus.enabled`,
`browser.promo.pin.enabled`, `browser.protections_panel.infoMessage.seen`,
`browser.send_to_device_locales`, `browser.tabs.crashReporting.sendReport`,
`browser.tabs.groups.smart.userEnabled`, `browser.uitour.enabled`,
`browser.urlbar.quicksuggest.enabled`, `browser.urlbar.suggest.*`,
`browser.urlbar.addons.featureGate`, `browser.urlbar.fakespot.featureGate`,
`browser.urlbar.mdn.featureGate`, `browser.urlbar.pocket.featureGate`,
`browser.urlbar.weather.featureGate`, `browser.urlbar.yelp.featureGate`,
`browser.vpn_promo.enabled`, `captivedetect.canonicalURL`,
`cookiebanners.ui.desktop.showCallout`, `devtools.debugger.remote-enabled`,
`dom.private-attribution.submission.enabled`, `dom.push.enabled`,
`dom.security.unexpected_system_load_telemetry_enabled`,
`extensions.abuseReport.enabled`, `extensions.getAddons.showPane`,
`extensions.htmlaboutaddons.recommendations.enabled`, `extensions.pocket.enabled`,
`extensions.webcompat-reporter.enabled`, `media.gmp-gmpopenh264.autoupdate`,
`signon.firefoxRelay.feature`, `browser.ping-centre.telemetry`,
`browser.search.serpEventTelemetryCategorization.*`, `browser.search.update`,
`browser.shopping.experience2023.enabled`, `datareporting.*`,
`extensions.addonAbuseReport.url`, `extensions.getAddons.cache.enabled`,
`network.captive-portal-service.enabled`,
`network.connectivity-service.enabled`, `network.traffic_analyzer.enabled`,
`network.trr.confirmation_telemetry_enabled`,
`security.certerrors.recordEventTelemetry`, `toolkit.contentRelevancy.enabled`,
`toolkit.coverage.*`, `toolkit.telemetry.*`, `network.trr.mode`,
`browser.contentblocking.category`, `browser.download.start_downloads_in_tmp_dir`,
`browser.formfill.enable`, `media.autoplay.default`,
`network.cookie.cookieBehavior.optInPartitioning*`,
`network.predictor.*`, `network.prefetch-next`, `privacy.query_stripping.strip_list`,
`urlclassifier.features.socialtracking.skipURLs`,
`urlclassifier.trackingSkipURLs`. These are optional policy choices, not
performance tuning. DoH-only mode and disabling network services can break
connectivity or browser functions; they were not carried forward.

**Performance or unverified tuning:** `media.webrtc.hw.h264.enabled`,
`media.gpu-process-decoder`, `layers.gpu-process.enabled`,
`gfx.webrender.precache-shaders`, `gfx.webrender.program-binary-disk`,
`browser.cache.disk.enable`, `image.cache.size`,
`image.mem.shared.unmap.min_expiration_ms`, `media.cache_readahead_limit`,
`media.cache_resume_threshold`, `network.buffer.cache.size`,
`network.ssl_tokens_cache_capacity`, `services.settings.poll_interval`,
`browser.tabs.unloadOnLowMemory`, `content.notify.interval`,
`network.dnsCacheExpiration`,
`network.http.max-persistent-connections-per-server`,
`network.http.max-urgent-start-excessive-connections-per-host`,
`network.http.pacing.requests.enabled`. All are omitted from the new profiles.

**Obsolete, unsupported, or unverified product controls:**
`browser.contentanalysis.default_result`, `browser.contentanalysis.enabled`,
many version-specific recommendation/feature gates listed above,
`browser.newtabpage.activity-stream.feeds.aboutpreferences`,
`browser.newtabpage.activity-stream.feeds.adsfeed`,
`browser.newtabpage.activity-stream.feeds.discoverystreamfeed`,
`browser.newtabpage.activity-stream.feeds.recommendationprovider`,
`browser.newtabpage.activity-stream.feeds.system.topsites`,
`browser.newtabpage.activity-stream.feeds.system.topstories`,
`browser.newtabpage.activity-stream.feeds.topsites`,
`browser.newtabpage.activity-stream.unifiedAds.adsFeed.enabled`,
`browser.newtabpage.activity-stream.unifiedAds.adsFeed.spocs.enabled`,
`browser.newtabpage.activity-stream.unifiedAds.adsFeed.tiles.enabled`,
`browser.newtabpage.activity-stream.unifiedAds.spocs.enabled`,
`browser.newtabpage.activity-stream.unifiedAds.tiles.enabled`,
`browser.urlbar.suggest.quicksuggest.fakespot`,
`browser.urlbar.suggest.quicksuggest.topsites`,
`browser.urlbar.suggest.trending`,
`browser.newtabpage.activity-stream.telemetry.ut.event`,
`browser.newtabpage.activity-stream.trendingSearch.blockedAds`,
`browser.newtabpage.activity-stream.trendingSearch.variant`,
`toolkit.telemetry.cachedClientID`, `toolkit.telemetry.cachedProfileGroupID`,
`toolkit.telemetry.server`. These are build/version-private or no longer
supported as stable user controls; do not carry forward without source
validation for the specific Firefox release.

## Named preference findings

* `browser.tabs.unloadOnLowMemory`: the old file treated this as a guaranteed
  low-memory optimization. Firefox has its own memory-pressure/tab-discard
  behavior; no profile forces this pref because explicit unload behavior can
  cause reloads and lose transient page state.
* `content.notify.interval`: internal scheduling knob; changing it can trade
  responsiveness against batching and has no current evidence for a general
  gain. Omitted.
* `network.dnsCacheExpiration`: Firefox owns DNS cache lifetimes. Extending an
  arbitrary value risks stale answers; omitted.
* `network.http.max-persistent-connections-per-server` and
  `network.http.max-urgent-start-excessive-connections-per-host`: current
  source defaults are 6 and 3 respectively. Lowering the urgent limit or
  overriding connection concurrency can slow sites; omitted.
* `network.http.pacing.requests.enabled`: internal request pacing behavior;
  disabling it is not an established optimization. Omitted.
* `image.cache.size`, `media.cache_readahead_limit`,
  `network.buffer.cache.size`, `network.ssl_tokens_cache_capacity`: cache
  sizes/units are workload-specific and fixed allocations can waste RAM or
  reduce reuse. Firefox manages these based on the build/platform; omitted.
* `layers.gpu-process.enabled`, `media.gpu-process-decoder`,
  `gfx.webrender.precache-shaders`, `gfx.webrender.program-binary-disk`, and
  hardware video decoding controls: support and defaults vary by OS, GPU,
  driver and build. Firefox's capability checks are retained; never force a
  decoder or renderer through this project.

## Profile targets

* **Low-end:** 2–4 GiB RAM, older dual-core CPU, integrated graphics.
* **Balanced:** 8–16 GiB RAM, ordinary laptop/desktop.
* **High-performance:** 16–64+ GiB RAM, modern multicore CPU and capable GPU.

These names help users organize benchmark comparisons; they are not promises
of speed or hidden process/cache limits. Update a profile only when a measured,
repeatable workload demonstrates benefit and the preference is validated in
the target Firefox source version.
