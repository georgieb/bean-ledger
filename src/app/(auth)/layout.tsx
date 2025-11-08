export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">☕ Bean Ledger</h1>
          <p className="text-amber-700">Professional Coffee Management</p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-amber-200/50">
          {children}
        </div>
        <div className="mt-6 text-center text-sm text-amber-600">
          <p>Manage your coffee roasting and brewing with data-driven insights</p>
        </div>
      </div>
    </div>
  )
}