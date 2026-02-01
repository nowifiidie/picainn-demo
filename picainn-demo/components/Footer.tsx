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
        <div className="mt-6 text-center text-sm text-gray-300">
          <p className="font-medium text-white">{t('footer.companyName')}</p>
          <p className="mt-1">{t('footer.address')}</p>
          <p className="mt-1">
            Tel <a href={`tel:${t('footer.tel').replace(/\s/g, '')}`} className="hover:text-white transition-colors underline">{t('footer.tel')}</a>
            {' · '}
            Fax {t('footer.fax')}
          </p>
          <p className="mt-1">
            <a 
              href={`mailto:${t('footer.email')}`} 
              className="text-gray-300 hover:text-white transition-colors underline"
            >
              {t('footer.email')}
            </a>
          </p>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-600 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} {t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
