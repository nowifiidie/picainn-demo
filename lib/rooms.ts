export interface RoomMetadata {
  id: string; // e.g., 'room1', 'room2', etc.
  name: string;
  type: string;
  description: string; // Fallback for backward compatibility
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
  lastUpdated?: number; // Timestamp for cache busting
}

export interface CMSConfig {
  heroLastUpdated?: number;
  heroImageUrl?: string; // URL of hero image in blob storage
  roomsLastUpdated?: number;
}

// Room order configuration - stores the display order of rooms
export let roomOrder: string[] = [];

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
    descriptionI18n: {
      en: 'A comfortable standard double room perfect for couples. Equipped with all essential amenities for a pleasant stay in Tokyo.',
      zh: '舒适的标准双人间，非常适合情侣入住。配备所有基本设施，让您在东京度过愉快的时光。',
      'zh-TW': '舒適的標準雙人間，非常適合情侶入住。配備所有基本設施，讓您在東京度過愉快的時光。',
      ko: '커플에게 완벽한 편안한 표준 더블룸입니다. 도쿄에서 즐거운 숙박을 위한 모든 필수 편의시설을 갖추고 있습니다.',
      th: 'ห้องคู่มาตรฐานที่สะดวกสบาย เหมาะสำหรับคู่รัก พร้อมสิ่งอำนวยความสะดวกที่จำเป็นทั้งหมดสำหรับการพักผ่อนที่เพลิดเพลินในโตเกียว',
      es: 'Una cómoda habitación doble estándar perfecta para parejas. Equipada con todas las comodidades esenciales para una estancia agradable en Tokio.',
      fr: 'Une chambre double standard confortable, parfaite pour les couples. Équipée de toutes les commodités essentielles pour un séjour agréable à Tokyo.',
      id: 'Kamar double standar yang nyaman, sempurna untuk pasangan. Dilengkapi dengan semua fasilitas penting untuk menginap yang menyenangkan di Tokyo.',
      ar: 'غرفة مزدوجة قياسية مريحة مثالية للأزواج. مجهزة بجميع وسائل الراحة الأساسية لإقامة ممتعة في طوكيو.',
      de: 'Ein komfortables Standard-Doppelzimmer, perfekt für Paare. Ausgestattet mit allen wesentlichen Annehmlichkeiten für einen angenehmen Aufenthalt in Tokio.',
      vi: 'Phòng đôi tiêu chuẩn thoải mái, hoàn hảo cho các cặp đôi. Được trang bị đầy đủ tiện nghi cần thiết cho một kỳ nghỉ dễ chịu tại Tokyo.',
      my: 'အတွဲများအတွက် သက်တောင့်သက်သာရှိသော စံပြအတွဲခန်း။ တိုကျိုတွင် ပျော်ရွှင်စရာ နေထိုင်မှုအတွက် လိုအပ်သော ပစ္စည်းများ အားလုံးနှင့် ပြည့်စုံသည်။',
    },
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
    descriptionI18n: {
      en: 'Spacious deluxe room with enhanced comfort and modern amenities. Ideal for couples seeking extra space and comfort.',
      zh: '宽敞的豪华客房，提供更舒适的体验和现代化设施。非常适合寻求更多空间和舒适度的情侣。',
      'zh-TW': '寬敞的豪華客房，提供更舒適的體驗和現代化設施。非常適合尋求更多空間和舒適度的情侶。',
      ko: '향상된 편안함과 현대적인 편의시설을 갖춘 넓은 디럭스룸입니다. 추가 공간과 편안함을 원하는 커플에게 이상적입니다.',
      th: 'ห้องดีลักซ์ที่กว้างขวางพร้อมความสะดวกสบายที่เพิ่มขึ้นและสิ่งอำนวยความสะดวกที่ทันสมัย เหมาะสำหรับคู่รักที่ต้องการพื้นที่เพิ่มเติมและความสะดวกสบาย',
      es: 'Amplia habitación de lujo con mayor comodidad y modernas comodidades. Ideal para parejas que buscan espacio extra y comodidad.',
      fr: 'Chambre de luxe spacieuse avec un confort amélioré et des équipements modernes. Idéale pour les couples recherchant un espace supplémentaire et le confort.',
      id: 'Kamar deluxe yang luas dengan kenyamanan yang ditingkatkan dan fasilitas modern. Ideal untuk pasangan yang mencari ruang ekstra dan kenyamanan.',
      ar: 'غرفة فاخرة واسعة مع راحة محسّنة ووسائل راحة حديثة. مثالية للأزواج الذين يبحثون عن مساحة إضافية وراحة.',
      de: 'Geräumiges Deluxe-Zimmer mit erhöhtem Komfort und modernen Annehmlichkeiten. Ideal für Paare, die zusätzlichen Platz und Komfort suchen.',
      vi: 'Phòng deluxe rộng rãi với tiện nghi được nâng cấp và các tiện ích hiện đại. Lý tưởng cho các cặp đôi tìm kiếm không gian thêm và sự thoải mái.',
      my: 'ပိုမိုကျယ်ဝန်းသော ခန်းများနှင့် ခေတ်မီပစ္စည်းများပါရှိသော ကျယ်ဝန်းသော deluxe ခန်း။ နေရာပိုနှင့် သက်တောင့်သက်သာ ရှာဖွေနေသော အတွဲများအတွက် အကောင်းဆုံး။',
    },
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
    descriptionI18n: {
      en: 'Perfect for families or small groups. This room offers ample space and multiple sleeping options for a comfortable stay.',
      zh: '非常适合家庭或小团体入住。这间客房提供充足的空间和多种睡眠选择，确保舒适的住宿体验。',
      'zh-TW': '非常適合家庭或小團體入住。這間客房提供充足的空間和多種睡眠選擇，確保舒適的住宿體驗。',
      ko: '가족이나 소규모 그룹에게 완벽합니다. 이 객실은 넓은 공간과 다양한 수면 옵션을 제공하여 편안한 숙박을 제공합니다.',
      th: 'เหมาะสำหรับครอบครัวหรือกลุ่มเล็กๆ ห้องนี้มีพื้นที่กว้างขวางและตัวเลือกการนอนหลับหลายแบบสำหรับการพักผ่อนที่สะดวกสบาย',
      es: 'Perfecta para familias o grupos pequeños. Esta habitación ofrece amplio espacio y múltiples opciones de descanso para una estancia cómoda.',
      fr: 'Parfaite pour les familles ou les petits groupes. Cette chambre offre un espace généreux et plusieurs options de couchage pour un séjour confortable.',
      id: 'Sempurna untuk keluarga atau kelompok kecil. Kamar ini menawarkan ruang yang luas dan berbagai pilihan tidur untuk menginap yang nyaman.',
      ar: 'مثالية للعائلات أو المجموعات الصغيرة. توفر هذه الغرفة مساحة واسعة وخيارات نوم متعددة لإقامة مريحة.',
      de: 'Perfekt für Familien oder kleine Gruppen. Dieses Zimmer bietet reichlich Platz und mehrere Schlafmöglichkeiten für einen komfortablen Aufenthalt.',
      vi: 'Hoàn hảo cho gia đình hoặc nhóm nhỏ. Phòng này cung cấp không gian rộng rãi và nhiều lựa chọn chỗ ngủ cho một kỳ nghỉ thoải mái.',
      my: 'မိသားစုများနှင့် အုပ်စုငယ်များအတွက် အကောင်းဆုံး။ ဤခန်းသည် သက်တောင့်သက်သာရှိသော နေထိုင်မှုအတွက် ကျယ်ဝန်းသော နေရာနှင့် အိပ်စက်ရန် ရွေးချယ်စရာများစွာကို ပေးသည်။',
    },
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
    descriptionI18n: {
      en: 'Compact and efficient single room perfect for solo travelers. All essential amenities in a cozy space.',
      zh: '紧凑高效的单人间，非常适合独自旅行者。在舒适的空间内配备所有基本设施。',
      'zh-TW': '緊湊高效的單人間，非常適合獨自旅行者。在舒適的空間內配備所有基本設施。',
      ko: '혼자 여행하는 분에게 완벽한 컴팩트하고 효율적인 싱글룸입니다. 아늑한 공간에 모든 필수 편의시설이 갖춰져 있습니다.',
      th: 'ห้องเดี่ยวที่กะทัดรัดและมีประสิทธิภาพ เหมาะสำหรับนักเดินทางคนเดียว สิ่งอำนวยความสะดวกที่จำเป็นทั้งหมดในพื้นที่ที่อบอุ่น',
      es: 'Habitación individual compacta y eficiente, perfecta para viajeros solos. Todas las comodidades esenciales en un espacio acogedor.',
      fr: 'Chambre simple compacte et efficace, parfaite pour les voyageurs en solo. Toutes les commodités essentielles dans un espace confortable.',
      id: 'Kamar tunggal yang kompak dan efisien, sempurna untuk pelancong solo. Semua fasilitas penting dalam ruang yang nyaman.',
      ar: 'غرفة فردية مدمجة وفعالة، مثالية للمسافرين المنفردين. جميع وسائل الراحة الأساسية في مساحة مريحة.',
      de: 'Kompaktes und effizientes Einzelzimmer, perfekt für Alleinreisende. Alle wesentlichen Annehmlichkeiten in einem gemütlichen Raum.',
      vi: 'Phòng đơn gọn gàng và hiệu quả, hoàn hảo cho khách du lịch một mình. Tất cả các tiện nghi cần thiết trong một không gian ấm cúng.',
      my: 'တစ်ယောက်တည်း ခရီးသွားများအတွက် အကောင်းဆုံး ကျစ်လစ်ပြီး ထိရောက်သော တစ်ယောက်တည်း ခန်း။ နွေးထွေးသော နေရာတွင် လိုအပ်သော ပစ္စည်းများ အားလုံး။',
    },
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
    descriptionI18n: {
      en: 'Our most spacious and luxurious room. Features premium amenities and extra comfort for an exceptional stay experience.',
      zh: '我们最宽敞豪华的客房。配备高级设施和额外舒适体验，为您带来非凡的住宿体验。',
      'zh-TW': '我們最寬敞豪華的客房。配備高級設施和額外舒適體驗，為您帶來非凡的住宿體驗。',
      ko: '가장 넓고 고급스러운 객실입니다. 프리미엄 편의시설과 추가 편안함을 제공하여 특별한 숙박 경험을 선사합니다.',
      th: 'ห้องที่กว้างขวางและหรูหราที่สุดของเรา มีสิ่งอำนวยความสะดวกระดับพรีเมียมและความสะดวกสบายเพิ่มเติมสำหรับประสบการณ์การพักผ่อนที่ยอดเยี่ยม',
      es: 'Nuestra habitación más espaciosa y lujosa. Cuenta con comodidades premium y confort adicional para una experiencia de estancia excepcional.',
      fr: 'Notre chambre la plus spacieuse et luxueuse. Dotée d\'équipements premium et d\'un confort supplémentaire pour une expérience de séjour exceptionnelle.',
      id: 'Kamar kami yang paling luas dan mewah. Menampilkan fasilitas premium dan kenyamanan ekstra untuk pengalaman menginap yang luar biasa.',
      ar: 'غرفتنا الأكثر اتساعًا وفخامة. تتميز بوسائل راحة فاخرة وراحة إضافية لتجربة إقامة استثنائية.',
      de: 'Unser geräumigstes und luxuriösestes Zimmer. Ausgestattet mit Premium-Annehmlichkeiten und zusätzlichem Komfort für ein außergewöhnliches Aufenthaltserlebnis.',
      vi: 'Phòng rộng rãi và sang trọng nhất của chúng tôi. Có các tiện ích cao cấp và sự thoải mái bổ sung cho một trải nghiệm lưu trú đặc biệt.',
      my: 'ကျွန်ုပ်တို့၏ အကျယ်ဆုံးနှင့် ခေတ်မီဆန်းပြားသော ခန်း။ ထူးခြားသော နေထိုင်မှု အတွေ့အကြုံအတွက် premium ပစ္စည်းများနှင့် အပိုသက်တောင့်သက်သာကို ပေးသည်။',
    },
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
    description: 'A comfortable standard double room perfect for couples. Equipped with all essential amenities for a pleasant stay in Tokyo.',
    descriptionI18n: {
      en: 'A comfortable standard double room perfect for couples. Equipped with all essential amenities for a pleasant stay in Tokyo.',
      zh: '舒适的标准双人间，非常适合情侣入住。配备所有基本设施，让您在东京度过愉快的时光。',
      'zh-TW': '舒適的標準雙人間，非常適合情侶入住。配備所有基本設施，讓您在東京度過愉快的時光。',
      ko: '커플에게 완벽한 편안한 표준 더블룸입니다. 도쿄에서 즐거운 숙박을 위한 모든 필수 편의시설을 갖추고 있습니다.',
      th: 'ห้องคู่มาตรฐานที่สะดวกสบาย เหมาะสำหรับคู่รัก พร้อมสิ่งอำนวยความสะดวกที่จำเป็นทั้งหมดสำหรับการพักผ่อนที่เพลิดเพลินในโตเกียว',
      es: 'Una cómoda habitación doble estándar perfecta para parejas. Equipada con todas las comodidades esenciales para una estancia agradable en Tokio.',
      fr: 'Une chambre double standard confortable, parfaite pour les couples. Équipée de toutes les commodités essentielles pour un séjour agréable à Tokyo.',
      id: 'Kamar double standar yang nyaman, sempurna untuk pasangan. Dilengkapi dengan semua fasilitas penting untuk menginap yang menyenangkan di Tokyo.',
      ar: 'غرفة مزدوجة قياسية مريحة مثالية للأزواج. مجهزة بجميع وسائل الراحة الأساسية لإقامة ممتعة في طوكيو.',
      de: 'Ein komfortables Standard-Doppelzimmer, perfekt für Paare. Ausgestattet mit allen wesentlichen Annehmlichkeiten für einen angenehmen Aufenthalt in Tokio.',
      vi: 'Phòng đôi tiêu chuẩn thoải mái, hoàn hảo cho các cặp đôi. Được trang bị đầy đủ tiện nghi cần thiết cho một kỳ nghỉ dễ chịu tại Tokyo.',
      my: 'အတွဲများအတွက် သက်တောင့်သက်သာရှိသော စံပြအတွဲခန်း။ တိုကျိုတွင် ပျော်ရွှင်စရာ နေထိုင်မှုအတွက် လိုအပ်သော ပစ္စည်းများ အားလုံးနှင့် ပြည့်စုံသည်။',
    },
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

