'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function Hero() {
  const t = useTranslations();
  const [heroImageUrl, setHeroImageUrl] = useState<string>('/images/hero/hero-background.jpg');
  const [lastTimestamp, setLastTimestamp] = useState<number>(0);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // Fetch hero image URL from API with retry logic
    const fetchHeroImage = async (retryCount = 0) => {
      try {
        // Check localStorage first (in case image was just uploaded)
        const storedUrl = localStorage.getItem('heroImageUrl');
        const storedTimestamp = localStorage.getItem('heroImageTimestamp');
        
        // If we have a valid stored blob URL, use it immediately
        if (storedUrl && storedUrl.startsWith('http') && storedTimestamp) {
          const timestamp = parseInt(storedTimestamp);
          // Use stored URL if it's recent (within last 24 hours)
          if (Date.now() - timestamp < 86400000) {
            if (isMounted) {
              console.log('Using stored hero image URL:', storedUrl);
              setHeroImageUrl(storedUrl);
              setLastTimestamp(timestamp);
              setImageError(false);
            }
          }
        }

        // Always fetch from API to get the latest (but don't overwrite valid blob URLs)
        const response = await fetch(`/api/cms/hero-image?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Hero image API response:', data);
        
        if (isMounted && data.url) {
          const isBlobUrl = (url: string) => url && url.startsWith('http');
          const isFallbackUrl = (url: string) => url && url.startsWith('/images/hero/');
          
          // Always prefer blob URLs over static fallback paths
          if (isBlobUrl(data.url)) {
            // API returned a blob URL - use it
            console.log('Setting hero image URL to API blob URL:', data.url);
            setHeroImageUrl(data.url);
            setImageError(false);
            if (data.timestamp) {
              setLastTimestamp(data.timestamp);
            }
            // Update localStorage
            localStorage.setItem('heroImageUrl', data.url);
            localStorage.setItem('heroImageTimestamp', (data.timestamp || Date.now()).toString());
          } else if (storedUrl && isBlobUrl(storedUrl)) {
            // Use stored blob URL if API returned fallback
            console.log('Using stored blob URL instead of API fallback:', storedUrl);
            setHeroImageUrl(storedUrl);
            setImageError(false);
          } else if (!isFallbackUrl(data.url) || !storedUrl) {
            // Use API response if it's not a fallback, or if we don't have stored URL
            console.log('Setting hero image URL to:', data.url);
            setHeroImageUrl(data.url);
            if (data.timestamp) {
              setLastTimestamp(data.timestamp);
            }
          }
          // If API returned fallback and we have stored blob URL, keep stored (handled above)
        }
      } catch (error) {
        console.error('Error fetching hero image URL:', error);
        // Retry up to 2 times with exponential backoff
        if (retryCount < 2 && isMounted) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
          console.log(`Retrying hero image fetch in ${delay}ms...`);
          setTimeout(() => fetchHeroImage(retryCount + 1), delay);
        } else if (isMounted) {
          // After retries, check localStorage as fallback
          const storedUrl = localStorage.getItem('heroImageUrl');
          if (storedUrl && storedUrl.startsWith('http')) {
            console.log('Using stored URL after API failure:', storedUrl);
            setHeroImageUrl(storedUrl);
            setImageError(false);
          }
        }
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
      isMounted = false;
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
        {!imageError && (
        <Image
            key={`${heroImageUrl}-${lastTimestamp}`} // Force re-render when URL or timestamp changes
            src={imageUrlWithCacheBust}
          alt="Japanese Guest House"
          fill
          priority
          quality={90}
          className="object-cover opacity-40"
          sizes="100vw"
            unoptimized={heroImageUrl.startsWith('http')} // Don't optimize external URLs
            onError={() => {
              console.error('Hero image failed to load:', imageUrlWithCacheBust);
              setImageError(true);
              // Try to fallback to localStorage if current URL failed
              const storedUrl = localStorage.getItem('heroImageUrl');
              if (storedUrl && storedUrl !== heroImageUrl && storedUrl.startsWith('http')) {
                console.log('Falling back to stored URL after image error');
                setHeroImageUrl(storedUrl);
                setImageError(false);
              }
            }}
            onLoad={() => {
              setImageError(false);
            }}
          />
        )}
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
