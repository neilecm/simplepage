export function startRedirectCountdown(seconds, targetSelector, displaySelector) {
  let remaining = seconds;
  const link = document.querySelector(targetSelector);
  const timer = document.querySelector(displaySelector);

  const interval = setInterval(() => {
    remaining--;
    if (timer) timer.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(interval);
      window.location.href = link.href;
    }
  }, 1000);
}
