"use client";

import { useEffect, useSyncExternalStore } from "react";

// Controls the chat screen injects into the bottom nav so Mio's controls
// (new chat and history) live in the primary nav bar rather than
// duplicated inside the page.
//
// Implemented as a tiny external store (not React context state) so that
// registering controls re-renders ONLY the nav (the consumer), never the chat
// screen that publishes them. Besides being more efficient, this avoids the
// child→parent "setState while rendering" coupling that a context-state
// provider would create.
export interface ChatNavControls {
  onNewChat: () => void;
  onOpenHistory: () => void;
}

let current: ChatNavControls | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

// Passthrough kept for import stability (mounted in app/layout.tsx). The store
// is module-level, so no React provider is actually required.
export function NavControlsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useNavControls(): ChatNavControls | null {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

// Called by the chat screen to publish its controls while mounted; clears them
// on unmount so the nav reverts to plain navigation.
export function useRegisterChatControls(controls: ChatNavControls) {
  const { onNewChat, onOpenHistory } = controls;
  useEffect(() => {
    current = { onNewChat, onOpenHistory };
    emit();
    return () => { current = null; emit(); };
  }, [onNewChat, onOpenHistory]);
}
