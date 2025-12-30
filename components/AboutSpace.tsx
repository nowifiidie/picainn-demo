'use client';

import { Shield, Home, Train, MapPin, Utensils, Users, Waves, Wifi, Languages } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AboutSpace() {
  const t = useTranslations();
  
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
            return (
              <div
                key={index}
                className={`text-center p-6 bg-[#FAFAFA] rounded-sm shadow-sm hover:shadow-md transition-shadow ${
                  isLastCard ? 'sm:col-start-1 sm:col-end-3 lg:col-start-2 lg:col-end-3' : ''
                }`}
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-white rounded-full">
                    <Icon className="w-6 h-6 text-[#333333]" />
                  </div>
                </div>
                <h3 className="text-base font-medium text-[#333333] mb-2">
                  {feature.title}
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
