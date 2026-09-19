// Public settings. Firebase web config is meant to be public (it ships to every browser);
// access is controlled by Firebase Auth and the server, not by hiding these values.
// Environment variables override them when set (and not blank).
const pick = (value: string | undefined, fallback: string) => value?.trim() || fallback;

export const FIREBASE_WEB_CONFIG = {
  apiKey: pick(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "AIzaSyDZ-WpxepK002NuNbLiHu2zXW7xLTwhaJ0"),
  authDomain: pick(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, "ur-future-2026.firebaseapp.com"),
  projectId: pick(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "ur-future-2026"),
  appId: pick(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, "1:305851312759:web:32d5fe6718b459a9e4f472"),
};

export const TELEGRAM_BOT_USERNAME = pick(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME, "UR_FUTURE_JOBS_BOT");
