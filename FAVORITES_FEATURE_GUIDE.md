# Favorites/Bookmarks Feature Guide

## Overview
Users can now bookmark their favorite doctors on the Discover page for quick access. The feature includes:
- **Bookmark button** in the search bar to toggle favorites view
- **Bookmark icon** on each doctor card to add/remove from favorites
- **Persistent storage** across app sessions
- **Badge counter** showing number of favorites

## User Experience

### How to Use

#### 1. Add a Doctor to Favorites
- Navigate to the Discover page
- Find the doctor you want to favorite
- Click the **bookmark icon** on the right side of the doctor card
- The icon will turn **green** and become filled
- Doctor is now saved to your favorites

#### 2. View Only Favorite Doctors
- Click the **bookmark button** in the search bar (between search and filter buttons)
- The button will turn **green** when active
- Only your favorite doctors will be displayed
- A **badge** shows the count of favorite doctors

#### 3. Remove from Favorites
- Click the **filled green bookmark icon** on the doctor card
- The icon will return to empty/gray
- Doctor is removed from favorites

#### 4. Search Within Favorites
- While viewing favorites, use the search bar to filter
- Search works on name, specialization, and location
- Other filters (online status, specialization, sort) also work

### Visual Indicators

#### Bookmark Button (Search Bar)
- **Inactive**: Gray outline bookmark icon, no badge
- **Active**: Green filled bookmark icon with green badge showing count
- **Badge**: Shows number of favorite doctors (only visible if > 0)

#### Bookmark Icon (Doctor Card)
- **Not Favorited**: Gray outline bookmark, light gray color
- **Favorited**: Green filled bookmark, green color (#4CAF50)
- **Location**: Top-right of doctor card, next to chevron arrow

## Technical Details

### Files Involved

#### 1. `services/favoriteDoctorsService.ts`
Main service for managing favorites:
```typescript
// Add a doctor to favorites
await favoriteDoctorsService.addFavorite(doctor);

// Remove from favorites
await favoriteDoctorsService.removeFavorite(doctorId);

// Get all favorites
const favorites = await favoriteDoctorsService.getFavorites();

// Check if doctor is favorited
const isFav = await favoriteDoctorsService.isFavorite(doctorId);

// Get count
const count = await favoriteDoctorsService.getFavoritesCount();

// Clear all
await favoriteDoctorsService.clearFavorites();
```

#### 2. `components/DoctorCard.tsx`
- Added bookmark button with favorite toggle
- Added `onFavoriteChange` callback prop
- Checks favorite status on mount
- Updates UI based on favorite status

#### 3. `app/patient-dashboard.tsx`
- Added favorites state management
- Added bookmark button in search bar
- Integrated favorites into doctor filtering
- Passes `onFavoriteChange` callback to DoctorCard

### Data Storage

Favorites are stored in AsyncStorage with key `favorite_doctors`:
```typescript
interface FavoriteDoctor {
  id: string | number;
  name: string;
  specialization: string;
  profile_picture_url?: string;
  savedAt: number; // Timestamp
}
```

### State Management

#### Patient Dashboard State
```typescript
const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
const [favoriteDoctors, setFavoriteDoctors] = useState<any[]>([]);
const [favoritesRefreshTrigger, setFavoritesRefreshTrigger] = useState(0);
```

#### Filtering Logic
```typescript
// In filteredAndSortedDoctors useMemo:
let filteredDoctors = showFavoritesOnly ? favoriteDoctors : doctors;
```

## Integration with Existing Features

### Works With:
- ✅ **Search**: Filter favorites by name, specialization, location
- ✅ **Online Filter**: Show only online favorite doctors
- ✅ **Specialization Filter**: Filter favorites by specialization
- ✅ **Sorting**: Sort favorites by name, rating, experience, etc.
- ✅ **Animations**: Smooth card animations when switching views

### Does Not Interfere With:
- ✅ **Doctor Details**: Clicking doctor card still opens details
- ✅ **Appointments**: Booking appointments works normally
- ✅ **Other Tabs**: Favorites only affect Discover tab

## Performance Considerations

1. **Lazy Loading**: Favorites only loaded when needed
2. **Memoization**: `filteredAndSortedDoctors` uses useMemo to prevent unnecessary recalculations
3. **AsyncStorage**: Non-blocking async operations
4. **Efficient Filtering**: Uses array filter/map for O(n) complexity

## Future Enhancements

Possible improvements:
1. **Sort by Saved Date**: Show most recently favorited first
2. **Favorite Collections**: Group favorites by specialization
3. **Share Favorites**: Share list of favorite doctors
4. **Sync to Backend**: Save favorites to user profile on backend
5. **Recommendations**: Suggest doctors based on favorites
6. **Notifications**: Alert when favorite doctor is online

## Troubleshooting

### Favorites Not Persisting
- Check AsyncStorage permissions
- Verify `FAVORITES_KEY` is correct
- Check browser/app storage limits

### Bookmark Icon Not Updating
- Ensure `onFavoriteChange` callback is passed
- Check `favoritesRefreshTrigger` is being incremented
- Verify `loadFavoriteDoctors()` is being called

### Performance Issues
- Check AsyncStorage operations are not blocking
- Verify memoization is working correctly
- Monitor for unnecessary re-renders

## Testing Checklist

- [ ] Add doctor to favorites
- [ ] Remove doctor from favorites
- [ ] Toggle favorites view on/off
- [ ] Search within favorites
- [ ] Filter favorites by online status
- [ ] Filter favorites by specialization
- [ ] Sort favorites
- [ ] Verify favorites persist after app restart
- [ ] Verify bookmark icon updates correctly
- [ ] Verify badge count is accurate
- [ ] Test with 0, 1, and many favorites
