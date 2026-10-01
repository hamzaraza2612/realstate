import { Redirect } from 'expo-router'

/** Any unknown (or guard-protected) path falls back to `/`, which routes by session. */
export default function NotFound() {
  return <Redirect href="/" />
}
