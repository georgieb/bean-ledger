export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Coffee Inventory</h1>
        <p className="text-gray-600">Manage your roasted and green coffee inventory</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Coming Soon in Stage 4!</h2>
        <p className="text-gray-600 mb-4">
          This page will feature the core ledger system with real-time inventory calculations.
        </p>
        <div className="text-sm text-gray-500">
          Features: Roasted coffee tracking • Green coffee management • Smart recommendations
        </div>
      </div>
    </div>
  )
}