import { Shield, Home, Train, MapPin, Utensils, Users, Waves, Wifi, Languages } from 'lucide-react';

export default function AboutSpace() {
  const features = [
    {
      icon: MapPin,
      title: 'Location',
      description: '5 mins walk from Komagome Station (JR Yamanote Line & Namboku Subway). Reach Asakusa, Tokyo Skytree, Ginza, Meiji Jingu Shrine, and Imperial Palace in 20 minutes.',
    },
    {
      icon: Shield,
      title: 'Safety',
      description: 'Located in the safe city of Tokyo, the entire building is equipped with surveillance cameras for the safety of our guests.',
    },
    {
      icon: Wifi,
      title: 'Free Pocket Wi-Fi',
      description: 'Complimentary portable Wi-Fi device available for all guests during your stay.',
    },
    {
      icon: Languages,
      title: 'Multilingual Support',
      description: 'English, Chinese, and Korean language support available for your convenience.',
    },
    {
      icon: Waves,
      title: 'Hot Springs',
      description: 'Public bath 5 minutes on foot. Famous natural hot spring "Tokyo Shinjuku Onsen Sakura" near Sugamo Station (adjacent to Komagome Station).',
    },
    {
      icon: Home,
      title: 'The Room',
      description: 'Equipped with fridge, pots, TV, air conditioner, toilet, and shower room. Ideal for a group of 2.',
      details: '1 double bed (140 cm x 200 cm) + 2 single futons (150 cm x 210 cm) + 2 pillows',
    },
    {
      icon: Train,
      title: 'Transportation',
      description: 'Easy access from Haneda and Narita airports. Elevators available at both south and east exits of Komagome Station. Our house has an elevator for easy luggage handling.',
    },
    {
      icon: MapPin,
      title: 'Nearby Attractions',
      description: 'Quiet residential area with shopping street within 2 minutes. Rikugien Park (5-min walk), University of Tokyo and Korakuen (20-min walk). Nearby dining: ramen, sushi, tempura, soba, takoyaki, yakitori, eel, yakiniku, and Japanese confectionery shops.',
    },
    {
      icon: Utensils,
      title: 'Shopping & Convenience',
      description: 'Shopping district near Komagome Station east exit: 24-hour convenience stores, supermarkets (open until 1 am), Doutor Coffee, drug stores, bento shops, ramen shops (open until 5 am), and bakeries at reasonable prices.',
    },
    {
      icon: Users,
      title: 'Common Areas',
      description: 'Ground floor common area equipped with washing machine and microwave.',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-light text-[#333333] mb-12 text-center">
          About This Space
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
          <h3 className="text-lg font-medium text-[#333333] mb-4">House Rules</h3>
          <ul className="space-y-2 text-sm text-[#333333] font-light">
            <li className="flex items-start gap-2">
              <span className="text-[#8B7355] mt-1">•</span>
              <span>Please keep clean, do not make noise, jump into the room, or affect other households, as Japanese people are very sensitive to sound and our area is especially quiet.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8B7355] mt-1">•</span>
              <span>When leaving the room, be sure to turn off the air conditioner, water, and gas to keep the room clean.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8B7355] mt-1">•</span>
              <span>To maintain your privacy and peace of mind, please only use Airbnb Message for communication.</span>
            </li>
          </ul>
        </div>

        {/* Perfect For */}
        <div className="mt-6 text-center">
          <p className="text-base text-[#333333] font-light">
            Great for couples, students, groups, and business travelers.
          </p>
        </div>
      </div>
    </section>
  );
}
