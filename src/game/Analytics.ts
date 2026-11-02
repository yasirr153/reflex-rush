
declare global {
  interface Window {
    gtag?: (
      command: 'event',
      eventName: string,
      parameters?: Record<string, string | number | boolean>
    ) => void;
  }
}

export function trackEvent(
  eventName: string,
  parameters: Record<string, string | number | boolean> = {}
): void {
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', eventName, parameters);
}
