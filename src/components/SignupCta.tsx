"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithGoogle, useUser } from "@/lib/firebase/client";

const STEPS = [
  ["Sign up", "One tap with Google."],
  ["Add your resume", "Upload it, or enter your details and we make one for you."],
  ["Get matched jobs", "New jobs that fit your skills by email or Telegram, plus ATS-friendly resumes to download."],
];

/** Home-page invitation to create a profile; hidden once signed in. */
export function SignupCta() {
  const user = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (user !== null) return null; // loading or signed in

  return (
    <section className="card mb-8 grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <h2 className="display text-2xl">Create your free profile</h2>
        <ol className="mt-3 grid gap-3 text-[15px] sm:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <b className="text-ink">{i + 1}. {title}</b>
              <br />
              {text}
            </li>
          ))}
        </ol>
      </div>
      <button
        type="button"
        disabled={busy}
        className="btn-primary"
        onClick={async () => {
          setBusy(true);
          await signInWithGoogle().catch(() => undefined);
          router.push("/profile");
        }}
      >
        {busy ? "Opening…" : "Sign up free"}
      </button>
    </section>
  );
}
