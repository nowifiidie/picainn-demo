'use client';

import { useState } from 'react';
import { Shield, Home, Train, MapPin, Utensils, Users, Waves, Wifi, Languages, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AboutSpace() {
  const t = useTranslations();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  
  // Property location extracted from your Google Maps link
  const komagomeStation = 'Komagome Station, 2-chōme-1 Komagome, Toshima City, Tokyo 170-0003';
  const propertyAddress = '5 Chome-55-3 Honkomagome, Bunkyo City, Tokyo';
  
  // Google Maps embed URL showing both locations
  // Centered at 35.7361674, 139.7470783 (from your directions link) with zoom level 17
  // Shows both Komagome Station and the property location
  const mapEmbedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.488!2d139.7470783!3d35.7361674!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188d969bd7335f%3A0xc93afd70355008c3!2sKomagome%20Station!5e0!3m3!1m2!1s0x60188dbffa5bf1b5%3A0xfb4fef01b46a5aa4!2s5%20Chome-55-3%20Honkomagome%2C%20Bunkyo%20City%2C%20Tokyo!5e0!3m2!1sen!2sus!4v1234567890!5m2!1sen!2sus`;
  
  // Google Maps directions link (your original link)
  const directionsLink = `https://www.google.com/maps/dir/Komagome+Station,+2-ch%C5%8Dme-1+Komagome,+Toshima+City,+Tokyo+170-0003/5+Chome-55-3+Honkomagome,+Bunkyo+City,+Tokyo/@35.7361674,139.7470783,17z/data=!3m1!4b1!4m14!4m13!1m5!1m1!1s0x60188d969bd7335f:0xc93afd70355008c3!2m2!1d139.7470098!2d35.7365665!1m5!1m1!1s0x60188dbffa5bf1b5:0xfb4fef01b46a5aa4!2m2!1d139.7519715!2d35.7349141!3e3?entry=ttu&g_ep=EgoyMDI1MTIwOS4wIKXMDSoKLDEwMDc5MjA3MUgBUAM%3D`;
  
  // Shopping & Convenience - Google Maps search for convenience stores and shopping
  // Using coordinates from your search link: 35.7365063, 139.7468308
  const shoppingMapUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.488!2d139.7468308!3d35.7365063!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188d969bd7335f%3A0xc93afd70355008c3!2sKomagome%20Station!5e0!3m2!1sen!2sus!4v1234567890!5m2!1sen!2sus`;
  
  // Google Maps search link for shopping and convenience stores
  const shoppingLink = `https://www.google.com/maps/search/convenience+store/@35.7365063,139.7468308,16z/data=!3m1!4b1?entry=ttu&g_ep=EgoyMDI1MTIwOS4wIKXMDSoKLDEwMDc5MjA3MUgBUAM%3D`;
  
  const features = [
    {
      icon: MapPin,
      title: t('aboutSpace.features.location.title'),
      description: t('aboutSpace.features.location.description'),
    },
    {
      icon: Shield,
      title: t('aboutSpace.features.safety.title'),
      description: t('aboutSpace.features.safety.description'),
    },
    {
      icon: Wifi,
      title: t('aboutSpace.features.wifi.title'),
      description: t('aboutSpace.features.wifi.description'),
    },
    {
      icon: Languages,
      title: t('aboutSpace.features.multilingual.title'),
      description: t('aboutSpace.features.multilingual.description'),
    },
    {
      icon: Waves,
      title: t('aboutSpace.features.hotSprings.title'),
      description: t('aboutSpace.features.hotSprings.description'),
    },
    {
      icon: Home,
      title: t('aboutSpace.features.theRoom.title'),
      description: t('aboutSpace.features.theRoom.description'),
      details: t('aboutSpace.features.theRoom.details'),
    },
    {
      icon: Train,
      title: t('aboutSpace.features.transportation.title'),
      description: t('aboutSpace.features.transportation.description'),
    },
    {
      icon: MapPin,
      title: t('aboutSpace.features.nearbyAttractions.title'),
      description: t('aboutSpace.features.nearbyAttractions.description'),
    },
    {
      icon: Utensils,
      title: t('aboutSpace.features.shopping.title'),
      description: t('aboutSpace.features.shopping.description'),
    },
    {
      icon: Users,
      title: t('aboutSpace.features.commonAreas.title'),
      description: t('aboutSpace.features.commonAreas.description'),
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-light text-[#333333] mb-12 text-center">
          {t('aboutSpace.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isLastCard = index === features.length - 1;
            const isLocationCard = feature.title === t('aboutSpace.features.location.title');
            const isShoppingCard = feature.title === t('aboutSpace.features.shopping.title');
            const isClickable = isLocationCard || isShoppingCard;
            
            return (
              <div
                key={index}
                onClick={isLocationCard ? () => setShowLocationModal(true) : isShoppingCard ? () => setShowShoppingModal(true) : undefined}
                className={`text-center p-6 bg-[#FAFAFA] rounded-sm shadow-sm hover:shadow-md transition-shadow ${
                  isLastCard ? 'sm:col-start-1 sm:col-end-3 lg:col-start-2 lg:col-end-3' : ''
                } ${
                  isClickable ? 'cursor-pointer hover:bg-[#F0F0F0] active:scale-[0.98] transition-transform' : ''
                }`}
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-white rounded-full">
                    <Icon className="w-6 h-6 text-[#333333]" />
                  </div>
                </div>
                <h3 className="text-base font-medium text-[#333333] mb-2">
                  {feature.title}
                  {isClickable && (
                    <span className="ml-2 text-xs text-[#8B7355] font-normal">(Click to view map)</span>
                  )}
                </h3>
                <p className="text-sm text-[#333333] font-light leading-relaxed">
                  {feature.description}
                </p>
                {feature.details && (
                  <p className="text-xs text-gray-600 font-light mt-2 italic">
                    {feature.details}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Location Modal */}
        {showLocationModal && (
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLocationModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-[#8B7355]" />
                  <h3 className="text-2xl font-light text-[#333333]">
                    {t('aboutSpace.features.location.title')}
                  </h3>
                </div>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">From:</span> {komagomeStation}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">To:</span> {propertyAddress}
                  </p>
                </div>
                
                {/* Google Maps Embed */}
                <div className="flex-1 relative min-h-[400px]">
                  <iframe
                    src={mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 w-full h-full"
                    title="Map showing property location near Komagome Station"
                  />
                </div>

                {/* Directions Button */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <a
                    href={directionsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2 bg-[#8B7355] text-white rounded-sm hover:bg-[#6B5A42] transition-colors text-sm"
                  >
                    <span>Get Walking Directions from Komagome Station</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Shopping & Convenience Modal */}
        {showShoppingModal && (
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShoppingModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Utensils className="w-6 h-6 text-[#8B7355]" />
                  <h3 className="text-2xl font-light text-[#333333]">
                    {t('aboutSpace.features.shopping.title')}
                  </h3>
                </div>
                <button
                  onClick={() => setShowShoppingModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Location:</span> Shopping district near Komagome Station east exit
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    24-hour convenience stores, supermarkets, coffee shops, drug stores, bento shops, ramen shops, and bakeries
                  </p>
                </div>
                
                {/* Google Maps Embed */}
                <div className="flex-1 relative min-h-[400px]">
                  <iframe
                    src={shoppingMapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 w-full h-full"
                    title="Map showing shopping and convenience stores near Komagome Station"
                  />
                </div>

                {/* Search Button */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <a
                    href={shoppingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2 bg-[#8B7355] text-white rounded-sm hover:bg-[#6B5A42] transition-colors text-sm"
                  >
                    <span>Search Shopping & Convenience Stores on Google Maps</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* House Rules - Separate card with border */}
        <div className="mt-8 bg-[#FAFAFA] p-6 rounded-sm border-l-4 border-[#8B7355]">
          <h3 className="text-lg font-medium text-[#333333] mb-4">{t('aboutSpace.houseRules.title')}</h3>
          <ul className="space-y-2 text-sm text-[#333333] font-light">
            <li className="flex items-start gap-2">
              <span className="text-[#8B7355] mt-1">•</span>
              <span>{t('aboutSpace.houseRules.rule1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8B7355] mt-1">•</span>
              <span>{t('aboutSpace.houseRules.rule2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8B7355] mt-1">•</span>
              <span>{t('aboutSpace.houseRules.rule3')}</span>
            </li>
          </ul>
        </div>

        {/* Perfect For */}
        <div className="mt-6 text-center">
          <p className="text-base text-[#333333] font-light">
            {t('aboutSpace.perfectFor')}
          </p>
        </div>
      </div>
    </section>
  );
}
