import { MapPin, ExternalLink } from 'lucide-react';

export default function LocalGuide() {
  const places = [
    {
      name: 'Convenience Store',
      query: 'convenience store',
      icon: '🏪',
    },
    {
      name: 'Coffee',
      query: 'coffee shop',
      icon: '☕',
    },
    {
      name: 'Izakaya',
      query: 'izakaya',
      icon: '🍺',
    },
  ];

  const getGoogleMapsUrl = (query: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query + ' Shibuya Tokyo')}`;
  };

  return (
    <section id="location" className="py-16 sm:py-24 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-light text-[#333333] mb-12 text-center">
          Nearby Favorites
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {places.map((place, index) => (
            <a
              key={index}
              href={getGoogleMapsUrl(place.query)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-6 rounded-sm shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{place.icon}</span>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#8B7355] transition-colors" />
              </div>
              <h3 className="text-lg font-medium text-[#333333] mb-2">{place.name}</h3>
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="w-4 h-4 mr-1" />
                <span>View on Google Maps</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
