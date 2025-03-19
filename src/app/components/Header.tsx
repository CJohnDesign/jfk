import Link from 'next/link'

export default function Header() {
  return (
    <header className="border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold">
              JFK Files
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="/documents" className="text-gray-600 hover:text-gray-900">
              Documents
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-gray-900">
              About
            </Link>
            <Link href="/search" className="text-gray-600 hover:text-gray-900">
              Search
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
} 