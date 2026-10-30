// firefox-revamp — prefs required by the setup. install.sh merges these into
// your profile's user.js (existing lines are kept; missing ones are added).

// load userChrome.css / userContent.css from the profile's chrome/ folder
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
// lets toolbar/sidebar SVG icons pick up theme colours (fill: currentColor)
user_pref("svg.context-properties.content.enabled", true);
// new sidebar — required for vertical-tabs mode (default on in recent builds)
user_pref("sidebar.revamp", true);
