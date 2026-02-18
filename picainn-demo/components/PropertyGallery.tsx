'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import RoomDetailModal from './RoomDetailModal';
import { getRoomMetadata } from '@/lib/rooms';
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
  return description;
}

const AMENITY_KEYS: Record<string, string> = {
  'Wi-Fi': 'wifi', 'WiFi': 'wifi', 'Wifi': 'wifi',
  'Air Conditioner': 'airConditioner', 'Refrigerator': 'refrigerator', 'TV': 'tv',
  'Kitchen': 'kitchen', 'Private Bathroom': 'privateBathroom',
};

function getAmenityLabel(amenity: string, t: (key: string) => string): string {
  const key = AMENITY_KEYS[amenity];
  if (key) {
    try {
      return t(`amenityLabels.${key}`);
    } catch {
      return amenity;
    }
  }
  return amenity;
}

interface Room {
  id: number;
  name: string;
  type: string;
  image: string;
  images: string[];
  description: string;
  amenities: string[];
  amenityKeys?: string[];
  bedInfo: string;
  maxGuests: number;
  size: string;
  address: string;
  mapUrl: string;
}

interface RoomImages {
  roomId: string;
  mainImage: string;
  additionalImages: string[];
  metadata?: {
    name: string;
    type: string;
    description: string;
    descriptionI18n?: Record<string, string>;
    nameI18n?: Record<string, string>;
    typeI18n?: Record<string, string>;
    amenitiesI18n?: Record<string, string[]>;
    amenities: string[];
    bedInfo: string;
    maxGuests: number;
    size: string;
    address: string;
    mapUrl: string;
    altText?: {
      en?: string;
      ja?: string;
      ko?: string;
      zh?: string;
    };
    lastUpdated?: number;
  };
}

export default function PropertyGallery() {
  const t = useTranslations();
  const locale = useLocale();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRooms() {
      try {
        // Add cache busting to ensure fresh data
        const response = await fetch(`/api/rooms?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch rooms');
        }
        const data = await response.json();
        const roomImages: RoomImages[] = data.rooms;

        // Merge room images with metadata
        const mergedRooms = roomImages
          .map((roomImg) => {
            // Use metadata from API if available (Blob Storage rooms), otherwise fall back to static metadata
            const metadata = roomImg.metadata || getRoomMetadata(roomImg.roomId);
            if (!metadata) {
              console.warn(`No metadata found for ${roomImg.roomId}`);
              return null;
            }

            // Extract numeric ID from roomId (e.g., 'room1' -> 1)
            const numericId = parseInt(roomImg.roomId.replace('room', '')) || 0;

            // Combine main image with additional images
            // Add cache busting timestamp to ALL image URLs (including Blob Storage URLs)
            // This is critical because Vercel Blob Storage may return the same URL even after overwriting
            const timestamp = metadata.lastUpdated || Date.now();
            // Always add cache busting, even for HTTP/Blob URLs
            const cacheBustMain = roomImg.mainImage.includes('?') 
              ? `${roomImg.mainImage.split('?')[0]}?t=${timestamp}`
              : `${roomImg.mainImage}?t=${timestamp}`;
            const cacheBustAdditional = roomImg.additionalImages.map(img => 
              img.includes('?') 
                ? `${img.split('?')[0]}?t=${timestamp}`
                : `${img}?t=${timestamp}`
            );
            const allImages = [cacheBustMain, ...cacheBustAdditional];

            const nameI18n = metadata.nameI18n as Record<string, string> | undefined;
            const typeI18n = metadata.typeI18n as Record<string, string> | undefined;
            const amenitiesI18n = metadata.amenitiesI18n as Record<string, string[]> | undefined;
            const displayName = (nameI18n && locale && nameI18n[locale]) ? nameI18n[locale] : metadata.name;
            const displayType = (typeI18n && locale && typeI18n[locale]) ? typeI18n[locale] : (metadata.type || '');
            const displayAmenities = (amenitiesI18n && locale && amenitiesI18n[locale]) ? amenitiesI18n[locale] : (metadata.amenities || []).map((a: string) => getAmenityLabel(a, t));

            const room: Room = {
              id: numericId,
              name: displayName,
              type: displayType,
              image: cacheBustMain,
              images: allImages,
              description: getTranslatedDescription(
                metadata.description,
                metadata.descriptionI18n,
                locale
              ),
              amenities: displayAmenities,
              amenityKeys: metadata.amenities,
              bedInfo: metadata.bedInfo,
              maxGuests: metadata.maxGuests,
              size: metadata.size,
              address: metadata.address,
              mapUrl: metadata.mapUrl,
            };
            return room;
          })
          .filter((room): room is NonNullable<typeof room> => room !== null);

        setRooms(mergedRooms as Room[]);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRooms();

    // Refetch when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchRooms();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [locale]);

  return (
    <>
      <section id="gallery" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-light text-[#333333] mb-12 text-center">
            {t('gallery.title')}
          </h2>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('gallery.loadingRooms')}</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('gallery.noRoomsAvailable')}</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className="relative aspect-[4/3] overflow-hidden rounded-sm group cursor-pointer bg-gray-100 shadow-lg transition-all"
              >
                {room.image ? (
                  <Image
                    src={room.image}
                    alt={room.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    quality={85}
                    unoptimized
                    key={`${room.id}-${room.image}`}
                    onError={(e) => {
                      console.error('Image failed to load:', room.image, 'for room:', room.name);
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <p className="text-gray-400 text-sm">{t('gallery.noImage')}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-medium text-lg mb-1">{room.name}</h3>
                  <p className="text-white/90 text-sm">{room.type}</p>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Room Detail Modal */}
      <RoomDetailModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
    </>
  );
}
