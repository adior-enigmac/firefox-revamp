# Reproducible performance comparison

No performance gains are claimed by this project. The profiles currently keep
Firefox defaults, so measurements establish a baseline before any future
candidate preference is considered.

For each run, record Firefox version/build ID (`about:support`), OS/kernel,
profile type, CPU/GPU/driver, RAM, display/session, power mode, extensions,
network, and exact test URLs/data. Use a fresh cloned profile per condition;
disable background updates only for the duration of the controlled run and
restore the normal environment afterward. Compare stock and each profile in
randomized order with at least five repetitions after one warm-up. Keep cache
state consistent and report median plus range; don't compare a cold start to a
warm start.

Measure:

* Startup: external monotonic clock from launch to a fixed page's usable marker.
* Memory/CPU: sample Firefox process tree RSS and CPU once per second for a
  fixed 5-minute scripted workload; report peak and mean.
* Tab switching: scripted fixed set of loaded tabs, 30 switches, measure
  input-to-paint latency with browser performance tracing.
* Scrolling: same local long page and scripted scroll path; record frame
  pacing/jank from Firefox Profiler.
* Video: same codec/resolution/stream and playback interval; record dropped
  frames from the player stats and CPU use. Record hardware decoder status in
  `about:support`.
* Page loads: fixed local or controlled server fixture, 10 repetitions; record
  navigation-to-load and navigation-to-network-idle times.

Publish raw observations, tool versions and deviations with any result. Do not
turn one machine's result into a cross-device claim.
