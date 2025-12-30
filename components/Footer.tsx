'use client';

import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations();
  
  return (
    <footer className="bg-[#333333] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm text-gray-300 mb-2">
            {t('footer.license')}
          </p>
          <p className="text-lg font-medium">
            {t('footer.licenseNumber')}
          </p>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-600 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} {t('footer.copyright')}</p>
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
