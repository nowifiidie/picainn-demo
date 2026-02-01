'use client';

import { useState, useEffect } from 'react';
import { X, Bed, Users, Wifi, Home, Utensils, Wind, Tv, Refrigerator, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';

// Helper function to get translated description
function getTranslatedDescription(
  description: string,
  descriptionI18n?: Record<string, string>,
  locale?: string
): string {
  if (descriptionI18n && locale && descriptionI18n[locale]) {
    return descriptionI18n[locale];
  }
  // Fallback to default description
  return description;
}

interface RoomDetailModalProps {
  room: {
    id: number;
    name: string;
    type: string;
    image: string;
    images?: string[];
    description: string;
    amenities: string[];
    bedInfo: string;
    maxGuests: number;
    size?: string;
    address?: string;
    mapUrl?: string;
  } | null;
  onClose: () => void;
}

export default function RoomDetailModal({ room, onClose }: RoomDetailModalProps) {
  const t = useTranslations();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Reset image index when room changes
  useEffect(() => {
    if (room) {
      setCurrentImageIndex(0);
    }
  }, [room?.id]);

  if (!room) return null;

  const images = room.images || [room.image];
  const hasMultipleImages = images.length > 1;

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const amenityIcons: { [key: string]: any } = {
    'Wi-Fi': Wifi,
    'Air Conditioner': Wind,
    'TV': Tv,
    'Refrigerator': Refrigerator,
    'Kitchen': Utensils,
    'Private Bathroom': Home,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm max-w-6xl w-full max-h-[90vh] overflow-hidden relative flex flex-col sm:flex-row">
        {/* Close Button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onClose}
            aria-label={t('roomDetail.closeRoomDetails')}
            className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors shadow-lg"
          >
            <X className="w-5 h-5 text-[#333333]" />
          </button>
        </div>

        {/* Left Side - Image Gallery */}
        <div className="relative w-full sm:w-1/2 h-64 sm:h-auto bg-gray-100 group flex-shrink-0">
          <Image
            src={images[currentImageIndex]}
            alt={`${room.name} - Image ${currentImageIndex + 1}`}
            fill
            className="object-cover transition-opacity duration-500"
            sizes="50vw"
            priority
            unoptimized
            key={`${images[currentImageIndex]}-${currentImageIndex}`}
          />
          
          {/* Navigation Arrows */}
          {hasMultipleImages && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 min-w-[24px] min-h-[24px]"
                aria-label={t('roomDetail.previousImage')}
              >
                <ChevronLeft className="w-5 h-5 text-[#333333]" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 min-w-[24px] min-h-[24px]"
                aria-label={t('roomDetail.nextImage')}
              >
                <ChevronRight className="w-5 h-5 text-[#333333]" />
              </button>
            </>
          )}

          {/* Image Indicators (Dots) */}
          {hasMultipleImages && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-3 rounded-full transition-all min-w-[24px] ${
                    index === currentImageIndex
                      ? 'w-8 bg-white'
                      : 'w-3 bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`${t('roomDetail.goToImage')} ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Image Counter */}
          {hasMultipleImages && (
            <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm z-10">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Right Side - Content */}
        <div className="w-full sm:w-1/2 p-6 sm:p-8 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-light text-[#333333] mb-2">{room.name}</h2>
            <p className="text-lg text-gray-600 font-light">{room.type}</p>
          </div>

          {/* Description */}
          <p className="text-[#333333] mb-6 leading-relaxed">{room.description}</p>

          {/* Key Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#8B7355]" />
              <div>
                <p className="text-xs text-gray-500">{t('roomDetail.maxGuests')}</p>
                <p className="text-sm font-medium text-[#333333]">{room.maxGuests}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-[#8B7355]" />
              <div>
                <p className="text-xs text-gray-500">{t('roomDetail.bedding')}</p>
                <p className="text-sm font-medium text-[#333333]">{t('roomDetail.included')}</p>
              </div>
            </div>
            {room.size && (
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-[#8B7355]" />
                <div>
                  <p className="text-xs text-gray-500">{t('roomDetail.roomSize')}</p>
                  <p className="text-sm font-medium text-[#333333]">{room.size}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bed Info */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-[#333333] mb-3">{t('roomDetail.bedAndBedding')}</h3>
            <p className="text-sm text-[#333333] font-light">{room.bedInfo}</p>
          </div>

          {/* Amenities */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-[#333333] mb-4">{t('roomDetail.amenities')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {room.amenities.map((amenity, index) => {
                const Icon = amenityIcons[amenity] || Home;
                return (
                  <div key={index} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#8B7355]" />
                    <span className="text-sm text-[#333333] font-light">{amenity}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location */}
          {room.address && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-[#333333] mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#8B7355]" />
                {t('roomDetail.location')}
              </h3>
              <p className="text-sm text-[#333333] font-light mb-4">{room.address}</p>
              {room.mapUrl && (
                <div className="w-full h-64 sm:h-80 rounded-sm overflow-hidden border border-gray-200">
                  <iframe
                    src={room.mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full h-full"
                    title={`Map showing location of ${room.name}`}
                  />
                </div>
              )}
            </div>
          )}

          {/* CTA Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                // Store selected room in sessionStorage for the booking form
                sessionStorage.setItem('selectedRoom', `room${room.id}`);
                onClose();
                // Small delay to ensure modal closes before scrolling
                setTimeout(() => {
                  document.getElementById('inquiry')?.scrollIntoView({ behavior: 'smooth' });
                  // Trigger a custom event to update the booking form
                  window.dispatchEvent(new CustomEvent('roomSelected', { detail: { roomId: `room${room.id}` } }));
                }, 100);
              }}
              className="w-full px-6 py-3 bg-[#333333] text-white rounded-sm font-medium hover:bg-[#555555] transition-colors"
            >
              {t('roomDetail.bookThisRoom')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

