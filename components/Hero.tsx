'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function Hero() {
  const t = useTranslations();
  const [heroImageUrl, setHeroImageUrl] = useState<string>('/images/hero/hero-background.jpg');
  const [lastTimestamp, setLastTimestamp] = useState<number>(0);

  useEffect(() => {
    // Check localStorage first (in case image was just uploaded)
    const storedUrl = localStorage.getItem('heroImageUrl');
    const storedTimestamp = localStorage.getItem('heroImageTimestamp');
    if (storedUrl && storedTimestamp) {
      const timestamp = parseInt(storedTimestamp);
      // Use stored URL if it's recent (within last hour)
      if (Date.now() - timestamp < 3600000) {
        console.log('Using stored hero image URL:', storedUrl);
        setHeroImageUrl(storedUrl);
        setLastTimestamp(timestamp);
      }
    }

    // Fetch hero image URL from API with cache busting
    const fetchHeroImage = async () => {
      try {
        const response = await fetch(`/api/cms/hero-image?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        const data = await response.json();
        console.log('Hero image API response:', data);
        if (data.url) {
          // Only use API URL if it's not the fallback static path, or if we don't have a stored URL
          if (!storedUrl || !data.url.startsWith('/images/hero/')) {
            console.log('Setting hero image URL to:', data.url);
            setHeroImageUrl(data.url);
            if (data.timestamp) {
              setLastTimestamp(data.timestamp);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching hero image URL:', error);
        // Keep default fallback URL
      }
    };

    fetchHeroImage();
    
    // Listen for hero image update events from admin page
    const handleHeroImageUpdate = (event: CustomEvent | StorageEvent) => {
      const url = (event as CustomEvent).detail?.url || (event as StorageEvent).newValue;
      if (url) {
        console.log('Hero image update event received:', url);
        setHeroImageUrl(url);
        const timestamp = Date.now();
        setLastTimestamp(timestamp);
        localStorage.setItem('heroImageUrl', url);
        localStorage.setItem('heroImageTimestamp', timestamp.toString());
      }
    };
    
    // Listen for storage events (cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'heroImageUrl' && e.newValue) {
        handleHeroImageUpdate(e);
      }
    };
    
    // Refresh when page becomes visible again (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Check localStorage again when tab becomes visible
        const recentUrl = localStorage.getItem('heroImageUrl');
        if (recentUrl) {
          setHeroImageUrl(recentUrl);
        }
        fetchHeroImage();
      }
    };
    
    window.addEventListener('heroImageUpdated', handleHeroImageUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('heroImageUpdated', handleHeroImageUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Only run on mount and visibility change

  const scrollToInquiry = () => {
    const element = document.getElementById('inquiry');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  // Add cache-busting query parameter to image URL
  const imageUrlWithCacheBust = heroImageUrl.startsWith('http') 
    ? `${heroImageUrl}${heroImageUrl.includes('?') ? '&' : '?'}t=${lastTimestamp || Date.now()}`
    : heroImageUrl;

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 to-gray-800/50 z-0">
        <Image
          key={lastTimestamp} // Force re-render when timestamp changes
          src={imageUrlWithCacheBust}
          alt="Japanese Guest House"
          fill
          priority
          quality={90}
          className="object-cover opacity-40"
          sizes="100vw"
          unoptimized={heroImageUrl.startsWith('http')} // Don't optimize external URLs
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-white mb-4 tracking-tight">
          {t('hero.title')}
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 font-light">
          {t('hero.subtitle')}
        </p>
        <button
          onClick={scrollToInquiry}
          className="px-8 py-3 bg-white text-[#333333] rounded-sm font-medium hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl"
        >
          {t('hero.checkAvailability')}
        </button>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <ChevronDown className="w-6 h-6 text-white/70 animate-bounce" style={{ animationDuration: '2s' }} />
      </div>
    </section>
  );
}
