#!/usr/bin/env bash
# firefox-revamp installer (Linux)
#
# One-liner (no git needed — downloads the repo itself):
#   curl -fsSL https://raw.githubusercontent.com/adior-enigmac/firefox-revamp/main/install.sh | bash
# Options go after `bash -s --`, e.g.:
#   curl -fsSL https://raw.githubusercontent.com/adior-enigmac/firefox-revamp/main/install.sh | bash -s -- --autoconfig-only
#
#   ./install.sh                     install into the default Firefox profile
#   ./install.sh --profile DIR       install into a specific profile directory
#   ./install.sh --autoconfig-only   only (re)install the fx-autoconfig loader
#                                    into the Firefox install dir — needed again
#                                    after a Firefox package update wipes it
#   ./install.sh --privacy-prefs     also merge extras/privacy-performance.user.js
#                                    (optional; READ that file's header first)
#   ./install.sh --uninstall         remove everything this script installed
#   ./install.sh --yes               don't ask for confirmation
#
# What it does:
#   1. Copies fx-autoconfig's loader (config.js + defaults/pref/config-prefs.js)
#      into the Firefox INSTALL directory (needs sudo for system installs).
#   2. Moves the profile's existing chrome/ folder to chrome.backup-<time>/,
#      then installs this repo's chrome/ plus fx-autoconfig's chrome/utils/.
#   3. Merges the required prefs from user.js into the profile's user.js.
#   4. Clears Firefox's startup cache so the scripts load on next start.
set -euo pipefail

TARBALL="https://github.com/adior-enigmac/firefox-revamp/archive/refs/heads/main.tar.gz"

die()  { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }
info() { printf '\033[36m::\033[0m %s\n' "$*"; }
warn() { printf '\033[33mwarning:\033[0m %s\n' "$*" >&2; }

# Run from a checkout → use the files next to this script. Piped through
# `curl | bash` there are none (BASH_SOURCE is empty) → fetch the repo tarball
# into a temp dir that is removed again on exit.
SCRIPT_PATH="${BASH_SOURCE[0]:-}"
if [[ -n "$SCRIPT_PATH" && -d "$(dirname "$SCRIPT_PATH")/chrome" ]]; then
  REPO_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
else
  command -v curl >/dev/null 2>&1 || die "curl is required"
  command -v tar  >/dev/null 2>&1 || die "tar is required"
  REPO_DIR="$(mktemp -d)"
  trap 'rm -rf "$REPO_DIR"' EXIT
  info "downloading firefox-revamp…"
  curl -fsSL "$TARBALL" | tar -xz -C "$REPO_DIR" --strip-components=1 \
    || die "download failed: $TARBALL"
fi
VENDOR="$REPO_DIR/vendor/fx-autoconfig"
STAMP="$(date +%Y%m%d-%H%M%S)"

PROFILE=""
MODE="install"
ASSUME_YES=0
PRIVACY_PREFS=0

usage() { sed -n '2,28p' "$REPO_DIR/install.sh" | sed 's/^# \{0,1\}//'; exit 0; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)          PROFILE="${2:-}"; [[ -n "$PROFILE" ]] || die "--profile needs a directory"; shift 2 ;;
    --autoconfig-only)  MODE="autoconfig"; shift ;;
    --uninstall)        MODE="uninstall"; shift ;;
    --privacy-prefs)    PRIVACY_PREFS=1; shift ;;
    -y|--yes)           ASSUME_YES=1; shift ;;
    -h|--help)          usage ;;
    *)                  die "unknown option: $1 (see --help)" ;;
  esac
done

[[ "$(uname -s)" == "Linux" ]] || die "this installer supports Linux only — see README for macOS/Windows"

# Prompts read from the terminal, not stdin: under `curl | bash` stdin is the
# script itself.
confirm() {
  [[ $ASSUME_YES -eq 1 ]] && return 0
  [[ -r /dev/tty ]] || die "no terminal to ask on — rerun with --yes"
  read -r -p "$1 [y/N] " reply </dev/tty
  [[ "$reply" =~ ^[Yy]$ ]]
}

# ---- Firefox must be closed: it rewrites prefs and caches on exit ----------
if pgrep -x firefox >/dev/null 2>&1 || pgrep -x firefox-bin >/dev/null 2>&1; then
  die "Firefox is running — quit it completely first"
fi

# ---- locate the Firefox install directory ----------------------------------
find_install_dir() {
  local candidates=() bin
  if bin="$(command -v firefox 2>/dev/null)"; then
    case "$(readlink -f "$bin")" in
      /snap/*)  die "Snap Firefox can't load fx-autoconfig (read-only install dir). Use the distro package or the tarball from mozilla.org." ;;
    esac
    candidates+=("$(dirname "$(readlink -f "$bin")")")
  fi
  if command -v flatpak >/dev/null 2>&1 && flatpak info org.mozilla.firefox >/dev/null 2>&1 \
     && [[ -z "${bin:-}" ]]; then
    die "Flatpak Firefox can't load fx-autoconfig (read-only install dir). Use the distro package or the tarball from mozilla.org."
  fi
  candidates+=(/usr/lib/firefox /usr/lib64/firefox /opt/firefox /usr/local/lib/firefox)
  for d in "${candidates[@]}"; do
    [[ -f "$d/omni.ja" || -f "$d/application.ini" ]] && { echo "$d"; return 0; }
  done
  return 1
}

# ---- locate the default profile --------------------------------------------
# Reads profiles.ini: prefer the [Install…] Default= entry (what Firefox
# actually starts with), else the [Profile…] marked Default=1.
find_profile() {
  local base ini path rel
  for base in "$HOME/.mozilla/firefox" "$HOME/.config/mozilla/firefox"; do
    ini="$base/profiles.ini"
    [[ -f "$ini" ]] || continue
    path="$(awk -F= '/^\[Install/{s=1;next} /^\[/{s=0} s && $1=="Default"{print $2; exit}' "$ini")"
    if [[ -z "$path" ]]; then
      path="$(awk -F= '
        /^\[Profile/{p="";r=1;d=0;next}
        /^\[/{if(d&&p!=""){print r":"p; exit} p="";d=0;next}
        $1=="Path"{p=$2} $1=="IsRelative"{r=$2} $1=="Default"&&$2=="1"{d=1}
        END{if(d&&p!="")print r":"p}' "$ini")"
      rel="${path%%:*}"; path="${path#*:}"
      [[ "$rel" == "0" ]] && { echo "$path"; return 0; }
    fi
    [[ -n "$path" ]] || continue
    [[ "$path" == /* ]] && echo "$path" || echo "$base/$path"
    return 0
  done
  return 1
}

# run a command with sudo only when the target isn't writable
as_needed() {
  local target="$1"; shift
  if [[ -w "$target" ]]; then "$@"; else sudo "$@"; fi
}

install_autoconfig() {
  local dir="$1"
  info "Firefox install dir: $dir"
  if [[ -f "$dir/config.js" ]] && ! cmp -s "$dir/config.js" "$VENDOR/program/config.js"; then
    warn "an existing $dir/config.js differs — backing it up to config.js.bak-$STAMP"
    as_needed "$dir" cp "$dir/config.js" "$dir/config.js.bak-$STAMP"
  fi
  as_needed "$dir" install -m 644 "$VENDOR/program/config.js" "$dir/config.js"
  as_needed "$dir" install -d "$dir/defaults/pref"
  as_needed "$dir/defaults/pref" install -m 644 "$VENDOR/program/defaults/pref/config-prefs.js" \
    "$dir/defaults/pref/config-prefs.js"
  info "fx-autoconfig loader installed"
}

clear_startup_cache() {
  local name; name="$(basename "$1")"
  for c in "$HOME/.cache/mozilla/firefox/$name/startupCache" "$1/startupCache"; do
    [[ -d "$c" ]] && rm -rf "$c" && info "cleared startup cache ($c)"
  done
  return 0
}

# merge_user_js PROFILE SOURCE — append SOURCE's prefs that PROFILE/user.js
# doesn't set yet; existing lines always win
merge_user_js() {
  local target="$1/user.js" source="$2" line key added=0
  touch "$target"
  while IFS= read -r line; do
    [[ "$line" =~ ^user_pref\(\"([^\"]+)\" ]] || continue
    key="${BASH_REMATCH[1]}"
    if grep -q "user_pref(\"$key\"" "$target"; then
      grep -qF "$line" "$target" || warn "user.js already sets $key differently — left as is"
    else
      echo "$line" >> "$target"; added=$((added + 1))
    fi
  done < "$source"
  info "user.js: $added pref(s) added from $(basename "$source")"
}

INSTALL_DIR="$(find_install_dir)" || die "couldn't find the Firefox install directory (looked for omni.ja)"

if [[ "$MODE" == "autoconfig" ]]; then
  install_autoconfig "$INSTALL_DIR"
  exit 0
fi

if [[ -z "$PROFILE" ]]; then
  PROFILE="$(find_profile)" || die "couldn't find a Firefox profile — pass one with --profile DIR"
fi
[[ -d "$PROFILE" ]] || die "profile directory not found: $PROFILE"
info "profile: $PROFILE"

if [[ "$MODE" == "uninstall" ]]; then
  confirm "Remove firefox-revamp from this profile and the fx-autoconfig loader?" || exit 1
  if [[ -d "$PROFILE/chrome" ]]; then
    mv "$PROFILE/chrome" "$PROFILE/chrome.removed-$STAMP"
    info "moved chrome/ to chrome.removed-$STAMP (delete it when you're sure)"
  fi
  # only remove loader files that are exactly ours
  for f in config.js defaults/pref/config-prefs.js; do
    if [[ -f "$INSTALL_DIR/$f" ]] && cmp -s "$INSTALL_DIR/$f" "$VENDOR/program/$f"; then
      as_needed "$(dirname "$INSTALL_DIR/$f")" rm -f "$INSTALL_DIR/$f"
      info "removed $INSTALL_DIR/$f"
    fi
  done
  clear_startup_cache "$PROFILE"
  info "done — prefs in user.js were left in place"
  exit 0
fi

echo
echo "This will:"
echo "  • install the fx-autoconfig loader into $INSTALL_DIR (may ask for sudo)"
[[ -d "$PROFILE/chrome" ]] && echo "  • move your current chrome/ folder to chrome.backup-$STAMP/"
echo "  • install firefox-revamp into $PROFILE/chrome/"
echo "  • add the required prefs to $PROFILE/user.js"
[[ $PRIVACY_PREFS -eq 1 ]] && echo "  • ALSO add the optional privacy/performance prefs (extras/privacy-performance.user.js)"
echo
confirm "Continue?" || exit 1

install_autoconfig "$INSTALL_DIR"

if [[ -d "$PROFILE/chrome" ]]; then
  mv "$PROFILE/chrome" "$PROFILE/chrome.backup-$STAMP"
  info "backed up existing chrome/ to chrome.backup-$STAMP"
fi
mkdir -p "$PROFILE/chrome"
cp -r "$REPO_DIR/chrome/." "$PROFILE/chrome/"
cp -r "$VENDOR/profile/chrome/utils" "$PROFILE/chrome/utils"
info "installed chrome/ files"

merge_user_js "$PROFILE" "$REPO_DIR/user.js"
[[ $PRIVACY_PREFS -eq 1 ]] && merge_user_js "$PROFILE" "$REPO_DIR/extras/privacy-performance.user.js"
clear_startup_cache "$PROFILE"

echo
info "Done. Start Firefox. Vertical tabs: Settings → General → Browser Layout,"
info "or set sidebar.verticalTabs in about:config."
info "After a Firefox package update, if the layout breaks, rerun with --autoconfig-only"
