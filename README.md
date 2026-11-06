# firefox-revamp

A minimal Firefox UI made with `userChrome.css` and one script. It builds on stock Firefox, so the built-in sidebar, tabs and menus keep working.

## Layout

Horizontal tabs:

![Horizontal tabs, address bar open](docs/horizontal.png)

```
[◀][▶][⟳][ tabs ………………………………… ][pinned ext][🧩][☰]
```

- Everything is in one row, and the tabs fill the space between the buttons.
- The address bar opens as a floating box near the top of the window, with suggestions below it. It opens on Ctrl+L, on a new tab, or when you double-click a tab.
- Double-click empty space in the tab strip to open a new tab.
- Ctrl+Alt+Z hides the top bar and shows it again.

Vertical tabs:

![Vertical tabs, address bar open](docs/vertical.png)

```
[◀][▶][⟳][🧩][☰]
[ tabs … ]
[⬇]       [pinned ext]
```

- The buttons move into Firefox's sidebar and wrap to fit its width.
- The downloads button sits in the bottom-left corner of the sidebar. Like in the top bar, it hides while there are no downloads unless you untick *Auto-hide in Toolbar* in its right-click menu.
- The bookmarks and history sidebar (Ctrl+B / Ctrl+H) works as usual.
- Ctrl+Alt+Z hides the sidebar and shows it again, expanded or collapsed as it was.
- Drag the sidebar narrower than 150px and it collapses to icons. Expanding it again restores the width it had before.

Switching between the two puts every button back in place.

Both layouts:

- Ctrl+Tab shows a preview of every open tab, centred on the screen. The arrow keys move through the grid.
- In fullscreen, move the mouse to the top edge to bring the top bar back.
- Tools → Reveal Hidden Bars on Hover does the same outside fullscreen: a hidden top bar comes back from the top edge, and a hidden sidebar from its side of the window. Both hide again when the mouse moves back into the page.

## Requirements

- Firefox 159. Newer versions should work, but a Firefox update can change the elements this styles.
- Linux for the install script. For macOS and Windows, see *Manual install*.
- The distro package or the mozilla.org tarball. Snap and Flatpak don't work, because their install folder is read-only.

## Install

Quit Firefox, then run:

```sh
curl -fsSL https://raw.githubusercontent.com/adior-enigmac/firefox-revamp/main/install.sh | bash
```

The script:

1. Installs the [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) script loader (`config.js`, `defaults/pref/config-prefs.js`) into Firefox's install folder. This may ask for your sudo password.
2. Moves your current `chrome/` folder to `chrome.backup-<date>/` and installs this repo's `chrome/` folder into your default profile.
3. Adds the required prefs to your profile's `user.js`. Existing lines are kept.
4. Clears Firefox's startup cache.

To pass options, add them after `bash -s --`:

```sh
curl -fsSL https://raw.githubusercontent.com/adior-enigmac/firefox-revamp/main/install.sh | bash -s -- --uninstall
```

| Option | Effect |
|---|---|
| `--profile DIR` | Install into this profile folder instead of the default one. |
| `--autoconfig-only` | Reinstall only the script loader. |
| `--performance PROFILE` | Select `low-end`, `balanced`, `high-performance`, or `auto`; retains Firefox defaults. |
| `--dry-run` | Preview actions without writing. |
| `--rollback` | Restore the newest backed-up `user.js`. |
| `--uninstall` | Remove what the script installed. |
| `--yes` | Don't ask for confirmation. |

To use vertical tabs, go to Settings → General → Browser layout, or set `sidebar.verticalTabs` to `true` in `about:config`.

## Manual install

1. Open `about:support` and click *Open Folder* next to Profile Folder.
2. Copy `chrome/` into that folder, then copy `vendor/fx-autoconfig/profile/chrome/utils/` to `<profile>/chrome/utils/`.
3. Copy `vendor/fx-autoconfig/program/config.js` and `vendor/fx-autoconfig/program/defaults/pref/config-prefs.js` into Firefox's install folder, keeping the paths:
   - Linux: usually `/usr/lib/firefox/`
   - Windows: `C:\Program Files\Mozilla Firefox\`
   - macOS: `Firefox.app/Contents/Resources/`
4. Add the prefs from `user.js` to `<profile>/user.js`, or set them in `about:config`.
5. In `about:support`, click *Clear startup cache…*, then restart Firefox.

## Performance profiles and privacy defaults

Firefox Revamp remains a minimal UI customization first. The default install
also applies the project's privacy preferences and selects the automatic
performance profile. `--performance low-end`, `balanced`,
`high-performance`, or `auto` chooses a target while retaining
Firefox's own process, cache, renderer and decoder defaults. The audit found no
universal manual preference with demonstrated gains, so profiles currently
make no performance preference overrides.

`scripts/detect-hardware.sh` reports best-effort Linux RAM, CPU, GPU/driver,
session and Firefox package information. `lspci`, `glxinfo` and `vulkaninfo`
are optional. The `auto` heuristic uses total RAM and logical CPU count; it
cannot establish GPU features or Firefox decoder support.

Every normal install merges the telemetry/sponsored-content choices in
`extras/privacy.user.js` and selects the auto performance profile. Add
`--performance PROFILE` to choose a specific profile instead. These profiles
currently keep Firefox's performance defaults.
Safe Browsing, malicious extension blocking, certificate validation/revocation
checks and updates remain enabled.
The former combined `extras/privacy-performance.user.js` is now a deprecated
empty stub; settings already present in a profile's `user.js` are not removed
automatically. Review those values manually. See
[`docs/performance-preferences.md`](docs/performance-preferences.md) and
[`tests/performance-validation.md`](tests/performance-validation.md).

## Configuration management

Firefox reads `user.js` at startup and reapplies its values each time. The
installer appends missing preference names and leaves existing values in
place, reporting conflicts. `--dry-run` previews actions without writing.
Performance/privacy changes save a timestamped `user.js.firefox-revamp-backup-*`;
`--rollback` restores the newest such backup. Profile files need no root access;
the system Firefox installation may require it for fx-autoconfig.

## If the script stops loading

The script loader's files live in Firefox's install folder, not your profile. Normal updates leave them alone, but reinstalling Firefox or switching to another Firefox package can remove them. If tabs move back to their own row or the sidebar buttons are missing, quit Firefox and run:

```sh
curl -fsSL https://raw.githubusercontent.com/adior-enigmac/firefox-revamp/main/install.sh | bash -s -- --autoconfig-only
```

## Updating

Run the install command again. Each run backs up your previous `chrome/` folder.

## Uninstallation

Run `./install.sh --uninstall` (or pass `--profile DIR`). The installed
`chrome/` directory is moved aside and matching fx-autoconfig loader files are
removed. Preferences in `user.js` are retained, as before; use `--rollback`
before uninstalling to restore a preference backup, or edit them manually.

## Customising

- Accent colour: `#00ddff` in `chrome/userChrome.css`.
- Address bar width: `--uc-pill-w` in `chrome/revamp.css`.
- Sidebar layout: section E of `chrome/revamp.css`, and `syncControlsHome()` in `chrome/JS/revamp.uc.js`.

Firefox only reads these files at startup, so restart it fully after a change.

## Troubleshooting

- Nothing changed: check that `toolkit.legacyUserProfileCustomizations.stylesheets` is `true`, and that you installed into the profile Firefox is using (listed in `about:support`).
- The styling loads but the layout is wrong: the script isn't running. Run the installer with `--autoconfig-only`, then restart Firefox.
- The script logs its actions to the Browser Console (Ctrl+Shift+J) with the prefix `[revamp]`.

## Credits

- `chrome/firefox-csshacks/chrome/oneline_toolbar.css`: [MrOtherGuy/firefox-csshacks](https://github.com/MrOtherGuy/firefox-csshacks), MPL-2.0, unmodified.
- `vendor/fx-autoconfig/`: [MrOtherGuy/fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) 0.10.16, MPL-2.0.

## License

[MPL-2.0](LICENSE). The vendored files in `chrome/firefox-csshacks/` and `vendor/fx-autoconfig/` keep their own MPL-2.0 licenses.
