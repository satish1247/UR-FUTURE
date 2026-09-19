import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-urfuture";
  // Emulator needs no credentials; production needs the service-account trio.
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId });
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Accept the key pasted with or without surrounding quotes, with real or escaped (\n) newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (see .env.example)");
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

let configured = false;
export function db() {
  const firestore = getFirestore(initAdmin());
  // Optional fields arrive as undefined (e.g. no deadline); store them as absent.
  if (!configured) {
    configured = true;
    try {
      firestore.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Another bundle (Next loads route modules separately) already applied these settings to the shared app.
    }
  }
  return firestore;
}

