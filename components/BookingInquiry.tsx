'use client';

import { useState, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoomMetadata } from '@/lib/rooms';
import { useTranslations } from 'next-intl';

interface RoomOption {
  value: string;
  label: string;
}

export default function BookingInquiry() {
  const t = useTranslations();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    guests: '1',
    roomType: '',
    contactApp: 'whatsapp',
  });
  const [showThankYou, setShowThankYou] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomOption[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  // Fetch rooms from API to populate dropdown
  useEffect(() => {
    async function fetchRooms() {
      try {
        const response = await fetch(`/api/rooms?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch rooms');
        }
        const data = await response.json();
        const roomImages = data.rooms;

        // Build room options from fetched rooms
        const roomOptions: RoomOption[] = roomImages
          .map((roomImg: any) => {
            // Use metadata from API if available (Blob Storage rooms), otherwise fall back to static metadata
            const metadata = roomImg.metadata || getRoomMetadata(roomImg.roomId);
            if (!metadata) {
              return null;
            }

            // Format label as "{room name} - {room type}" to match room cards
            return {
              value: roomImg.roomId,
              label: `${metadata.name} - ${metadata.type}`,
            };
          })
          .filter((option: RoomOption | null): option is RoomOption => option !== null);

        setRoomTypes(roomOptions);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        // Fallback to empty array on error
        setRoomTypes([]);
      } finally {
        setIsLoadingRooms(false);
      }
    }

    fetchRooms();
  }, []);

  // Listen for room selection from gallery modal
  useEffect(() => {
    // Check sessionStorage on mount
    const selectedRoom = sessionStorage.getItem('selectedRoom');
    if (selectedRoom) {
      setFormData(prev => ({ ...prev, roomType: selectedRoom }));
      sessionStorage.removeItem('selectedRoom');
    }

    // Listen for custom event
    const handleRoomSelected = (event: CustomEvent) => {
      setFormData(prev => ({ ...prev, roomType: event.detail.roomId }));
    };

    window.addEventListener('roomSelected', handleRoomSelected as EventListener);
    return () => {
      window.removeEventListener('roomSelected', handleRoomSelected as EventListener);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate roomType is selected
    if (!formData.roomType || formData.roomType.trim() === '') {
      alert(t('booking.pleaseSelectRoom'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        guests: formData.guests,
        roomType: formData.roomType,
        contactApp: formData.contactApp,
        dateRange: dateRange,
      };
      
      console.log('Submitting inquiry with payload:', payload);
      
      const response = await fetch('/api/send-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      console.log('API response:', { status: response.status, data });

      if (response.ok) {
        setShowThankYou(true);
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          guests: '1',
          roomType: '',
          contactApp: 'whatsapp',
        });
        setDateRange({ from: undefined, to: undefined });
      } else {
        console.error('API error:', data);
        alert(data.error || t('booking.error'));
      }
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert(t('booking.errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };


  const contactOptions = [
    { value: 'whatsapp', label: t('booking.contactOptions.whatsapp') },
    { value: 'line', label: t('booking.contactOptions.line') },
    { value: 'wechat', label: t('booking.contactOptions.wechat') },
    { value: 'email', label: t('booking.contactOptions.email') },
  ];

  return (
    <section id="inquiry" className="py-16 sm:py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-light text-[#333333] mb-12 text-center">
          {t('booking.title')}
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Date Picker */}
          <div className="bg-[#FAFAFA] p-6 rounded-sm">
            <h3 className="text-lg font-medium text-[#333333] mb-4">{t('booking.selectDates')}</h3>
            <DayPicker
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              className="rounded-md"
              classNames={{
                months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                month: 'space-y-4',
                caption: 'flex justify-center pt-1 relative items-center',
                caption_label: 'text-sm font-medium text-[#333333]',
                nav: 'space-x-1 flex items-center',
                nav_button: cn(
                  'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
                ),
                nav_button_previous: 'absolute left-1',
                nav_button_next: 'absolute right-1',
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex',
                head_cell: 'text-[#333333] rounded-md w-9 font-normal text-[0.8rem]',
                row: 'flex w-full mt-2',
                cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-[#8B7355]/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                day: cn(
                  'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#8B7355]/10 rounded-md'
                ),
                day_selected: 'bg-[#8B7355] text-white hover:bg-[#8B7355] hover:text-white focus:bg-[#8B7355] focus:text-white',
                day_today: 'bg-[#FAFAFA] text-[#333333]',
                day_outside: 'opacity-50',
                day_disabled: 'opacity-50',
                day_range_middle: 'aria-selected:bg-[#8B7355]/20 aria-selected:text-[#333333]',
                day_hidden: 'invisible',
              }}
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[#333333] mb-2">
                {t('booking.fullName')}
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#333333] mb-2">
                {t('booking.email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="roomType" className="block text-sm font-medium text-[#333333] mb-2">
                {t('booking.selectRoomType')} <span className="text-red-500">*</span>
              </label>
              <select
                id="roomType"
                name="roomType"
                required
                value={formData.roomType}
                onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                disabled={isLoadingRooms}
                className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingRooms ? t('booking.loadingRooms') : t('booking.pleaseSelectRoom')}
                </option>
                {roomTypes.map((room) => (
                  <option key={room.value} value={room.value}>
                    {room.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="guests" className="block text-sm font-medium text-[#333333] mb-2">
                {t('booking.guests')}
              </label>
              <select
                id="guests"
                name="guests"
                value={formData.guests}
                onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="contactApp" className="block text-sm font-medium text-[#333333] mb-2">
                {t('booking.contactApp')}
              </label>
              <select
                id="contactApp"
                name="contactApp"
                value={formData.contactApp}
                onChange={(e) => setFormData({ ...formData, contactApp: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-transparent"
              >
                {contactOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-[#333333] text-white rounded-sm font-medium hover:bg-[#555555] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('booking.sending') : t('booking.submit')}
            </button>
          </form>
        </div>
      </div>

      {/* Thank You Modal */}
      {showThankYou && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-sm p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowThankYou(false)}
              aria-label="Close thank you message"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-medium text-[#333333] mb-4">
              {t('booking.thankYou')}
            </h3>
            <p className="text-[#333333] mb-6">
              {t('booking.thankYouMessage')}
            </p>
            <button
              onClick={() => setShowThankYou(false)}
              className="w-full px-6 py-3 bg-[#333333] text-white rounded-sm font-medium hover:bg-[#555555] transition-colors"
            >
              {t('booking.close')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
