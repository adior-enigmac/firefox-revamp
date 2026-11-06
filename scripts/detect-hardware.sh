#!/usr/bin/env bash
# Best-effort, read-only Linux hardware report; optional diagnostics are optional.
set -u
ram_kb="$(awk '/^MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || true)"
avail_kb="$(awk '/^MemAvailable:/ {print $2; exit}' /proc/meminfo 2>/dev/null || true)"
cpu_model="$(awk -F: '/model name|Hardware/ {gsub(/^[ \t]+/,"",$2); print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
logical="$(getconf _NPROCESSORS_ONLN 2>/dev/null || true)"
arch="$(uname -m 2>/dev/null || true)"
gpu="$(lspci -nn 2>/dev/null | awk 'BEGIN{IGNORECASE=1} /vga compatible controller|3d controller|display controller/ {sub(/^.*: /,""); print; exit}' || true)"
driver=""
if command -v glxinfo >/dev/null 2>&1; then
  driver="$(glxinfo -B 2>/dev/null | awk -F: '/OpenGL renderer string|OpenGL vendor string/ {gsub(/^[ \t]+/,"",$2); printf "%s%s", sep,$2; sep=" / "}' || true)"
fi
if [[ -z "$driver" ]] && command -v vulkaninfo >/dev/null 2>&1; then
  driver="$(vulkaninfo --summary 2>/dev/null | awk -F= '/deviceName/ {gsub(/^[ \t]+/,"",$2); print $2; exit}' || true)"
fi
session="${XDG_SESSION_TYPE:-unknown}"
firefox_type="unknown"
if command -v firefox >/dev/null 2>&1; then
  bin="$(readlink -f "$(command -v firefox)" 2>/dev/null || true)"
  case "$bin" in /snap/*) firefox_type=snap;; /app/*) firefox_type=flatpak;; *) firefox_type=system-or-tarball;; esac
elif command -v flatpak >/dev/null 2>&1 && flatpak info org.mozilla.firefox >/dev/null 2>&1; then
  firefox_type=flatpak
fi
printf 'RAM total (MiB): %s\n' "${ram_kb:+$((ram_kb / 1024))}"
printf 'RAM available now (MiB): %s\n' "${avail_kb:+$((avail_kb / 1024))}"
printf 'CPU: %s\nLogical CPUs: %s\nArchitecture: %s\n' "${cpu_model:-unavailable}" "${logical:-unavailable}" "${arch:-unavailable}"
printf 'GPU: %s\nGPU driver/renderer: %s\nSession: %s\nFirefox type: %s\n' "${gpu:-unavailable (lspci missing or no display device)}" "${driver:-unavailable (glxinfo/vulkaninfo missing or unsupported)}" "$session" "$firefox_type"
