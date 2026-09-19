// Proves a browser can neither read nor write anything. Runs on the emulator: npm run test:emu
import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/firebase/admin";

const browser = getFirestore(initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-urfuture" }, "browser"));
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");
connectFirestoreEmulator(browser, host, Number(port));

describe("firestore rules", () => {
  beforeAll(async () => {
    await db().doc("jobs/rules-active").set({ status: "active", title: "a" });
    await db().doc("ingestRuns/r1").set({ found: 1 });
  });

  it("denies every browser read", async () => {
    await expect(getDoc(doc(browser, "jobs/rules-active"))).rejects.toThrow();
    await expect(getDoc(doc(browser, "ingestRuns/r1"))).rejects.toThrow();
  });

  it("denies every browser write", async () => {
    await expect(setDoc(doc(browser, "jobs/new"), { status: "active" })).rejects.toThrow();
    await expect(setDoc(doc(browser, "jobs/rules-active"), { status: "active", title: "hacked" })).rejects.toThrow();
  });
});
