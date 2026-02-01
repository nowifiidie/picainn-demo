'use client';

import { useState } from 'react';
import { Menu, X, Globe } from 'lucide-react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/routing';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const navLinks = [
    { href: '#gallery', label: t('nav.room') },
    { href: '#location', label: t('nav.location') },
    { href: '#inquiry', label: t('nav.inquiry') },
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'zh', name: '简体中文' },
    { code: 'ko', name: '한국어' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'th', name: 'ไทย' },
    { code: 'ar', name: 'العربية' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'my', name: 'မြန်မာ' },
  ];

  const handleLanguageChange = (locale: string) => {
    router.replace(pathname, { locale });
    setLanguageMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <a href={`/${currentLocale}`} className="flex items-center hover:opacity-80 transition-opacity">
              {/* Full logo - no text needed */}
              <Image
                src="/logo.png"
                alt={`${t('brand.siteName')} logo`}
                width={100}
                height={100}
                className="h-10 w-[150px] object-contain"
                priority
                unoptimized
              />
            </a>
          </div>

          {/* Right side: Desktop Navigation, Language Switcher, and Mobile Menu Button */}
          <div className="flex items-center gap-4">
            {/* Desktop Navigation - moved to right */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#333333] hover:text-[#8B7355] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#333333] hover:text-[#8B7355] transition-colors rounded-md hover:bg-gray-100"
                aria-label="Change language"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {languages.find(lang => lang.code === currentLocale)?.name || 'EN'}
                </span>
              </button>

              {/* Language Dropdown */}
              {languageMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setLanguageMenuOpen(false)}
                  />
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 max-h-96 overflow-y-auto bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          currentLocale === lang.code
                            ? 'bg-[#8B7355] text-white'
                            : 'text-[#333333] hover:bg-gray-100'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden text-[#333333]"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-[#333333] hover:text-[#8B7355] transition-colors"
              >
                {link.label}
              </a>
            ))}
            {/* Mobile Language Switcher */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-[#333333]" />
                <span className="text-sm font-medium text-[#333333]">Language</span>
              </div>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    handleLanguageChange(lang.code);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${
                    currentLocale === lang.code
                      ? 'bg-[#8B7355] text-white'
                      : 'text-[#333333] hover:bg-gray-100'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
