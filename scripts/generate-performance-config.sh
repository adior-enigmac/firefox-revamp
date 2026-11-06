#!/usr/bin/env bash
# Select a profile from hardware information. Outputs explanatory text plus a
# profile file; it does not inspect browser capabilities or modify a profile.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mode="${1:-auto}"
case "$mode" in
  auto)
    mem="$(awk '/^MemTotal:/ {print int($2/1024); exit}' /proc/meminfo 2>/dev/null || true)"
    cpus="$(getconf _NPROCESSORS_ONLN 2>/dev/null || true)"
    if [[ -z "$mem" || -z "$cpus" ]]; then mode=balanced
    elif (( mem <= 4096 || cpus <= 2 )); then mode=low-end
    elif (( mem >= 16384 && cpus >= 8 )); then mode=high-performance
    else mode=balanced; fi
    ;;
  low-end|balanced|high-performance) ;;
  *) echo "usage: $0 [auto|low-end|balanced|high-performance]" >&2; exit 2;;
esac
echo "Selected profile: $mode (heuristic based on RAM and logical CPUs only)."
echo "Firefox hardware capability detection remains Firefox's responsibility."
cat "$ROOT/extras/performance/$mode.user.js"
