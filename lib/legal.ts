import { WEB_APP_URL } from "@/lib/env";

// The privacy policy and terms live on the web app (../LINARA/src/routes/
// privacy.tsx and terms.tsx), so both apps show the same text. A build
// without EXPO_PUBLIC_WEB_APP_URL falls back to the deployed dashboard.
const BASE = WEB_APP_URL ?? "https://linara-delta.vercel.app";

export const PRIVACY_URL = `${BASE}/privacy`;
export const TERMS_URL = `${BASE}/terms`;

/** How long a pending account deletion may wait (same as the web's legal.constants.ts). */
export const DELETION_WINDOW_DAYS = 30;
