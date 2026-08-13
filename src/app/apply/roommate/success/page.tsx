import { getConfig } from '@/lib/config'
import { Locale } from '@/lib/i18n'
import RoommateSuccessClient from '@/components/roommate/RoommateSuccessClient'

export const dynamic = 'force-dynamic'

export default async function RoommateSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const config = await getConfig()
  const { lang } = await searchParams
  const locale: Locale = lang === 'fr' ? 'fr' : 'en'

  return (
    <RoommateSuccessClient
      locale={locale}
      companyName={config.companyName}
      logoUrl={config.logoUrl}
    />
  )
}
