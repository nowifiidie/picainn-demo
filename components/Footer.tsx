export default function Footer() {
  return (
    <footer className="bg-[#333333] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm text-gray-300 mb-2">
            Residential Accommodation Business Act License No.
          </p>
          <p className="text-lg font-medium">
            第M000000000号
          </p>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-600 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} picainn. All rights reserved.</p>
          <p className="mt-2">
            <a 
              href="mailto:info@picainn.com" 
              className="text-gray-300 hover:text-white transition-colors underline"
            >
              info@picainn.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
