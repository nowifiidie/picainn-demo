export interface RoomMetadata {
  id: string; // e.g., 'room1', 'room2', etc.
  name: string;
  type: string;
  description: string;
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
  lastUpdated?: number; // Timestamp for cache busting
}

export interface CMSConfig {
  heroLastUpdated?: number;
  roomsLastUpdated?: number;
}

// CMS Configuration with timestamps for cache busting
export let cmsConfig: CMSConfig = {
  heroLastUpdated: 1766900599519,
  roomsLastUpdated: 1766934958127,
};

// Room metadata configuration
// To add new rooms, simply add entries to this object
// Rooms will automatically appear on the website once images are added to public/images/rooms/{roomId}/
export const roomMetadata: Record<string, RoomMetadata> = {
  room1: {
    id: 'room1',
    name: 'Room 201',
    type: 'Standard Double',
    description: 'A comfortable standard double room perfect for couples. Equipped with all essential amenities for a pleasant stay in Tokyo.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: '1 double bed (140 cm x 200 cm)',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.5!2d139.737!3d35.736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDQ0JzA5LjYiTiAxMznCsDQ0JzEzLjIiRQ!5e0!3m2!1sen!2sus!4v1234567890',
    lastUpdated: 1766897775802,
  },
  room2: {
    id: 'room2',
    name: 'Room 2123',
    type: 'Deluxe Double',
    description: 'Spacious deluxe room with enhanced comfort and modern amenities. Ideal for couples seeking extra space and comfort.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: '1 double bed (140 cm x 200 cm) + 2 single futons (150 cm x 210 cm) + 2 pillows',
    maxGuests: 2,
    size: '25 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.488!2d139.737!3d35.736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188c1e8b8b8b8b%3A0x1e1e1e1e1e1e1e1e!2sKomagome%20Station!5e0!3m2!1sen!2sus!4v1234567890',
    lastUpdated: 1766933735541,
  },
  room3: {
    id: 'room3',
    name: 'Room 3',
    type: 'Family Room',
    description: 'Perfect for families or small groups. This room offers ample space and multiple sleeping options for a comfortable stay.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Kitchen', 'Private Bathroom'],
    bedInfo: '1 double bed (140 cm x 200 cm) + 2 single futons (150 cm x 210 cm) + 2 pillows',
    maxGuests: 4,
    size: '30 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.488!2d139.737!3d35.736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188c1e8b8b8b8b%3A0x1e1e1e1e1e1e1e1e!2sKomagome%20Station!5e0!3m2!1sen!2sus!4v1234567890',
  },
  room4: {
    id: 'room4',
    name: 'Room 4',
    type: 'Economy Single',
    description: 'Compact and efficient single room perfect for solo travelers. All essential amenities in a cozy space.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: '1 single futon (150 cm x 210 cm) + 1 pillow',
    maxGuests: 1,
    size: '15 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.488!2d139.737!3d35.736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188c1e8b8b8b8b%3A0x1e1e1e1e1e1e1e1e!2sKomagome%20Station!5e0!3m2!1sen!2sus!4v1234567890',
  },
  room5: {
    id: 'room5',
    name: 'Room 5',
    type: 'Premium Suite',
    description: 'Our most spacious and luxurious room. Features premium amenities and extra comfort for an exceptional stay experience.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Kitchen', 'Private Bathroom'],
    bedInfo: '1 double bed (140 cm x 200 cm) + 2 single futons (150 cm x 210 cm) + 2 pillows',
    maxGuests: 3,
    size: '35 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.488!2d139.737!3d35.736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188c1e8b8b8b8b%3A0x1e1e1e1e1e1e1e1e!2sKomagome%20Station!5e0!3m2!1sen!2sus!4v1234567890',
  },
  room16: {
    id: 'room16',
    name: 'room 201',
    type: 'standard double',
    description: 'good for couple',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Kitchen', 'Private Bathroom'],
    bedInfo: '1 double bed (140 cm x 200 cm)',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
    lastUpdated: 1766934958110,
  },
  // Rooms 6-15: Add metadata here as you add images
  // Uncomment and customize these as you add room folders and images
  /*
  room6: {
    id: 'room6',
    name: 'Room 6',
    type: 'Your Room Type',
    description: 'Room description here.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: 'Bed information here',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
  },
  room7: {
    id: 'room7',
    name: 'Room 7',
    type: 'Your Room Type',
    description: 'Room description here.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: 'Bed information here',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
  },
  room8: {
    id: 'room8',
    name: 'Room 8',
    type: 'Your Room Type',
    description: 'Room description here.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: 'Bed information here',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
  },
  room9: {
    id: 'room9',
    name: 'Room 9',
    type: 'Your Room Type',
    description: 'Room description here.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: 'Bed information here',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
  },
  room10: {
    id: 'room10',
    name: 'Room 10',
    type: 'Your Room Type',
    description: 'Room description here.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: 'Bed information here',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
  },
  room11: {
    id: 'room11',
    name: 'Room 11',
    type: 'Your Room Type',
    description: 'Room description here.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: 'Bed information here',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
  },
  room12: {
    id: 'room12',
    name: 'Room 12',
    type: 'Your Room Type',
    description: 'Room description here.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: 'Bed information here',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
  },
  room13: {
    id: 'room13',
    name: 'Room 13',
    type: 'Your Room Type',
    description: 'Room description here.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: 'Bed information here',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
  },
  room14: {
    id: 'room14',
    name: 'Room 14',
    type: 'Your Room Type',
    description: 'Room description here.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: 'Bed information here',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
  },
  room15: {
    id: 'room15',
    name: 'Room 15',
    type: 'Your Room Type',
    description: 'Room description here.',
    amenities: ['Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'],
    bedInfo: 'Bed information here',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
  },
  */
};

// Helper function to get room metadata by ID
export function getRoomMetadata(roomId: string): RoomMetadata | undefined {
  return roomMetadata[roomId];
}

// Helper function to get all room metadata
export function getAllRoomMetadata(): RoomMetadata[] {
  return Object.values(roomMetadata);
}

