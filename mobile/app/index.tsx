import { Redirect } from 'expo-router'
import { HOME_FOR_MODE, useAppMode } from '@/navigation/appMode'

/** `/` — sends the user to the home of whichever session they have (or the sign-in chooser). */
export default function Index() {
  const mode = useAppMode()
  if (mode === 'restoring') return null
  return <Redirect href={HOME_FOR_MODE[mode]} />
}
