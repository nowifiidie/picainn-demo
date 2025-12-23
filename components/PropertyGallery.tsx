'use client';

import { useState } from 'react';
import Image from 'next/image';
import RoomDetailModal from './RoomDetailModal';

const roomData = [
  {
    id: 1,
    name: 'Room 1',
    type: 'Standard Double',
    image: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    images: [
      'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    ],
    description: 'A comfortable standard double room perfect for couples. Equipped with all essential amenities for a pleasant stay in Tokyo.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Kitchen', 'Private Bathroom'],
    bedInfo: '1 double bed (140 cm x 200 cm)',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.5!2d139.737!3d35.736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDQ0JzA5LjYiTiAxMznCsDQ0JzEzLjIiRQ!5e0!3m2!1sen!2sus!4v1234567890',
  },
  {
    id: 2,
    name: 'Room 2',
    type: 'Deluxe Double',
    image: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    images: [
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/271743/pexels-photo-271743.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    ],
    description: 'Spacious deluxe room with enhanced comfort and modern amenities. Ideal for couples seeking extra space and comfort.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Kitchen', 'Private Bathroom'],
    bedInfo: '1 double bed (140 cm x 200 cm) + 2 single futons (150 cm x 210 cm) + 2 pillows',
    maxGuests: 2,
    size: '25 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.488!2d139.737!3d35.736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188c1e8b8b8b8b%3A0x1e1e1e1e1e1e1e1e!2sKomagome%20Station!5e0!3m2!1sen!2sus!4v1234567890',
  },
  {
    id: 3,
    name: 'Room 3',
    type: 'Family Room',
    image: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    images: [
      'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    ],
    description: 'Perfect for families or small groups. This room offers ample space and multiple sleeping options for a comfortable stay.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Kitchen', 'Private Bathroom'],
    bedInfo: '1 double bed (140 cm x 200 cm) + 2 single futons (150 cm x 210 cm) + 2 pillows',
    maxGuests: 4,
    size: '30 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.488!2d139.737!3d35.736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188c1e8b8b8b8b%3A0x1e1e1e1e1e1e1e1e!2sKomagome%20Station!5e0!3m2!1sen!2sus!4v1234567890',
  },
  {
    id: 4,
    name: 'Room 4',
    type: 'Economy Single',
    image: 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    images: [
      'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    ],
    description: 'Compact and efficient single room perfect for solo travelers. All essential amenities in a cozy space.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: '1 single futon (150 cm x 210 cm) + 1 pillow',
    maxGuests: 1,
    size: '15 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.488!2d139.737!3d35.736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188c1e8b8b8b8b%3A0x1e1e1e1e1e1e1e1e!2sKomagome%20Station!5e0!3m2!1sen!2sus!4v1234567890',
  },
  {
    id: 5,
    name: 'Room 5',
    type: 'Premium Suite',
    image: 'https://images.pexels.com/photos/271743/pexels-photo-271743.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    images: [
      'https://images.pexels.com/photos/271743/pexels-photo-271743.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
      'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
    ],
    description: 'Our most spacious and luxurious room. Features premium amenities and extra comfort for an exceptional stay experience.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Kitchen', 'Private Bathroom'],
    bedInfo: '1 double bed (140 cm x 200 cm) + 2 single futons (150 cm x 210 cm) + 2 pillows',
    maxGuests: 3,
    size: '35 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.488!2d139.737!3d35.736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188c1e8b8b8b8b%3A0x1e1e1e1e1e1e1e1e!2sKomagome%20Station!5e0!3m2!1sen!2sus!4v1234567890',
  },
];

export default function PropertyGallery() {
  const [selectedRoom, setSelectedRoom] = useState<typeof roomData[0] | null>(null);

  return (
    <>
      <section id="gallery" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-light text-[#333333] mb-12 text-center">
            Gallery
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomData.map((room) => (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className="relative aspect-[4/3] overflow-hidden rounded-sm group cursor-pointer bg-gray-100 hover:shadow-lg transition-all"
              >
                <Image
                  src={room.image}
                  alt={room.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  quality={85}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                  <h3 className="text-white font-medium text-lg mb-1">{room.name}</h3>
                  <p className="text-white/90 text-sm">{room.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Room Detail Modal */}
      <RoomDetailModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
    </>
  );
}
