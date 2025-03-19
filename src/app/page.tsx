export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          JFK Assassination Records
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-gray-500">
          Explore declassified documents from the National Archives JFK Collection
        </p>
      </section>

      {/* Stats Section */}
      <section className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900">2,182</p>
            <p className="text-gray-500">Documents Available</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900">2025</p>
            <p className="text-gray-500">Release Year</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900">NARA</p>
            <p className="text-gray-500">Source Archive</p>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse Documents</h2>
          <p className="text-gray-500 mb-4">
            Access the complete collection of declassified JFK assassination records.
          </p>
          <a href="/documents" className="text-blue-600 hover:text-blue-800">
            View all documents →
          </a>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Search Records</h2>
          <p className="text-gray-500 mb-4">
            Search through document contents and metadata using our advanced search tools.
          </p>
          <a href="/search" className="text-blue-600 hover:text-blue-800">
            Start searching →
          </a>
        </div>
      </section>
    </div>
  );
}
