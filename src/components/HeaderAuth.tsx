"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithGoogle, useUser } from "@/lib/firebase/client";

/** Top-right account button: "Sign up / Sign in" when signed out, "My profile" when signed in. */
export function HeaderAuth() {
  const user = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (user === undefined) return <span className="h-9 w-24" aria-hidden />;

  if (user) {
    const initial = (user.displayName ?? user.email ?? "?").trim().charAt(0).toUpperCase();
    return (
      <Link href="/profile" className="flex items-center gap-2" title={user.email ?? "My profile"}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">{initial}</span>
        <span className="hidden sm:inline">My profile</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      className="btn-primary h-9 px-4 text-sm"
      onClick={async () => {
        setBusy(true);
        try {
          await signInWithGoogle();
          router.push("/profile");
        } catch {
          // Pop-up closed or blocked: fall back to the profile page, which explains sign-in.
          router.push("/profile");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Opening…" : (
        <>
          <span className="sm:hidden">Sign in</span>
          <span className="hidden sm:inline">Sign up / Sign in</span>
        </>
      )}
    </button>
  );
}
