export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-amber-900 mb-4">☕ Bean Ledger</h1>
        <p className="text-xl text-amber-700 mb-8">
          Professional Coffee Roasting & Brewing Management
        </p>
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <p className="text-amber-800">
            Setting up your coffee management system...
          </p>
        </div>
      </div>
    </main>
  )
}