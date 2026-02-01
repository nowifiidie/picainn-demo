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
  // Fallback to default description
  return description;
}

interface Room {
  id: number;
  name: string;
  type: string;
  image: string;
  images: string[];
  description: string;
  amenities: string[];
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
    descriptionI18n?: {
      en?: string;
      zh?: string;
      'zh-TW'?: string;
      ko?: string;
      th?: string;
      es?: string;
      fr?: string;
      id?: string;
      ar?: string;
      de?: string;
      vi?: string;
      my?: string;
    };
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
        const mergedRooms: Room[] = roomImages
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

            return {
              id: numericId,
              name: metadata.name,
              type: metadata.type,
              image: cacheBustMain,
              images: allImages,
              description: getTranslatedDescription(
                metadata.description,
                metadata.descriptionI18n,
                locale
              ),
              amenities: metadata.amenities,
              bedInfo: metadata.bedInfo,
              maxGuests: metadata.maxGuests,
              size: metadata.size,
              address: metadata.address,
              mapUrl: metadata.mapUrl,
            };
          })
          .filter((room): room is Room => room !== null);

        setRooms(mergedRooms);
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
