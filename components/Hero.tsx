'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';

export default function Hero() {
  const scrollToInquiry = () => {
    const element = document.getElementById('inquiry');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 to-gray-800/50 z-0">
        <Image
          src="https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
          alt="Japanese Guest House"
          fill
          priority
          quality={90}
          className="object-cover opacity-40"
          sizes="100vw"
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-white mb-4 tracking-tight">
          Welcome to Our Guest House
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 font-light">
          Experience authentic Japanese hospitality in the heart of Tokyo
        </p>
        <button
          onClick={scrollToInquiry}
          className="px-8 py-3 bg-white text-[#333333] rounded-sm font-medium hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl"
        >
          Check Availability
        </button>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <ChevronDown className="w-6 h-6 text-white/70 animate-bounce" style={{ animationDuration: '2s' }} />
      </div>
    </section>
  );
}
