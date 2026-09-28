import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useI18n, type Language } from '@/lib/i18n'
import { useAuthStore } from '@/stores/authStore'
import { FirstDayOfWeek, FirstDayOfWeekLabel, MeasurementSystem, MeasurementSystemLabel } from '@/types/api'
import { useCountries, useCurrencies, useCurrentLocalization, useTaxRatesByCountry, useUpdateLocalization } from './api'

interface FormState {
  countryCode: string
  currency: string
  locale: string
  timezone: string
  dateFormat: string
  firstDayOfWeek: string
  defaultLanguage: Language
  measurementSystem: string
}

const EMPTY_FORM: FormState = {
  countryCode: '',
  currency: '',
  locale: '',
  timezone: '',
  dateFormat: '',
  firstDayOfWeek: String(FirstDayOfWeek.Sunday),
  defaultLanguage: 'en',
  measurementSystem: String(MeasurementSystem.Metric),
}

export function LocalizationSettingsPage() {
  const { t, setLanguage } = useI18n()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canManage = hasPermission('organizations.manage')

  const { data: localization, isLoading, isError, refetch } = useCurrentLocalization()
  const { data: countries } = useCountries()
  const { data: currencies } = useCurrencies()
  const updateLocalization = useUpdateLocalization()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    if (localization) {
      setForm({
        countryCode: localization.countryCode ?? '',
        currency: localization.currency,
        locale: localization.locale,
        timezone: localization.timezone,
        dateFormat: localization.dateFormat,
        firstDayOfWeek: String(localization.firstDayOfWeek),
        defaultLanguage: localization.defaultLanguage === 'ar' ? 'ar' : 'en',
        measurementSystem: String(localization.measurementSystem),
      })
    }
  }, [localization])

  const { data: taxRates, isLoading: taxLoading } = useTaxRatesByCountry(form.countryCode || undefined)

  const selectedCountry = countries?.find((c) => c.alpha2 === form.countryCode)
  const selectedCurrency = currencies?.find((c) => c.code === form.currency)

  function handleCountryChange(value: string) {
    const country = countries?.find((c) => c.alpha2 === value)
    setForm((f) => ({
      ...f,
      countryCode: value,
      currency: country?.defaultCurrency ?? f.currency,
      locale: country?.defaultLocale ?? f.locale,
      timezone: country?.defaultTimezone ?? f.timezone,
    }))
  }

  // The Language select IS the app's language switcher — flipping it applies immediately (live
  // RTL/translation preview) via useI18n().setLanguage, independent of hitting Save, which only
  // persists it as the tenant's defaultLanguage.
  function handleLanguageChange(value: string) {
    const language: Language = value === 'ar' ? 'ar' : 'en'
    setForm((f) => ({ ...f, defaultLanguage: language }))
    setLanguage(language)
  }

  async function handleSave() {
    try {
      await updateLocalization.mutateAsync({
        countryCode: form.countryCode || null,
        currency: form.currency,
        locale: form.locale,
        timezone: form.timezone,
        dateFormat: form.dateFormat,
        firstDayOfWeek: Number(form.firstDayOfWeek) as FirstDayOfWeek,
        defaultLanguage: form.defaultLanguage,
        secondaryLanguages: localization?.secondaryLanguages ?? null,
        measurementSystem: Number(form.measurementSystem) as MeasurementSystem,
      })
      toast({ title: t('settings.localization.saveSuccess'), variant: 'success' })
    } catch (error) {
      toast({ title: t('settings.localization.saveError'), description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label={t('common.loading')} />
  if (isError || !localization) return <ErrorState message={t('settings.localization.loadError')} onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title={t('settings.localization.title')} description={t('settings.localization.description')} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('settings.localization.title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t('settings.localization.country')}</Label>
              <Select value={form.countryCode} onValueChange={handleCountryChange} disabled={!canManage}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.localization.countryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(countries ?? []).map((c) => (
                    <SelectItem key={c.alpha2} value={c.alpha2}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('settings.localization.currency')}</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))} disabled={!canManage}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.localization.currencyPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(currencies ?? []).map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('settings.localization.language')}</Label>
              <Select value={form.defaultLanguage} onValueChange={handleLanguageChange} disabled={!canManage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('settings.localization.languageEnglish')}</SelectItem>
                  <SelectItem value="ar">{t('settings.localization.languageArabic')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loc-timezone">{t('settings.localization.timezone')}</Label>
              <Input
                id="loc-timezone"
                placeholder={t('settings.localization.timezonePlaceholder')}
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                disabled={!canManage}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loc-date-format">{t('settings.localization.dateFormat')}</Label>
              <Input
                id="loc-date-format"
                placeholder={t('settings.localization.dateFormatPlaceholder')}
                value={form.dateFormat}
                onChange={(e) => setForm((f) => ({ ...f, dateFormat: e.target.value }))}
                disabled={!canManage}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('settings.localization.firstDayOfWeek')}</Label>
              <Select value={form.firstDayOfWeek} onValueChange={(v) => setForm((f) => ({ ...f, firstDayOfWeek: v }))} disabled={!canManage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FirstDayOfWeekLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('settings.localization.measurementSystem')}</Label>
              <Select
                value={form.measurementSystem}
                onValueChange={(v) => setForm((f) => ({ ...f, measurementSystem: v }))}
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(MeasurementSystem.Metric)}>{t('settings.localization.measurementMetric')}</SelectItem>
                  <SelectItem value={String(MeasurementSystem.Imperial)}>{t('settings.localization.measurementImperial')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {MeasurementSystemLabel[Number(form.measurementSystem) as MeasurementSystem]}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-end gap-1.5">
            <Button onClick={handleSave} disabled={!canManage || updateLocalization.isPending}>
              {updateLocalization.isPending ? `${t('common.save')}…` : t('common.save')}
            </Button>
            {!canManage && <p className="text-xs text-muted-foreground">{t('settings.localization.saveDisabledHint')}</p>}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.localization.preview')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t('settings.localization.previewCurrency')}</span>
              <span className="font-medium">
                {form.currency || '—'}
                {selectedCurrency ? ` — ${selectedCurrency.symbol}` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t('settings.localization.previewLocale')}</span>
              <span className="font-medium">
                {form.defaultLanguage === 'ar' ? t('settings.localization.languageArabic') : t('settings.localization.languageEnglish')}
                {selectedCountry ? ` (${selectedCountry.name})` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t('settings.localization.previewTimezone')}</span>
              <span className="font-medium">{form.timezone || '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t('settings.localization.previewLanguage')}</span>
              <span className="font-medium">
                {t('settings.localization.languageEnglish')} / {t('settings.localization.languageArabic')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t('settings.localization.taxConfiguration')}</CardTitle>
          <CardDescription>{t('settings.localization.taxConfigurationDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {taxLoading ? (
            <LoadingState label={t('common.loading')} />
          ) : !taxRates || taxRates.length === 0 ? (
            <EmptyState title={t('settings.localization.taxEmptyTitle')} description={t('settings.localization.taxEmptyDescription')} />
          ) : (
            <div className="space-y-2">
              {taxRates.map((rate) => (
                <div key={rate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span>
                    {rate.name} — {rate.percentage}% ({rate.isInclusive ? 'inclusive' : 'exclusive'})
                  </span>
                  <Badge variant={rate.isActive ? 'success' : 'outline'}>{rate.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
