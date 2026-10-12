// Expo's default Metro config plus Sentry's: debug IDs in the bundle and its
// source maps (so stack traces map back to source), Sentry frames collapsed in LogBox.
// src: https://docs.sentry.io/platforms/react-native/manual-setup/expo/ · 8.30.0 · 2026-10-12
/* global __dirname -- Node's CommonJS wrapper provides it; ESLint's commonjs globals don't list it */
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
