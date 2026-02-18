/**
 * Script to fetch rooms from production (picainn.com) and prepare for translation
 * 
 * Run this to see what rooms exist in production
 */

async function fetchRoomsFromProduction() {
  try {
    const response = await fetch('https://picainn.com/api/cms/auto-translate-rooms', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('=== ROOMS FROM PRODUCTION ===');
    console.log(`Total rooms: ${data.totalRooms}`);
    console.log('\n=== ROOM DETAILS ===\n');
    
    data.rooms.forEach((room: any, index: number) => {
      console.log(`${index + 1}. ${room.name} (${room.roomId})`);
      console.log(`   Type: ${room.type}`);
      console.log(`   Description: ${room.description}`);
      console.log(`   Has translations: ${room.hasTranslations ? 'Yes' : 'No'}`);
      console.log(`   Translation count: ${room.translationCount}`);
      console.log(`   Max guests: ${room.maxGuests}, Size: ${room.size}`);
      console.log('');
    });

    return data;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  fetchRoomsFromProduction()
    .then(() => {
      console.log('\n✅ Successfully fetched rooms from production');
      console.log('\nNext steps:');
      console.log('1. Review the room descriptions above');
      console.log('2. The translations will be generated automatically');
      console.log('3. POST to /api/cms/auto-translate-rooms to apply translations');
    })
    .catch((error) => {
      console.error('Failed to fetch rooms:', error);
      process.exit(1);
    });
}

export { fetchRoomsFromProduction };

