"use client";

// Browser Firebase: Google sign-in only. Jobs are never read from the browser.
import { getApps, initializeApp } from "firebase/app";
import { deleteUser, GoogleAuthProvider, getAuth, onAuthStateChanged, reauthenticateWithPopup, signInWithPopup, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { FIREBASE_WEB_CONFIG } from "@/config/public";

function auth() {
  const app =
    getApps()[0] ??
    initializeApp(FIREBASE_WEB_CONFIG);
  return getAuth(app);
}

export const signInWithGoogle = () => signInWithPopup(auth(), new GoogleAuthProvider());
export const signOutUser = () => signOut(auth());

/** Deletes the signed-in Google account from Firebase Auth (asks to confirm sign-in again if it was long ago). */
export async function deleteSignedInUser(): Promise<void> {
  const user = auth().currentUser;
  if (!user) return;
  try {
    await deleteUser(user);
  } catch (e) {
    if ((e as { code?: string }).code !== "auth/requires-recent-login") throw e;
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    await deleteUser(user);
  }
}

/** undefined while loading, null when signed out. */
export function useUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth(), setUser), []);
  return user;
}

/** fetch() with the signed-in user's ID token. */
export async function authedFetch(user: User, url: string, init: RequestInit = {}): Promise<Response> {
  const token = await user.getIdToken();
  return fetch(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}`, "content-type": "application/json" } });
}
