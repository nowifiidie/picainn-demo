import { MapPin, Wifi, Languages, Utensils } from 'lucide-react';

export default function InformationGrid() {
  const features = [
    {
      icon: MapPin,
      text: '5 mins walk from Komagome Station',
    },
    {
      icon: Wifi,
      text: 'Free Pocket Wi-Fi',
    },
    {
      icon: Languages,
      text: 'English/Chinese/Korean Support',
    },
    {
      icon: Utensils,
      text: 'Kitchen & Laundry',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="text-center p-6 bg-white rounded-sm shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-[#FAFAFA] rounded-full">
                    <Icon className="w-6 h-6 text-[#333333]" />
                  </div>
                </div>
                <p className="text-sm text-[#333333] font-light">{feature.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
