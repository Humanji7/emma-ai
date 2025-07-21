export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-trust-50 to-warm-50 flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-5xl font-bold text-trust-800 mb-4">
          Emma AI
        </h1>
        <p className="text-xl text-neutral-700 mb-8">
          Real-time relationship coaching with crisis detection
        </p>
        <div className="space-y-4">
          <a
            href="/test"
            className="inline-block px-8 py-4 bg-trust-600 text-white rounded-xl hover:bg-trust-700 transition-colors font-medium"
          >
            Test Voice Interface
          </a>
          <p className="text-sm text-neutral-600">
            Development build - API keys configured 
          </p>
        </div>
      </div>
    </div>
  )
}