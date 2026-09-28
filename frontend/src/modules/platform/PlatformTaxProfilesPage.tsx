import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { useCountries } from '@/modules/settings/api'
import type { TaxProfileDto, TaxRateDto } from '@/types/api'
import { usePlatformTaxProfiles } from './api'
import { TaxProfileFormDialog } from './TaxProfileFormDialog'
import { TaxRateFormDialog } from './TaxRateFormDialog'

const ALL_COUNTRIES = 'all'

export function PlatformTaxProfilesPage() {
  const { data: countries } = useCountries()
  const [countryFilter, setCountryFilter] = useState(ALL_COUNTRIES)
  const { data: profiles, isLoading, isError, refetch } = usePlatformTaxProfiles(countryFilter === ALL_COUNTRIES ? undefined : countryFilter)

  const [editingProfile, setEditingProfile] = useState<TaxProfileDto | 'new' | null>(null)
  const [rateContext, setRateContext] = useState<{ taxProfileId: string; rate: TaxRateDto | 'new' } | null>(null)

  return (
    <div>
      <PageHeader
        title="Tax Profiles"
        description="Country tax profiles and their effective-dated rates, used to snapshot tax onto invoices and preview rates in tenant localization settings."
        actions={
          <Button onClick={() => setEditingProfile('new')}>
            <Plus className="h-4 w-4" /> New tax profile
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_COUNTRIES}>All countries</SelectItem>
            {(countries ?? []).map((c) => (
              <SelectItem key={c.alpha2} value={c.alpha2}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading tax profiles…" />}
      {isError && <ErrorState message="Could not load tax profiles." onRetry={() => refetch()} />}
      {!isLoading && !isError && (profiles ?? []).length === 0 && (
        <EmptyState title="No tax profiles yet" description="Create a tax profile for a country to start adding rates." />
      )}

      {!isLoading && !isError && (profiles ?? []).length > 0 && (
        <div className="space-y-4">
          {(profiles ?? []).map((profile) => {
            const countryName = countries?.find((c) => c.alpha2 === profile.countryCode)?.name ?? profile.countryCode
            return (
              <Card key={profile.id}>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle>
                      {profile.name} <span className="font-mono text-xs font-normal text-muted-foreground">({profile.code})</span>
                    </CardTitle>
                    <CardDescription>
                      {countryName}
                      {profile.description ? ` · ${profile.description}` : ''}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={profile.isActive ? 'success' : 'outline'}>{profile.isActive ? 'Active' : 'Inactive'}</Badge>
                    <Button variant="outline" size="sm" onClick={() => setEditingProfile(profile)}>
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {profile.rates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No rates configured yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Effective</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.rates.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-xs">{r.rateCode}</TableCell>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell>{r.percentage}%</TableCell>
                            <TableCell className="text-muted-foreground">{r.isInclusive ? 'Inclusive' : 'Exclusive'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(r.effectiveFrom)}
                              {r.effectiveTo ? ` – ${formatDate(r.effectiveTo)}` : ''}
                            </TableCell>
                            <TableCell>
                              <Badge variant={r.isActive ? 'success' : 'outline'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => setRateContext({ taxProfileId: profile.id, rate: r })}>
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" onClick={() => setRateContext({ taxProfileId: profile.id, rate: 'new' })}>
                    <Plus className="h-4 w-4" /> Add rate
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <TaxProfileFormDialog profile={editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)} />
      <TaxRateFormDialog
        taxProfileId={rateContext?.taxProfileId}
        rate={rateContext?.rate ?? null}
        onOpenChange={(open) => !open && setRateContext(null)}
      />
    </div>
  )
}
