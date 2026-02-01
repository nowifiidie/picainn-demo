'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Wifi, Wind, Tv, Refrigerator, Utensils, Home, Eye, EyeOff, Trash2, Upload, Star, X, GripVertical } from 'lucide-react';
import { getAllRoomMetadata, getRoomMetadata } from '@/lib/rooms';

const PRESET_AMENITIES = [
  { name: 'Wi-Fi', icon: Wifi },
  { name: 'Air Conditioner', icon: Wind },
  { name: 'TV', icon: Tv },
  { name: 'Refrigerator', icon: Refrigerator },
  { name: 'Kitchen', icon: Utensils },
  { name: 'Private Bathroom', icon: Home },
];

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '简体中文 (Simplified Chinese)' },
  { code: 'zh-TW', name: '繁體中文 (Traditional Chinese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'th', name: 'ไทย (Thai)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'id', name: 'Bahasa Indonesia (Indonesian)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)' },
  { code: 'my', name: 'မြန်မာ (Myanmar)' },
];

interface RoomDisplay {
  roomId: string;
  name: string;
  type?: string;
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
  image: string;
  maxGuests: number;
  size: string;
  hasImage?: boolean; // Flag to indicate if image exists
  bedInfo?: string;
  address?: string;
  mapUrl?: string;
  amenities?: string[];
  lastUpdated?: number; // Include lastUpdated for cache busting
  altText?: {
    en?: string;
    ja?: string;
    ko?: string;
    zh?: string;
  };
}

export default function AdminPage() {
  const [heroStatus, setHeroStatus] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [roomStatus, setRoomStatus] = useState<{ success: boolean; message?: string; error?: string; details?: string; note?: string } | null>(null);
  const [isHeroUploading, setIsHeroUploading] = useState(false);
  const [isRoomUploading, setIsRoomUploading] = useState(false);
  const [heroImageExists, setHeroImageExists] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string>('/images/hero/hero-background.jpg');
  const [isDeletingHero, setIsDeletingHero] = useState(false);
  const [rooms, setRooms] = useState<RoomDisplay[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [editingRoom, setEditingRoom] = useState<RoomDisplay | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [roomImages, setRoomImages] = useState<Array<{ filename: string; url: string; isMain: boolean; isHidden: boolean }>>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [updatingImage, setUpdatingImage] = useState<string | null>(null);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [roomOrder, setRoomOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Language code mapping for MyMemory Translation API
  const LANGUAGE_CODES: Record<string, string> = {
    'en': 'en',
    'zh': 'zh-CN', // Simplified Chinese
    'zh-TW': 'zh-TW', // Traditional Chinese
    'ko': 'ko',
    'th': 'th',
    'es': 'es',
    'fr': 'fr',
    'id': 'id',
    'ar': 'ar',
    'de': 'de',
    'vi': 'vi',
    'my': 'my', // Myanmar
  };

  // Translate text using MyMemory Translation API
  async function translateText(text: string, targetLang: string): Promise<string> {
    try {
      const langCode = LANGUAGE_CODES[targetLang] || targetLang;
      
      // MyMemory Translation API - free tier: 10,000 words/day
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Translation API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      } else {
        console.error(`Translation failed for ${targetLang}:`, data);
        return text; // Fallback to original text
      }
    } catch (error) {
      console.error(`Error translating to ${targetLang}:`, error);
      return text; // Fallback to original text
    }
  }

  // Translate description to all languages and fill form fields
  async function handleTranslateDescription(formId: 'edit' | 'add', englishDescription: string) {
    if (!englishDescription || englishDescription.trim() === '') {
      alert('Please enter an English description first');
      return;
    }

    setIsTranslating(true);
    try {
      const languages = ['en', 'zh', 'zh-TW', 'ko', 'th', 'es', 'fr', 'id', 'ar', 'de', 'vi', 'my'];
      
      // Translate to all languages in parallel (English stays as-is)
      const translationPromises = languages.map(async (lang) => {
        if (lang === 'en') {
          return { lang, translated: englishDescription };
        }
        const translated = await translateText(englishDescription, lang);
        return { lang, translated };
      });

      const results = await Promise.all(translationPromises);
      
      // Fill in all the textarea fields
      results.forEach(({ lang, translated }) => {
        const textareaId = formId === 'edit' 
          ? `edit-description-${lang}` 
          : `room-description-${lang}`;
        const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = translated;
        }
      });

      alert('Translations completed! Review and adjust if needed.');
    } catch (error) {
      console.error('Error translating descriptions:', error);
      alert('Translation failed. Please try again or translate manually.');
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleHeroSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (!form) {
      console.error('Form element not found');
      return;
    }

    setIsHeroUploading(true);
    setHeroStatus(null);

    try {
      const formData = new FormData(form);
      const response = await fetch('/api/cms/update-hero', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      setHeroStatus(result);
      
      if (result.success) {
        // Reset form
        form.reset();
        setHeroImageExists(true);
        if (result.url) {
          console.log('Hero image uploaded, new URL:', result.url);
          // Immediately update state - don't wait for useEffect
          setHeroImageUrl(result.url);
          setHeroImageExists(true);
          // Store in localStorage so homepage can pick it up even in different tabs
          localStorage.setItem('heroImageUrl', result.url);
          localStorage.setItem('heroImageTimestamp', Date.now().toString());
          // Trigger a custom event that the Hero component can listen to
          window.dispatchEvent(new CustomEvent('heroImageUpdated', { detail: { url: result.url } }));
          // Also trigger storage event for cross-tab communication
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'heroImageUrl',
            newValue: result.url
          }));
        }
      }
    } catch (error) {
      setHeroStatus({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload hero image'
      });
    } finally {
      setIsHeroUploading(false);
    }
  }

  async function handleDeleteHero() {
    if (!window.confirm('Are you sure you want to delete the hero image? This action cannot be undone.')) {
      return;
    }

    setIsDeletingHero(true);
    setHeroStatus(null);

    try {
      // Get the current hero image URL from state or localStorage
      const urlToDelete = heroImageUrl.startsWith('http') 
        ? heroImageUrl 
        : localStorage.getItem('heroImageUrl');
      
      // Pass the URL to the delete API
      const response = await fetch('/api/cms/delete-hero', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToDelete }),
      });
      const result = await response.json();

      setHeroStatus(result);
      
      if (result.success) {
        setHeroImageExists(false);
        setHeroImageUrl('/images/hero/hero-background.jpg'); // Reset to fallback
        // Clear localStorage
        localStorage.removeItem('heroImageUrl');
        localStorage.removeItem('heroImageTimestamp');
        // Trigger event to update homepage
        window.dispatchEvent(new CustomEvent('heroImageUpdated', { detail: { url: null } }));
      }
    } catch (error) {
      setHeroStatus({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete hero image'
      });
    } finally {
      setIsDeletingHero(false);
    }
  }

  // Check if hero image exists on mount and after updates
  useEffect(() => {
    async function checkHeroImage() {
      try {
        // Check localStorage first (for recently uploaded images)
        const storedUrl = localStorage.getItem('heroImageUrl');
        if (storedUrl && !storedUrl.startsWith('/images/hero/')) {
          console.log('Admin: Using stored hero image URL:', storedUrl);
          setHeroImageUrl(storedUrl);
          setHeroImageExists(true);
          return; // Don't check API if we have a valid stored URL
        }

        const response = await fetch('/api/cms/hero-image');
        const data = await response.json();
        if (data.url) {
          // Only update if we don't already have a blob URL set
          if (!heroImageUrl.startsWith('http') || data.url.startsWith('http')) {
            setHeroImageUrl(data.url);
          }
          // Check if URL is from blob storage (not the fallback static path)
          if (!data.url.startsWith('/images/hero/')) {
            // For blob URLs, assume they exist if API returns them
            setHeroImageExists(true);
          } else {
            // Fallback: check static file
            try {
              const staticCheck = await fetch(`${data.url}?t=${Date.now()}`, { method: 'HEAD' });
              setHeroImageExists(staticCheck.ok);
            } catch {
              setHeroImageExists(false);
            }
          }
        }
      } catch {
        setHeroImageExists(false);
      }
    }
    checkHeroImage();
  }, [heroStatus]);

  async function handleRoomSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsRoomUploading(true);
    setRoomStatus(null);

    // Store form reference before async operations
    const form = e.currentTarget;

    try {
      const formData = new FormData(form);
      const response = await fetch('/api/cms/upload-room', {
        method: 'POST',
        body: formData,
      });
      
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Error parsing response:', jsonError);
        const text = await response.text();
        console.error('Response text:', text);
        result = {
          success: false,
          error: 'Failed to add room',
          details: `Server error (${response.status}): ${text.substring(0, 200)}`
        };
      }

      console.log('Add room response:', result);
      console.log('Response status:', response.status);

      setRoomStatus(result);
      setIsRoomUploading(false);
      
      if (result.success) {
        // Reset form if it still exists
        if (form) {
          form.reset();
        }
        // Refresh rooms list
        await fetchRooms();
      } else {
        // Show detailed error if available
        console.error('Add room error:', result);
        // The error will be displayed via roomStatus state
      }
    } catch (error) {
      console.error('Error adding room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setRoomStatus({
        success: false,
        error: `Failed to add room: ${errorMessage}`,
        details: error instanceof Error ? error.stack : undefined
      });
      setIsRoomUploading(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsEditing(true);
    setEditStatus(null);

    const formData = new FormData(e.currentTarget);
    const response = await fetch('/api/cms/update-room', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();

    setEditStatus(result);
    setIsEditing(false);
    
    if (result.success) {
      // Store success message in sessionStorage before redirecting
      sessionStorage.setItem('roomUpdateSuccess', result.message || 'Room updated successfully!');
      // Immediately redirect to /admin
      window.location.href = '/admin';
    }
    // If failed, stay on the modal and show error (editStatus already set above)
  }

  async function handleEditClick(room: RoomDisplay) {
    // Get full room metadata including all fields
    // Try to get from API first (includes Blob Storage rooms), then fall back to static metadata
    let fullMetadata = getRoomMetadata(room.roomId);
    
    // If not found in static metadata, try fetching from API (which includes Redis/Blob Storage rooms)
    if (!fullMetadata) {
      try {
        const response = await fetch(`/api/rooms?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          const roomFromAPI = data.rooms.find((r: any) => r.roomId === room.roomId);
          if (roomFromAPI?.metadata) {
            // Convert API metadata format to RoomMetadata format
            fullMetadata = {
              id: room.roomId,
              name: roomFromAPI.metadata.name,
              type: roomFromAPI.metadata.type,
              description: roomFromAPI.metadata.description,
              descriptionI18n: roomFromAPI.metadata.descriptionI18n,
              amenities: roomFromAPI.metadata.amenities,
              bedInfo: roomFromAPI.metadata.bedInfo,
              maxGuests: roomFromAPI.metadata.maxGuests,
              size: roomFromAPI.metadata.size,
              address: roomFromAPI.metadata.address,
              mapUrl: roomFromAPI.metadata.mapUrl,
              altText: roomFromAPI.metadata.altText,
              lastUpdated: roomFromAPI.metadata.lastUpdated,
            };
          }
        }
      } catch (error) {
        console.error('Error fetching room metadata from API:', error);
      }
    }
    
    if (fullMetadata) {
      setEditingRoom({
        ...room,
        // Add ALL fields from metadata to ensure form is fully populated
        type: fullMetadata.type || room.type,
        description: fullMetadata.description || room.description,
        descriptionI18n: fullMetadata.descriptionI18n || room.descriptionI18n,
        maxGuests: fullMetadata.maxGuests || room.maxGuests,
        size: fullMetadata.size || room.size,
        bedInfo: fullMetadata.bedInfo,
        address: fullMetadata.address,
        mapUrl: fullMetadata.mapUrl,
        amenities: fullMetadata.amenities,
        altText: fullMetadata.altText || room.altText,
      });
    } else {
      setEditingRoom(room);
    }
    await fetchRoomImages(room.roomId);
  }

  async function fetchRoomImages(roomId: string) {
    setIsLoadingImages(true);
    try {
      // Add cache busting timestamp to force fresh data
      const cacheBuster = Date.now();
      const response = await fetch(`/api/cms/room-images?roomId=${roomId}&t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const result = await response.json();
      console.log('Fetched room images:', { roomId, imageCount: result.images?.length, images: result.images });
      
      if (result.success) {
        // Add cache busting timestamp to each image URL
        const imagesWithCacheBust = (result.images || []).map((img: any) => ({
          ...img,
          url: `${img.url}?t=${cacheBuster}`,
        }));
        setRoomImages(imagesWithCacheBust);
        console.log('Updated room images state:', imagesWithCacheBust.map((img: any) => ({ filename: img.filename, isMain: img.isMain })));
      }
    } catch (error) {
      console.error('Error fetching room images:', error);
    } finally {
      setIsLoadingImages(false);
    }
  }

  async function handleDeleteRoom(roomId: string, roomName: string) {
    if (!confirm(`Are you sure you want to delete "${roomName}" (${roomId})?\n\nThis will delete the entire room including all images.\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/cms/delete-room?roomId=${encodeURIComponent(roomId)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      console.log('Delete room response:', result);
      
      if (result.success) {
        // Remove from room order if it exists
        const currentOrder = [...roomOrder];
        const updatedOrder = currentOrder.filter(id => id !== roomId);
        if (updatedOrder.length !== currentOrder.length) {
          await saveRoomOrder(updatedOrder);
        }
        
        // Close edit modal if it's open for this room
        if (editingRoom && editingRoom.roomId === roomId) {
          setEditingRoom(null);
          setEditStatus(null);
        }
        
        // Immediately remove from local state for instant UI update
        setRooms(prevRooms => prevRooms.filter(room => room.roomId !== roomId));
        
        // Wait a bit for Redis to sync (especially important in production)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh rooms list with cache busting to ensure consistency
        await fetchRooms();
        
        alert(result.message || 'Room deleted successfully');
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n\n${result.details}`
          : result.error || 'Failed to delete room';
        if (result.note) {
          alert(`${errorMsg}\n\n${result.note}`);
        } else {
          alert(errorMsg);
        }
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to delete room: ${errorMessage}\n\nCheck the browser console for more details.`);
    }
  }

  async function handleDeleteImage(roomId: string, filename: string) {
    // Get the current image to show in confirmation
    const imageToDelete = roomImages.find(img => img.filename === filename);
    const displayName = imageToDelete?.filename || filename;
    
    // Don't allow deleting main image
    if (filename === 'main.jpg' || filename === '_hidden_main.jpg') {
      alert('Cannot delete the main image. Please set another image as main first, or delete the room entirely.');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${displayName}"?\n\nThis action cannot be undone.`)) return;

    setUpdatingImage(filename);
    try {
      const response = await fetch(`/api/cms/delete-image?roomId=${roomId}&filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      console.log('Delete image response:', result);
      
      if (result.success) {
        // Wait a bit for file system to sync, then refresh
        await new Promise(resolve => setTimeout(resolve, 300));
        await fetchRoomImages(roomId);
      } else {
        // Show detailed error message if available
        let errorMsg = result.error || 'Failed to delete image';
        if (result.details) {
          errorMsg += `\n\n${result.details}`;
        }
        if (result.code) {
          errorMsg += `\n\nError code: ${result.code}`;
        }
        console.error('Delete image error:', result);
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to delete image: ${errorMessage}\n\nCheck the browser console for more details.`);
    } finally {
      setUpdatingImage(null);
    }
  }

  async function handleSetMainImage(roomId: string, filename: string) {
    setUpdatingImage(filename);
    try {
      console.log('Setting main image:', { roomId, filename });
      const response = await fetch('/api/cms/set-main-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, filename }),
      });
      const result = await response.json();
      console.log('Set main image response:', result);
      
      if (result.success) {
        console.log('Swap successful, refreshing images...', result);
        
        // Wait longer for Blob Storage operations to fully propagate
        // Blob Storage list() operations may need time to reflect changes
        // Also wait for Next.js API route cache to clear
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // Show success message (only if there's an actual error)
        if (result.verification) {
          console.log('Verification:', result.verification);
          if (!result.verification.mainImageExists) {
            alert('Warning: Main image may not have been updated. Please refresh the page.');
            return; // Don't reload if there's an error
          }
          // URL not changing is expected with Blob Storage - content is updated
          // No need to show warning - the swap is working correctly
          console.log('Main image swap completed successfully. URL unchanged is expected with Blob Storage.');
        }
        
        // Force a hard reload (bypass cache) to ensure latest images are loaded
        // Use location.reload() with a cache-busting parameter in the URL
        const refreshParam = `refresh=${Date.now()}`;
        window.location.href = `/admin?${refreshParam}`;
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n\n${result.details}`
          : result.error || 'Failed to set main image';
        console.error('Set main image error:', result);
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Error setting main image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to set main image: ${errorMessage}`);
    } finally {
      setUpdatingImage(null);
    }
  }

  async function handleToggleVisibility(roomId: string, filename: string, hide: boolean) {
    setUpdatingImage(filename);
    try {
      const response = await fetch('/api/cms/toggle-image-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, filename, hide }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchRoomImages(roomId);
      } else {
        alert(result.error || 'Failed to toggle image visibility');
      }
    } catch (error) {
      console.error('Error toggling image visibility:', error);
      alert('Failed to toggle image visibility');
    } finally {
      setUpdatingImage(null);
    }
  }

  async function handleUpdateImage(roomId: string, filename: string, file: File) {
    setUpdatingImage(filename);
    try {
      const formData = new FormData();
      formData.append('roomId', roomId);
      formData.append('filename', filename);
      formData.append('image', file);

      const response = await fetch('/api/cms/update-image', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        await fetchRoomImages(roomId);
      } else {
        alert(result.error || 'Failed to update image');
      }
    } catch (error) {
      console.error('Error updating image:', error);
      alert('Failed to update image');
    } finally {
      setUpdatingImage(null);
    }
  }

  async function fetchRoomOrder(): Promise<string[]> {
    try {
      const response = await fetch('/api/cms/room-order');
      if (response.ok) {
        const data = await response.json();
        const order = data.order || [];
        setRoomOrder(order);
        return order;
      }
    } catch (error) {
      console.error('Error fetching room order:', error);
    }
    return [];
  }

  async function saveRoomOrder(newOrder: string[]) {
    try {
      const response = await fetch('/api/cms/room-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });
      if (response.ok) {
        setRoomOrder(newOrder);
      } else {
        console.error('Failed to save room order');
      }
    } catch (error) {
      console.error('Error saving room order:', error);
    }
  }

  async function fetchDeletedRooms(): Promise<string[]> {
    try {
      // Add cache busting to ensure fresh data
      const response = await fetch(`/api/cms/deleted-rooms?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        const deletedRooms = data.deletedRooms || [];
        console.log('Fetched deleted rooms:', deletedRooms);
        return deletedRooms;
      }
    } catch (error) {
      console.error('Error fetching deleted rooms:', error);
    }
    return [];
  }

  async function fetchRooms() {
    setIsLoadingRooms(true);
    try {
      // Fetch room order first
      const order = await fetchRoomOrder();

      // Fetch deleted rooms list
      const deletedRooms = await fetchDeletedRooms();
      const deletedRoomsSet = new Set(deletedRooms);

      // Fetch rooms with images and metadata from API (with aggressive cache busting)
      // The API already filters deleted rooms and includes metadata from both Redis and static file
      // Use a unique timestamp to ensure we always get fresh data
      const cacheBuster = Date.now() + Math.random();
      const response = await fetch(`/api/rooms?t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const roomsData: { 
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
      }[] = response.ok 
        ? (await response.json()).rooms 
        : [];

      // Get static metadata for rooms that don't have metadata in API response (fallback)
      const allMetadata = getAllRoomMetadata();
      const metadataMap = new Map(
        allMetadata.map(m => [m.id, m])
      );

      // Create merged rooms from API response
      const mergedRooms: RoomDisplay[] = roomsData
        .filter(room => {
          // Exclude if explicitly deleted
          const isDeleted = deletedRoomsSet.has(room.roomId) || 
                           Array.from(deletedRoomsSet).some(deletedId => 
                             deletedId.toLowerCase() === room.roomId.toLowerCase()
                           );
          
          if (isDeleted) {
            console.log(`Filtering out deleted room: ${room.roomId}`);
            return false;
          }
          return true;
        })
        .map(room => {
          // Use metadata from API if available (Blob Storage rooms), otherwise use static metadata
          const metadata = room.metadata || metadataMap.get(room.roomId);
          
          if (!metadata) {
            console.warn(`No metadata found for ${room.roomId}`);
            // Return basic info if no metadata
            return {
              roomId: room.roomId,
              name: room.roomId,
              type: 'Unknown',
              description: '',
              image: room.mainImage,
              maxGuests: 2,
              size: '0 m²',
              hasImage: true,
            };
          }

          // Add cache busting to image URL to ensure fresh image after swaps
          // Use lastUpdated timestamp from metadata if available, otherwise use current timestamp
          // This ensures the cache buster changes when the image is actually updated
          const cacheBuster = metadata.lastUpdated || Date.now();
          const imageUrl = room.mainImage.includes('?') 
            ? `${room.mainImage.split('?')[0]}?t=${cacheBuster}&v=${Date.now()}`
            : `${room.mainImage}?t=${cacheBuster}&v=${Date.now()}`;

          return {
            roomId: room.roomId,
            name: metadata.name,
            type: metadata.type,
            description: metadata.description,
            descriptionI18n: metadata.descriptionI18n,
            image: imageUrl,
            maxGuests: metadata.maxGuests,
            size: metadata.size,
            bedInfo: metadata.bedInfo,
            address: metadata.address,
            mapUrl: metadata.mapUrl,
            amenities: metadata.amenities,
            altText: metadata.altText,
            hasImage: true,
            lastUpdated: metadata.lastUpdated, // Include lastUpdated for image key
          };
        });

      // Sort rooms based on saved order
      const sortedRooms = [...mergedRooms].sort((a, b) => {
        const orderA = order.indexOf(a.roomId);
        const orderB = order.indexOf(b.roomId);
        
        // If both are in order, sort by order
        if (orderA !== -1 && orderB !== -1) {
          return orderA - orderB;
        }
        // If only A is in order, A comes first
        if (orderA !== -1) return -1;
        // If only B is in order, B comes first
        if (orderB !== -1) return 1;
        // If neither is in order, maintain original order
        return 0;
      });

      setRooms(sortedRooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setIsLoadingRooms(false);
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newRooms = [...rooms];
    const draggedRoom = newRooms[draggedIndex];
    newRooms.splice(draggedIndex, 1);
    newRooms.splice(dropIndex, 0, draggedRoom);

    setRooms(newRooms);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save the new order
    const newOrder = newRooms.map(room => room.roomId);
    saveRoomOrder(newOrder);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  useEffect(() => {
    // If we just reloaded after an image swap, wait a moment for Blob Storage to propagate
    const urlParams = new URLSearchParams(window.location.search);
    const isRefresh = urlParams.has('refresh');
    
    if (isRefresh) {
      // Wait a bit longer to ensure Blob Storage has propagated
      setTimeout(() => {
        fetchRooms();
      }, 1000);
    } else {
      fetchRooms();
    }
    
    // Check for success message from room update
    const successMsg = sessionStorage.getItem('roomUpdateSuccess');
    if (successMsg) {
      setSuccessMessage(successMsg);
      setShowSuccessModal(true);
      sessionStorage.removeItem('roomUpdateSuccess'); // Clear after showing
    }
  }, []);

  return (
    <>
      {/* Success Notification - Fixed position top right */}
      {showSuccessModal && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div className="bg-white rounded-lg shadow-lg border border-green-200 max-w-md w-full p-4 flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900">Success!</h3>
              <p className="text-sm text-gray-600 mt-1">{successMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <main className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-3xl font-light text-gray-900 mb-2">CMS Admin Panel</h1>
          <p className="text-gray-600">Manage your landing page content</p>
        </div>

        {/* Hero Image Upload Section */}
        <section className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-light text-gray-900 mb-6">Hero Image</h2>
          
          {/* Current Hero Image Preview */}
          {heroImageExists && (
            <div className="mb-6 p-4 bg-gray-50 rounded-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Current Hero Image</p>
                <button
                  onClick={handleDeleteHero}
                  disabled={isDeletingHero}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeletingHero ? 'Deleting...' : 'Delete Hero Image'}
                </button>
              </div>
              <div className="relative w-full h-48 rounded-sm overflow-hidden border border-gray-300">
                <Image
                  key={heroImageUrl} // Force re-render when URL changes
                  src={heroImageUrl}
                  alt="Current hero image"
                  fill
                  className="object-cover"
                  sizes="100%"
                  unoptimized={heroImageUrl.startsWith('http')}
                />
              </div>
            </div>
          )}

          <form onSubmit={handleHeroSubmit} className="space-y-4">
            <div>
              <label htmlFor="hero-image" className="block text-sm font-medium text-gray-700 mb-2">
                {heroImageExists ? 'Replace Hero Background Image' : 'Upload Hero Background Image'}
              </label>
              <input
                type="file"
                id="hero-image"
                name="image"
                accept="image/*"
                required
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              <p className="mt-1 text-sm text-gray-500">
                {heroImageExists 
                  ? 'This will replace the current hero background image.'
                  : 'Upload a new hero background image.'}
              </p>
            </div>
            <button
              type="submit"
              disabled={isHeroUploading}
              className="px-6 py-2 bg-[#333333] text-white rounded-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isHeroUploading ? 'Uploading...' : heroImageExists ? 'Update Hero Image' : 'Upload Hero Image'}
            </button>
            {heroStatus && (
              <div
                className={`p-4 rounded-sm ${
                  heroStatus.success
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {heroStatus.success ? heroStatus.message : heroStatus.error}
              </div>
            )}
          </form>
        </section>

        {/* Current Rooms Section */}
        <section className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-light text-gray-900">Current Rooms</h2>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (confirm('This will automatically translate all room descriptions into 12 languages. Rooms that already have translations will be skipped unless you choose to overwrite. Continue?')) {
                    try {
                      const response = await fetch('/api/cms/auto-translate-rooms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ overwrite: false, dryRun: false }),
                      });
                      const result = await response.json();
                      if (result.success) {
                        alert(`✅ Success! Translated ${result.summary.translated} rooms. Skipped ${result.summary.skipped}. Errors: ${result.summary.errors}\n\nPlease refresh to see the updates.`);
                        await fetchRooms();
                      } else {
                        alert(`❌ Error: ${result.error || 'Failed to translate rooms'}`);
                      }
                    } catch (error) {
                      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 transition-colors"
                title="Auto-translate all room descriptions into 12 languages"
              >
                🌐 Auto-Translate All Rooms
              </button>
              <button
                onClick={fetchRooms}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6 min-h-[1.5rem]">
            💡 Drag and drop room cards to reorder them. The order will be reflected on the home page.
          </p>
          {isLoadingRooms ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No rooms found. Add your first room below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room, index) => (
                <div
                  key={room.roomId}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`border border-gray-200 rounded-sm overflow-hidden hover:shadow-md transition-all flex flex-col cursor-move ${
                    draggedIndex === index ? 'opacity-50' : ''
                  } ${
                    dragOverIndex === index ? 'ring-2 ring-[#333333] ring-offset-2' : ''
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-gray-100 flex-shrink-0">
                    {room.hasImage ? (
                      <Image
                        src={room.image}
                        alt={room.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                        key={`${room.roomId}-${room.lastUpdated || Date.now()}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <div className="text-center text-gray-600">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs">No image</p>
                        </div>
                      </div>
                    )}
                    {!room.hasImage && (
                      <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        Missing Image
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <h3 className="font-medium text-gray-900 text-lg truncate">{room.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600 truncate ml-6">{room.type}</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex-shrink-0 ml-2">
                        {room.roomId}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2 min-h-[2.5rem]">{room.description}</p>
                    <div className="flex gap-4 text-xs text-gray-500 mb-3">
                      <span>👥 {room.maxGuests} guests</span>
                      <span>📐 {room.size}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100 mb-4 min-h-[3rem]">
                      {room.altText ? (
                        <>
                          <p className="text-xs font-medium text-gray-700 mb-1">Alt Text:</p>
                          <div className="space-y-1 text-xs text-gray-600">
                            {room.altText.en && <div>🇬🇧 EN: {room.altText.en}</div>}
                            {room.altText.ja && <div>🇯🇵 JA: {room.altText.ja}</div>}
                            {room.altText.ko && <div>🇰🇷 KO: {room.altText.ko}</div>}
                            {room.altText.zh && <div>🇨🇳 ZH: {room.altText.zh}</div>}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-600">No alt text</div>
                      )}
                    </div>
                    <div className="mt-auto flex gap-2">
                      <button
                        onClick={() => handleEditClick(room)}
                        className="flex-1 px-4 py-2 bg-[#333333] text-white rounded-sm text-sm font-medium hover:bg-gray-800 transition-colors"
                      >
                        Edit Room
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.roomId, room.name)}
                        className="px-4 py-2 bg-red-600 text-white rounded-sm text-sm font-medium hover:bg-red-700 transition-colors"
                        title={`Delete ${room.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Edit Room Modal */}
        {editingRoom && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-light text-gray-900">Edit Room: {editingRoom.name}</h2>
                <button
                  onClick={() => {
                    setEditingRoom(null);
                    setEditStatus(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                <input type="hidden" name="roomId" value={editingRoom.roomId} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Room Name *
                    </label>
                    <input
                      type="text"
                      id="edit-name"
                      name="name"
                      defaultValue={editingRoom.name}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-type" className="block text-sm font-medium text-gray-700 mb-2">
                      Room Type *
                    </label>
                    <input
                      type="text"
                      id="edit-type"
                      name="type"
                      defaultValue={editingRoom.type || ''}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Fallback - for backward compatibility) *
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      id="edit-description"
                      name="description"
                      defaultValue={editingRoom.description}
                      required
                      rows={3}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = document.getElementById('edit-description') as HTMLTextAreaElement;
                        const englishDesc = textarea?.value || editingRoom.description;
                        handleTranslateDescription('edit', englishDesc);
                      }}
                      disabled={isTranslating}
                      className="px-4 py-2 bg-[#8B7355] text-white rounded-sm hover:bg-[#6B5A42] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                      title="Auto-translate English description to all languages"
                    >
                      {isTranslating ? 'Translating...' : '🌐 Translate'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">This is used as a fallback if translations are missing</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Room Description (Multi-language) *
                  </label>
                  <div className="space-y-4">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <div key={lang.code}>
                        <label htmlFor={`edit-description-${lang.code}`} className="block text-xs font-medium text-gray-600 mb-1">
                          {lang.name}
                        </label>
                        <textarea
                          id={`edit-description-${lang.code}`}
                          name={`descriptionI18n-${lang.code}`}
                          defaultValue={editingRoom.descriptionI18n?.[lang.code as keyof typeof editingRoom.descriptionI18n] || ''}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent text-sm"
                          placeholder={`Enter description in ${lang.name}...`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">At least one language description is recommended. The fallback description will be used if a translation is missing.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="edit-maxGuests" className="block text-sm font-medium text-gray-700 mb-2">
                      Max Guests *
                    </label>
                    <input
                      type="number"
                      id="edit-maxGuests"
                      name="maxGuests"
                      defaultValue={editingRoom.maxGuests}
                      required
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-size" className="block text-sm font-medium text-gray-700 mb-2">
                      Room Size (m²) *
                    </label>
                    <input
                      type="text"
                      id="edit-size"
                      name="size"
                      defaultValue={editingRoom.size}
                      required
                      placeholder="e.g., 20"
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        // Extract number and auto-format to m²
                        const numberMatch = value.match(/\d+/);
                        if (numberMatch && !value.toLowerCase().endsWith('m²') && !value.toLowerCase().endsWith('m2')) {
                          e.target.value = `${numberMatch[0]} m²`;
                        } else if (value.toLowerCase().endsWith('m2')) {
                          e.target.value = value.replace(/m2$/i, 'm²');
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">Just type a number (e.g., 20) - it will auto-convert to m²</p>
                  </div>

                  <div>
                    <label htmlFor="edit-bedInfo" className="block text-sm font-medium text-gray-700 mb-2">
                      Bed Info *
                    </label>
                    <input
                      type="text"
                      id="edit-bedInfo"
                      name="bedInfo"
                      defaultValue={editingRoom.bedInfo || ''}
                      required
                      placeholder="e.g., 1 double bed (140 cm x 200 cm)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Amenities *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PRESET_AMENITIES.map((amenity) => {
                      const Icon = amenity.icon;
                      const currentAmenities = editingRoom.amenities || [];
                      const isChecked = currentAmenities.includes(amenity.name);
                      return (
                        <label
                          key={amenity.name}
                          className={`flex items-center gap-2 p-3 border-2 rounded-sm cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-[#333333] bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            name="amenities"
                            value={amenity.name}
                            defaultChecked={isChecked}
                            className="w-4 h-4 text-[#333333] border-gray-300 rounded focus:ring-[#333333]"
                          />
                          <Icon className="w-5 h-5 text-gray-600" />
                          <span className="text-sm text-gray-700">{amenity.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    id="edit-address"
                    name="address"
                    defaultValue={editingRoom.address || ''}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="edit-mapUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Google Maps Embed URL *
                  </label>
                  <input
                    type="url"
                    id="edit-mapUrl"
                    name="mapUrl"
                    defaultValue={editingRoom.mapUrl || ''}
                    required
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-altTextEn" className="block text-sm font-medium text-gray-700 mb-2">
                      Alt Text (English)
                    </label>
                    <input
                      type="text"
                      id="edit-altTextEn"
                      name="altTextEn"
                      defaultValue={editingRoom.altText?.en || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-altTextJa" className="block text-sm font-medium text-gray-700 mb-2">
                      Alt Text (日本語)
                    </label>
                    <input
                      type="text"
                      id="edit-altTextJa"
                      name="altTextJa"
                      defaultValue={editingRoom.altText?.ja || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-altTextKo" className="block text-sm font-medium text-gray-700 mb-2">
                      Alt Text (한국어)
                    </label>
                    <input
                      type="text"
                      id="edit-altTextKo"
                      name="altTextKo"
                      defaultValue={editingRoom.altText?.ko || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-altTextZh" className="block text-sm font-medium text-gray-700 mb-2">
                      Alt Text (中文)
                    </label>
                    <input
                      type="text"
                      id="edit-altTextZh"
                      name="altTextZh"
                      defaultValue={editingRoom.altText?.zh || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Image Management Section */}
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Manage Room Images
                  </label>
                  
                  {isLoadingImages ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading images...</p>
                    </div>
                  ) : roomImages.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-sm">
                      <p className="text-gray-500">No images found for this room</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {roomImages.map((image) => (
                        <div
                          key={image.filename}
                          className={`relative border-2 rounded-sm overflow-hidden ${
                            image.isMain ? 'border-[#333333] ring-2 ring-[#333333]' : 'border-gray-200'
                          } ${image.isHidden ? 'opacity-50' : ''}`}
                        >
                          {/* Image */}
                          <div className="relative aspect-square bg-gray-100">
                            <Image
                              src={image.url}
                              alt={image.filename}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              unoptimized
                              key={`${image.filename}-${imageRefreshKey}`}
                            />
                            {image.isMain && (
                              <div className="absolute top-2 left-2 bg-[#333333] text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" />
                                Main
                              </div>
                            )}
                            {image.isHidden && (
                              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                <EyeOff className="w-3 h-3" />
                                Hidden
                              </div>
                            )}
                          </div>

                          {/* Controls */}
                          <div className="p-2 bg-white border-t border-gray-200">
                            <div className="flex flex-wrap gap-1">
                              {/* Set as Main */}
                              {!image.isMain && !image.isHidden && (
                                <button
                                  type="button"
                                  onClick={() => handleSetMainImage(editingRoom!.roomId, image.filename)}
                                  disabled={updatingImage === image.filename || isLoadingImages}
                                  className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                                  title="Set as main image"
                                >
                                  <Star className="w-3 h-3 mx-auto" />
                                </button>
                              )}

                              {/* Toggle Visibility */}
                              <button
                                type="button"
                                onClick={() => handleToggleVisibility(editingRoom!.roomId, image.filename, !image.isHidden)}
                                disabled={updatingImage === image.filename || image.isMain || isLoadingImages}
                                className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                                title={image.isHidden ? 'Show image' : 'Hide image'}
                              >
                                {image.isHidden ? (
                                  <Eye className="w-3 h-3 mx-auto" />
                                ) : (
                                  <EyeOff className="w-3 h-3 mx-auto" />
                                )}
                              </button>

                              {/* Update Image */}
                              <label className={`flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-center ${
                                updatingImage === image.filename || isLoadingImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}>
                                <Upload className="w-3 h-3 mx-auto" />
                                <span className="sr-only">Update {image.filename}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  aria-label={`Update ${image.filename}`}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && !isLoadingImages) {
                                      handleUpdateImage(editingRoom!.roomId, image.filename, file);
                                    }
                                  }}
                                  disabled={updatingImage === image.filename || isLoadingImages}
                                />
                              </label>

                              {/* Delete Image */}
                              {!image.isMain && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Always use the filename from the current image object in state
                                    // This ensures we're deleting the correct file even after renames
                                    handleDeleteImage(editingRoom!.roomId, image.filename);
                                  }}
                                  disabled={updatingImage === image.filename || isLoadingImages}
                                  className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                                  title={`Delete ${image.filename}`}
                                >
                                  <Trash2 className="w-3 h-3 mx-auto" />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 truncate" title={image.filename}>
                              {image.filename}
                            </p>
                          </div>

                          {updatingImage === image.filename && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                              <div className="text-sm text-gray-600">Processing...</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-images" className="block text-sm font-medium text-gray-700 mb-2">
                    Add New Images (optional)
                  </label>
                  <input
                    type="file"
                    id="edit-images"
                    name="images"
                    accept="image/*"
                    multiple
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Upload new images to add to this room. They will be added as additional images.
                  </p>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isEditing}
                    className="flex-1 px-6 py-2 bg-[#333333] text-white rounded-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEditing ? 'Updating...' : 'Update Room'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingRoom) {
                        handleDeleteRoom(editingRoom.roomId, editingRoom.name);
                      }
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete Room
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRoom(null);
                      setEditStatus(null);
                    }}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {editStatus && (
                  <div
                    className={`p-4 rounded-sm ${
                      editStatus.success
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {editStatus.success ? editStatus.message : editStatus.error}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Add New Room Section */}
        <section className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-light text-gray-900 mb-6">Add New Room</h2>
          <form onSubmit={handleRoomSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="room-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name *
                </label>
                <input
                  type="text"
                  id="room-name"
                  name="name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                  placeholder="e.g., Room 6"
                />
              </div>

              <div>
                <label htmlFor="room-type" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Type *
                </label>
                <input
                  type="text"
                  id="room-type"
                  name="type"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                  placeholder="e.g., Standard Double"
                />
              </div>
            </div>

            <div>
              <label htmlFor="room-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Fallback - for backward compatibility) *
              </label>
              <div className="flex gap-2">
                <textarea
                  id="room-description"
                  name="description"
                  required
                  rows={3}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                  placeholder="Describe the room (fallback)..."
                />
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.getElementById('room-description') as HTMLTextAreaElement;
                    const englishDesc = textarea?.value || '';
                    handleTranslateDescription('add', englishDesc);
                  }}
                  disabled={isTranslating}
                  className="px-4 py-2 bg-[#8B7355] text-white rounded-sm hover:bg-[#6B5A42] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                  title="Auto-translate English description to all languages"
                >
                  {isTranslating ? 'Translating...' : '🌐 Translate'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">This is used as a fallback if translations are missing</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Room Description (Multi-language) *
              </label>
              <div className="space-y-4">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <div key={lang.code}>
                    <label htmlFor={`room-description-${lang.code}`} className="block text-xs font-medium text-gray-600 mb-1">
                      {lang.name}
                    </label>
                    <textarea
                      id={`room-description-${lang.code}`}
                      name={`descriptionI18n-${lang.code}`}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent text-sm"
                      placeholder={`Enter description in ${lang.name}...`}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">At least one language description is recommended. The fallback description will be used if a translation is missing.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="room-maxGuests" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Guests *
                </label>
                <input
                  type="number"
                  id="room-maxGuests"
                  name="maxGuests"
                  defaultValue="2"
                  required
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="room-size" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Size (m²) *
                </label>
                <input
                  type="text"
                  id="room-size"
                  name="size"
                  defaultValue="20"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                  placeholder="e.g., 20"
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    // Extract number and auto-format to m²
                    const numberMatch = value.match(/\d+/);
                    if (numberMatch && !value.toLowerCase().endsWith('m²') && !value.toLowerCase().endsWith('m2')) {
                      e.target.value = `${numberMatch[0]} m²`;
                    } else if (value.toLowerCase().endsWith('m2')) {
                      e.target.value = value.replace(/m2$/i, 'm²');
                    }
                  }}
                />
                <p className="mt-1 text-xs text-gray-500">Just type a number (e.g., 20) - it will auto-convert to m²</p>
              </div>

              <div>
                <label htmlFor="room-bedInfo" className="block text-sm font-medium text-gray-700 mb-2">
                  Bed Info *
                </label>
                <input
                  type="text"
                  id="room-bedInfo"
                  name="bedInfo"
                  defaultValue="1 double bed (140 cm x 200 cm)"
                  required
                  placeholder="e.g., 1 double bed (140 cm x 200 cm)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="alt-text-en" className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text (English)
                </label>
                <input
                  type="text"
                  id="alt-text-en"
                  name="altTextEn"
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                  placeholder="SEO-friendly alt text in English"
                />
              </div>

              <div>
                <label htmlFor="alt-text-ja" className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text (日本語)
                </label>
                <input
                  type="text"
                  id="alt-text-ja"
                  name="altTextJa"
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                  placeholder="SEO用の日本語のaltテキスト"
                />
              </div>

              <div>
                <label htmlFor="alt-text-ko" className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text (한국어)
                </label>
                <input
                  type="text"
                  id="alt-text-ko"
                  name="altTextKo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                  placeholder="SEO 친화적인 한국어 alt 텍스트"
                />
              </div>

              <div>
                <label htmlFor="alt-text-zh" className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text (中文)
                </label>
                <input
                  type="text"
                  id="alt-text-zh"
                  name="altTextZh"
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                  placeholder="SEO友好的中文alt文本"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Amenities *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRESET_AMENITIES.map((amenity) => {
                  const Icon = amenity.icon;
                  return (
                    <label
                      key={amenity.name}
                      className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-sm cursor-pointer hover:border-gray-300 transition-colors"
                    >
                      <input
                        type="checkbox"
                        name="amenities"
                        value={amenity.name}
                        defaultChecked={amenity.name === 'Wi-Fi' || amenity.name === 'Private Bathroom'} // Default checked for common amenities
                        className="w-4 h-4 text-[#333333] border-gray-300 rounded focus:ring-[#333333]"
                      />
                      <Icon className="w-5 h-5 text-gray-600" />
                      <span className="text-sm text-gray-700">{amenity.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="room-address" className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                id="room-address"
                name="address"
                defaultValue="Near Komagome Station, Bunkyo City, Tokyo"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                placeholder="e.g., Near Komagome Station, Bunkyo City, Tokyo"
              />
            </div>

            <div>
              <label htmlFor="room-mapUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Google Maps Embed URL *
              </label>
              <input
                type="url"
                id="room-mapUrl"
                name="mapUrl"
                defaultValue="https://www.google.com/maps/embed?pb=..."
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#333333] focus:border-transparent"
                placeholder="e.g., https://www.google.com/maps/embed?pb=..."
              />
            </div>

            <div>
              <label htmlFor="room-images" className="block text-sm font-medium text-gray-700 mb-2">
                Room Images *
              </label>
              <input
                type="file"
                id="room-images"
                name="images"
                accept="image/*"
                multiple
                required
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              <p className="mt-1 text-sm text-gray-500">
                Upload one or more images. The first image will be the main image (main.jpg), additional images will be saved as image-1.jpg, image-2.jpg, etc.
              </p>
            </div>

            <button
              type="submit"
              disabled={isRoomUploading}
              className="px-6 py-2 bg-[#333333] text-white rounded-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRoomUploading ? 'Adding Room...' : 'Add Room'}
            </button>
            {roomStatus && (
              <div
                className={`p-4 rounded-sm ${
                  roomStatus.success
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {roomStatus.success ? (
                  roomStatus.message
                ) : (
                  <div>
                    <div className="font-medium">{roomStatus.error}</div>
                    {(roomStatus as any).details && (
                      <div className="mt-2 text-sm opacity-90">{(roomStatus as any).details}</div>
                    )}
                    {(roomStatus as any).note && (
                      <div className="mt-2 text-sm opacity-90 italic">{(roomStatus as any).note}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </section>
      </main>
    </div>
    </>
  );
}

