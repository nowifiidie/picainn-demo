'use client';

import { useState } from 'react';
import { MessageCircle, Instagram, Facebook, X } from 'lucide-react';
import Image from 'next/image';

export default function FloatingSocialDock() {
  const [showQRModal, setShowQRModal] = useState<{ type: 'line' | 'xhs' | null }>({ type: null });

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      href: 'https://wa.me/1234567890',
      color: 'text-green-500',
    },
    {
      name: 'LINE',
      icon: MessageCircle,
      onClick: () => setShowQRModal({ type: 'line' }),
      color: 'text-green-400',
    },
    {
      name: 'Instagram',
      icon: Instagram,
      href: 'https://instagram.com',
      color: 'text-pink-500',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      href: 'https://facebook.com',
      color: 'text-blue-500',
    },
    {
      name: 'XiaoHongShu',
      icon: MessageCircle,
      onClick: () => setShowQRModal({ type: 'xhs' }),
      color: 'text-red-500',
    },
  ];

  return (
    <>
      {/* Desktop: Fixed Sidebar */}
      <div className="hidden md:flex fixed right-0 top-1/2 transform -translate-y-1/2 z-40 flex-col gap-4 p-2 bg-white/95 backdrop-blur-sm border-l border-gray-200/50 shadow-lg rounded-l-lg">
        {socialLinks.map((link, index) => {
          const Icon = link.icon;
          return link.onClick ? (
            <button
              key={index}
              onClick={link.onClick}
              className={`p-3 ${link.color} hover:bg-gray-50 rounded-md transition-colors`}
              title={link.name}
            >
              <Icon className="w-5 h-5" />
            </button>
          ) : (
            <a
              key={index}
              href={link.href}
              className={`p-3 ${link.color} hover:bg-gray-50 rounded-md transition-colors`}
              title={link.name}
            >
              <Icon className="w-5 h-5" />
            </a>
          );
        })}
      </div>

      {/* Mobile: Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200/50 shadow-lg">
        <div className="flex justify-around items-center py-2">
            {socialLinks.map((link, index) => {
            const Icon = link.icon;
            return link.onClick ? (
              <button
                key={index}
                onClick={link.onClick}
                className={`p-3 ${link.color} rounded-md transition-colors`}
                title={link.name}
              >
                <Icon className="w-5 h-5" />
              </button>
            ) : (
              <a
                key={index}
                href={link.href}
                className={`p-3 ${link.color} rounded-md transition-colors`}
                title={link.name}
              >
                <Icon className="w-5 h-5" />
              </a>
            );
          })}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-sm p-8 max-w-sm w-full relative">
            <button
              onClick={() => setShowQRModal({ type: null })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-medium text-[#333333] mb-4 text-center">
              Scan {showQRModal.type === 'line' ? 'LINE' : 'XiaoHongShu'} QR Code
            </h3>
            <div className="bg-gray-100 p-8 rounded-sm flex items-center justify-center mb-4">
              <div className="w-48 h-48 bg-gray-300 rounded-sm flex items-center justify-center text-gray-500">
                QR Code Placeholder
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Scan this code to connect with us on {showQRModal.type === 'line' ? 'LINE' : 'XiaoHongShu'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

