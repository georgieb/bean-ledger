export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure your preferences and account settings</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Preferences</h2>
        <p className="text-gray-600 mb-4">
          Customize your Bean Ledger experience.
        </p>
        <div className="text-sm text-gray-500">
          Features: Daily consumption • Default roast size • Brew ratios • Timezone settings
        </div>
      </div>
    </div>
  )
}