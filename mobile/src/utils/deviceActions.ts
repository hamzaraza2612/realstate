import { Linking } from 'react-native'

/**
 * Real device hand-offs for contact fields: `tel:` opens the phone dialer, `mailto:` the mail app.
 * They only launch the OS app — nothing is logged or recorded in the ERP by doing so (the backend
 * has no "call made" endpoint; a call is recorded only if the user then logs a CRM activity).
 * Each returns false when the OS has nothing that can handle the URL (e.g. no dialer on a tablet).
 */

function sanitizePhone(phone: string): string {
  // Keep a leading + and digits/separators the dialer understands; drop letters and spaces.
  return phone.trim().replace(/[^\d+*#,;]/g, '')
}

async function open(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

export function callPhone(phone: string): Promise<boolean> {
  return open(`tel:${sanitizePhone(phone)}`)
}

export function sendEmail(email: string): Promise<boolean> {
  return open(`mailto:${encodeURIComponent(email.trim()).replace(/%40/g, '@')}`)
}
