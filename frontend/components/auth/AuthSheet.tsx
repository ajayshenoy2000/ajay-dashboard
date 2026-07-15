"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { signIn, signUp } from "@/lib/auth";
import { ensureSession } from "@/lib/session";

interface AuthSheetProps {
  open: boolean;
  onClose: () => void;
  onAuthed?: () => void;
}

export function AuthSheet({ open, onClose, onAuthed }: AuthSheetProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);

  useEffect(() => {
    ensureSession()
      .then((session) => setIsAnonymous(Boolean(session.user.is_anonymous)))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      onAuthed?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={mode === "signup" ? "Create your account" : "Sign in"}>
      {isAnonymous && (
        <p className="mb-4 text-sm leading-6 text-ink/60">
          {mode === "signup"
            ? "Secure your data — your current activity stays attached to this account."
            : "Signing into an existing account will merge this device's activity into it."}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-ink/70">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 w-full rounded-md border border-ink/10 bg-mist px-3 text-sm font-semibold outline-none focus:border-sage"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-ink/70">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 w-full rounded-md border border-ink/10 bg-mist px-3 text-sm font-semibold outline-none focus:border-sage"
          />
        </label>
        {error && <p className="text-xs font-semibold text-coral">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-coral text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="mt-3 w-full text-center text-xs font-semibold text-ink/50 hover:text-ink/70"
      >
        {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>
    </BottomSheet>
  );
}
