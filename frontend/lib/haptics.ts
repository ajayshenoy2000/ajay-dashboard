// Thin wrapper around the Vibration API — a no-op on browsers/devices that don't support it
// (iOS Safari notably doesn't, so this must never be relied on for anything functional).
export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
