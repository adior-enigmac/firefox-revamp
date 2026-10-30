# firefox-revamp

A minimal, Zen-style Firefox UI built from `userChrome.css` plus one small script. Everything is keyed on stock Firefox, so the browser's own sidebar, tabs and menus keep working.

**Horizontal mode** puts everything in one row:

```
[◀][▶][⟳][ tabs ………………………………… ][pinned ext][🧩][☰]
```

- **Floating URL bar:** the address bar isn't in the row. Press Ctrl+L, double-click a tab, open a new tab, or just start typing, and it appears as a floating palette near the top centre. The suggestions sit flush beneath it at the same width.
- **Tabs fill the middle,** with no stray gaps between the groups.

**Vertical mode** (stock vertical tabs) uses Firefox's own sidebar:

```
[◀][▶][⟳][🧩][☰]
[ tabs … ]
          [pinned ext]
```

- **Controls move into the sidebar:** the toolbar row collapses, and its buttons sit in the sidebar with Firefox's normal button styling.
- **The rows wrap to the sidebar's width:** from the narrow icon rail to the full-width panel.
- **Square page corner:** the page no longer has a rounded corner next to the sidebar.
- **The bookmarks and history sidebar** (Ctrl+B / Ctrl+H) keeps working.

**Switching between modes** in Settings moves every button back where it belongs. The sidebar strip is hidden in horizontal mode.

## Requirements

- **Firefox 159** is what it was built and tested on. Newer versions usually work, but Firefox's internal markup changes occasionally.
- **Linux** for the automatic installer. macOS and Windows work with the manual steps below.
- **A normal Firefox install:** the distro package or the tarball from mozilla.org. **Snap and Flatpak builds don't work**, because their install directory is read-only and the script loader can't be added there.

## Install (Linux)

```sh
git clone https://github.com/adior-enigmac/firefox-revamp.git
cd firefox-revamp
# quit Firefox completely first
./install.sh
```

The installer:

1. **Adds the script loader to Firefox's install directory.** This is [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig): `config.js` and `defaults/pref/config-prefs.js`. It asks for `sudo` for system installs.
2. **Moves your current `chrome/` folder aside** to `chrome.backup-<date>/`, then installs this repo's `chrome/` folder into your default profile.
3. **Adds the required prefs** to your profile's `user.js`, without overwriting existing lines.
4. **Clears Firefox's startup cache,** so the script loads on the next start.

Options:

| Command | What it does |
|---|---|
| `./install.sh --profile ~/.mozilla/firefox/xxxx.default-release` | Install into a specific profile. |
| `./install.sh --autoconfig-only` | Reinstall only the loader (see *Updating Firefox*). |
| `./install.sh --privacy-prefs` | Also apply the optional privacy/performance prefs (see below). |
| `./install.sh --uninstall` | Remove everything the installer added. |
| `./install.sh --yes` | Skip the confirmation prompt. |

Then start Firefox. To try vertical tabs, go to **Settings → General → Browser layout → Vertical tabs**, or set `sidebar.verticalTabs` to `true` in `about:config`.

## Manual install (any OS)

1. **Find your profile folder:** open `about:support` and click *Open Folder* next to **Profile Folder**.
2. **Copy the files:** copy this repo's `chrome/` folder into the profile folder, then copy `vendor/fx-autoconfig/profile/chrome/utils/` into `<profile>/chrome/utils/`.
3. **Install the loader:** copy `vendor/fx-autoconfig/program/config.js` and `vendor/fx-autoconfig/program/defaults/pref/config-prefs.js` into Firefox's **install** folder, keeping the paths. The install folder is the one containing the Firefox executable.
   - Windows: `C:\Program Files\Mozilla Firefox\`
   - macOS: `Firefox.app/Contents/Resources/`
4. **Set the prefs:** set the prefs from `user.js` in `about:config`, or append them to `<profile>/user.js`.
5. **Clear the startup cache:** in `about:support`, click **Clear startup cache…**, then restart Firefox.

## Optional: privacy & performance prefs

`extras/privacy-performance.user.js` is the author's personal `user.js`. It isn't needed for the UI.

- **What it does:** removes telemetry and sponsored content, hardens privacy (strict tracking protection, HTTPS-only mode, DNS-over-HTTPS), and tunes Firefox for a low-RAM, 2-core machine.
- **Some lines trade safety for privacy:**
  - It turns off the malicious-add-on blocklist and Safe Browsing.
  - It makes DNS-over-HTTPS the *only* resolver, so lookups fail if that server is unreachable.
  - The file's header lists all of these. **Read it and delete what you don't want** before applying it with `./install.sh --privacy-prefs`, or copy individual lines yourself.

## Updating Firefox

Some distro packages, Arch among them, replace the install folder on every Firefox update, which removes `config.js`. If the layout suddenly looks broken after an update (tabs back in their own row, buttons missing in the sidebar), quit Firefox and run:

```sh
./install.sh --autoconfig-only
```

## Updating firefox-revamp

```sh
git pull
./install.sh
```

Your previous `chrome/` folder is backed up each time.

## Customising

- **Accent colour:** search `#00ddff` in `chrome/userChrome.css`. It's the fallback used when your theme doesn't supply a colour.
- **URL palette width:** `--uc-pill-w` in `chrome/url-in-active-tab.css`.
- **Sidebar layout:** section **F** of `chrome/url-in-active-tab.css` (CSS), and `syncControlsHome()` in `chrome/JS/url-in-active-tab.uc.js` (which buttons go into which row).

Every change needs a **full** quit and restart of Firefox, because userChrome files are only read at startup.

## Troubleshooting

- **Nothing changed at all:** check that `toolkit.legacyUserProfileCustomizations.stylesheets` is `true` in `about:config`, and that you installed into the profile Firefox actually uses (shown in `about:support`).
- **The CSS applies but the layout is broken:** the script isn't loading. Run `./install.sh --autoconfig-only`, clear the startup cache, and restart.
- **Lines starting with `[url-in-active-tab]`** in the Browser Console (Ctrl+Shift+J) show what the script is doing.

## Credits

- [MrOtherGuy/firefox-csshacks](https://github.com/MrOtherGuy/firefox-csshacks) provides `oneline_toolbar.css`, vendored unmodified under `chrome/firefox-csshacks/` (MPL-2.0).
- [MrOtherGuy/fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) is the userChrome script loader, version 0.10.16, vendored under `vendor/fx-autoconfig/` (MPL-2.0).
