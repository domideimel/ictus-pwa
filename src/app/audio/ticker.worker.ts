/// <reference lib="webworker" />

/**
 * Wakes the click scheduler every 25 ms. Timers in a worker keep running when the page is in the
 * background, where main-thread timers are throttled to once a second and the click would stall.
 */
let timer: ReturnType<typeof setInterval> | undefined;

addEventListener('message', ({ data }: MessageEvent<'start' | 'stop'>) => {
  clearInterval(timer);
  timer = data === 'start' ? setInterval(() => postMessage(null), 25) : undefined;
});
