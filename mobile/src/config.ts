/**
 * Runtime configuration. `EXPO_PUBLIC_*` variables are inlined into the bundle at build time by
 * Expo (see `.env.example`) — fine for a URL, never for a secret. The default targets a local API
 * on the same machine (iOS simulator / web preview); an Android emulator needs 10.0.2.2 and a
 * physical device needs the API host's LAN IP — see `.env.example`.
 */
export const API_BASE_URL: string = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5080/api/v1').replace(/\/+$/, '')
