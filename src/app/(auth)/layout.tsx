export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display font-semibold text-4xl text-ink mb-2">☕ Bean <span className="text-brass">Ledger</span></h1>
          <p className="text-ink-soft">Professional Coffee Management</p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-brass/20">
          {children}
        </div>
        <div className="mt-6 text-center text-sm text-ink-soft">
          <p>Manage your coffee roasting and brewing with data-driven insights</p>
        </div>
      </div>
    </div>
  )
}