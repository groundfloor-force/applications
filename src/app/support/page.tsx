import { getConfig } from '@/lib/config'
import SupportForm from '@/components/SupportForm'

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const config = await getConfig()

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-white border-b border-brand-border">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoUrl} alt={config.companyName} className="h-9 sm:h-12 object-contain" />
        </div>
      </header>

      <main className="flex-1 px-4 py-10 sm:py-16">
        <SupportForm />
      </main>

      <footer className="border-t border-brand-border bg-white py-6 text-center text-sm text-brand-gray">
        &copy; {new Date().getFullYear()} {config.companyName}. All rights reserved.
      </footer>
    </div>
  )
}
