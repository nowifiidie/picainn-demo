# Room Images Directory

This directory contains images for each room in the guest house.

## Folder Structure

Each room has its own folder following the naming convention: `room1`, `room2`, `room3`, etc.

```
rooms/
  room1/
    main.jpg (required - room won't appear without this)
    image-1.jpg (optional)
    image-2.jpg (optional)
    image-3.jpg (optional)
    ...
  room2/
    main.jpg
    image-1.jpg
    ...
  ...
```

## Adding New Rooms

To add a new room (e.g., room6, room7, up to room15 or more):

1. **Create the folder**: Create a new folder named `room{N}` (e.g., `room6`, `room7`, etc.)

2. **Add the main image**: Add a file named `main.jpg` to the folder. This is **required** - the room will not appear on the website without this file.

3. **Add additional images** (optional): You can add more images using the naming pattern:
   - `image-1.jpg`
   - `image-2.jpg`
   - `image-3.jpg`
   - etc.

4. **Add room metadata**: Update `lib/rooms.ts` to include the new room's metadata (name, type, description, amenities, etc.)

5. **That's it!** The room will automatically appear on the website once `main.jpg` is added.

## Image Requirements

- **Main image** (`main.jpg`): Required for the room to appear on the page
- **Format**: JPG, PNG, or WebP (WebP recommended for better performance)
- **Recommended size**: 800x600px or larger for main images
- **Additional images**: Any number of images can be added using the `image-{N}.jpg` pattern

## Notes

- Rooms are automatically detected by the system - no code changes needed
- Only rooms with a `main.jpg` file will appear on the website
- Image paths are automatically generated: `/images/rooms/{roomId}/main.jpg`
- Next.js will automatically optimize images for performance

