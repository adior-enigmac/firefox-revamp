// Default privacy preferences. Security protections (Safe Browsing,
// extension blocklist and certificate revocation checking) remain enabled.
// Review each choice before applying; user.js reapplies on every startup.
user_pref("app.normandy.enabled", false);
user_pref("datareporting.healthreport.uploadEnabled", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("datareporting.usage.uploadEnabled", false);
user_pref("toolkit.telemetry.enabled", false);
user_pref("toolkit.telemetry.unified", false);
user_pref("browser.newtabpage.activity-stream.showSponsored", false);
user_pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
user_pref("browser.urlbar.quicksuggest.sponsored", false);
user_pref("browser.urlbar.quicksuggest.nonsponsored", false);
