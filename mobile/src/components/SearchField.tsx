import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { Input } from './Input'

/**
 * Search box for list screens whose backend endpoint has a `search` filter param. Reports the
 * trimmed text after the user pauses typing (debounced), so each keystroke doesn't fire a request.
 */
export function SearchField({ onSearch, placeholder, delayMs = 400 }: { onSearch: (value: string) => void; placeholder?: string; delayMs?: number }) {
  const { t } = useI18n()
  const [text, setText] = useState('')

  useEffect(() => {
    const handle = setTimeout(() => onSearch(text.trim()), delayMs)
    return () => clearTimeout(handle)
  }, [text, delayMs, onSearch])

  return (
    <Input
      value={text}
      onChangeText={setText}
      placeholder={placeholder ?? t('list.searchPlaceholder')}
      accessibilityLabel={placeholder ?? t('list.searchPlaceholder')}
      returnKeyType="search"
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="while-editing"
    />
  )
}
