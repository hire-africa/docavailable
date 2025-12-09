# Favorites Feature - Code Reference

## Quick Reference Guide

### 1. Service Usage

#### Add to Favorites
```typescript
import favoriteDoctorsService from '../services/favoriteDoctorsService';

await favoriteDoctorsService.addFavorite(doctor);
```

#### Remove from Favorites
```typescript
await favoriteDoctorsService.removeFavorite(doctorId);
```

#### Get All Favorites
```typescript
const favorites = await favoriteDoctorsService.getFavorites();
// Returns: FavoriteDoctor[]
```

#### Check if Favorited
```typescript
const isFav = await favoriteDoctorsService.isFavorite(doctorId);
// Returns: boolean
```

#### Get Count
```typescript
const count = await favoriteDoctorsService.getFavoritesCount();
// Returns: number
```

---

## Component Integration

### DoctorCard Component

**Props**:
```typescript
interface DoctorCardProps {
  doctor: any;
  onPress: (doctor: any) => void;
  onFavoriteChange?: (isFavorite: boolean) => void;  // NEW
}
```

**Usage**:
```typescript
<DoctorCard
  doctor={doctor}
  onPress={handleViewDoctorDetails}
  onFavoriteChange={() => setFavoritesRefreshTrigger(prev => prev + 1)}
/>
```

**Bookmark Button**:
```typescript
<TouchableOpacity 
  style={styles.bookmarkButton}
  onPress={handleFavoritePress}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <Icon 
    name={isFavorite ? 'bookmark' : 'bookmarkO'} 
    size={20} 
    color={isFavorite ? '#4CAF50' : '#CCC'} 
  />
</TouchableOpacity>
```

---

## Patient Dashboard Integration

### State Setup
```typescript
const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
const [favoriteDoctors, setFavoriteDoctors] = useState<any[]>([]);
const [favoritesRefreshTrigger, setFavoritesRefreshTrigger] = useState(0);
```

### Load Favorites Function
```typescript
const loadFavoriteDoctors = useCallback(async () => {
  try {
    const favorites = await favoriteDoctorsService.getFavorites();
    const favoriteDoctorObjects = doctors.filter(doc => 
      favorites.some(fav => fav.id === doc.id)
    );
    setFavoriteDoctors(favoriteDoctorObjects);
  } catch (error) {
    console.error('Error loading favorite doctors:', error);
  }
}, [doctors]);
```

### Load Favorites Effect
```typescript
useEffect(() => {
  if (doctors.length > 0) {
    loadFavoriteDoctors();
  }
}, [doctors, favoritesRefreshTrigger, loadFavoriteDoctors]);
```

### Filtered Doctors Logic
```typescript
const filteredAndSortedDoctors = useMemo(() => {
  let filteredDoctors = showFavoritesOnly ? favoriteDoctors : doctors;
  
  // ... rest of filtering logic
  
}, [doctors, favoriteDoctors, showFavoritesOnly, showOnlyOnline, selectedSpecialization, searchQuery, sortBy]);
```

### Bookmark Button in Search Bar
```typescript
<TouchableOpacity 
  style={styles.filterButton}
  onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <Icon 
    name={showFavoritesOnly ? 'bookmark' : 'bookmarkO'} 
    size={18} 
    color={showFavoritesOnly ? '#4CAF50' : '#CCC'} 
  />
  {favoriteDoctors.length > 0 && (
    <View style={[styles.filterBadge, { backgroundColor: showFavoritesOnly ? '#4CAF50' : '#E8F5E8' }]}>
      <Text style={[styles.filterBadgeText, { color: showFavoritesOnly ? '#FFF' : '#4CAF50' }]}>
        {favoriteDoctors.length}
      </Text>
    </View>
  )}
</TouchableOpacity>
```

---

## Data Structure

### FavoriteDoctor Interface
```typescript
interface FavoriteDoctor {
  id: string | number;
  name: string;
  specialization: string;
  profile_picture_url?: string;
  savedAt: number;  // Timestamp in milliseconds
}
```

### AsyncStorage Format
```json
{
  "favorite_doctors": [
    {
      "id": 1,
      "name": "Dr. John Doe",
      "specialization": "Cardiology",
      "profile_picture_url": "https://...",
      "savedAt": 1700000000000
    },
    {
      "id": 2,
      "name": "Dr. Jane Smith",
      "specialization": "Neurology",
      "profile_picture_url": "https://...",
      "savedAt": 1700000001000
    }
  ]
}
```

---

## Styling

### Bookmark Button Styles
```typescript
bookmarkButton: {
  padding: 4,
},
```

### Right Actions Container
```typescript
rightActions: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
```

### Filter Badge (existing, reused)
```typescript
filterBadge: {
  position: 'absolute',
  top: -8,
  right: -8,
  backgroundColor: '#4CAF50',
  borderRadius: 10,
  minWidth: 20,
  height: 20,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 6,
},

filterBadgeText: {
  color: '#FFF',
  fontSize: 11,
  fontWeight: 'bold',
},
```

---

## Color Scheme

### Active State (Favorited)
- Icon: Filled bookmark
- Color: `#4CAF50` (Green)
- Badge Background: `#4CAF50` (Green)
- Badge Text: `#FFF` (White)

### Inactive State (Not Favorited)
- Icon: Outline bookmark
- Color: `#CCC` (Light Gray)
- Badge Background: `#E8F5E8` (Very Light Green)
- Badge Text: `#4CAF50` (Green)

---

## Event Flow

### Adding to Favorites
```
User clicks bookmark icon
  ↓
handleFavoritePress() triggered
  ↓
e.stopPropagation() prevents card click
  ↓
favoriteDoctorsService.addFavorite(doctor) called
  ↓
AsyncStorage updated
  ↓
setIsFavorite(true)
  ↓
onFavoriteChange callback called
  ↓
setFavoritesRefreshTrigger(prev => prev + 1)
  ↓
loadFavoriteDoctors() runs
  ↓
favoriteDoctors state updated
  ↓
UI re-renders with updated favorite status
```

### Toggling Favorites View
```
User clicks bookmark button in search bar
  ↓
setShowFavoritesOnly(!showFavoritesOnly)
  ↓
filteredAndSortedDoctors recalculates
  ↓
Shows only favorites if true, all doctors if false
  ↓
UI updates with animation
```

---

## Error Handling

### Service Error Handling
```typescript
try {
  // Operation
} catch (error) {
  console.error('Error [operation]:', error);
  // Graceful fallback
}
```

### Component Error Handling
```typescript
const handleFavoritePress = async (e: any) => {
  e.stopPropagation();
  try {
    if (isFavorite) {
      await favoriteDoctorsService.removeFavorite(doctor.id);
      setIsFavorite(false);
    } else {
      await favoriteDoctorsService.addFavorite(doctor);
      setIsFavorite(true);
    }
    onFavoriteChange?.(isFavorite);
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
};
```

---

## Performance Tips

1. **Memoization**: `filteredAndSortedDoctors` uses `useMemo` to prevent unnecessary recalculations
2. **Lazy Loading**: Favorites only loaded when doctors list changes
3. **Efficient Filtering**: Uses array filter/map operations
4. **React.memo**: DoctorCard uses React.memo with custom comparison
5. **Async Operations**: Non-blocking AsyncStorage calls

---

## Debugging

### Console Logs to Add
```typescript
// In loadFavoriteDoctors
console.log('Loading favorites:', favorites);
console.log('Favorite doctor objects:', favoriteDoctorObjects);

// In handleFavoritePress
console.log('Toggling favorite for doctor:', doctor.id);
console.log('New favorite status:', !isFavorite);

// In service
console.log('Favorites updated:', favorites);
```

### Check AsyncStorage
```typescript
// In browser console or React Native debugger
const favorites = await AsyncStorage.getItem('favorite_doctors');
console.log(JSON.parse(favorites));
```

---

## Common Issues & Solutions

### Issue: Bookmark icon not updating
**Solution**: Ensure `onFavoriteChange` callback is passed and `favoritesRefreshTrigger` is incremented

### Issue: Favorites not persisting
**Solution**: Check AsyncStorage permissions and verify `FAVORITES_KEY` is correct

### Issue: Badge not showing
**Solution**: Ensure `favoriteDoctors.length > 0` before rendering badge

### Issue: Performance lag
**Solution**: Check that memoization is working and no unnecessary re-renders are happening

---

## Testing Examples

### Test Adding Favorite
```typescript
const doctor = { id: 1, name: 'Dr. John', specialization: 'Cardiology' };
await favoriteDoctorsService.addFavorite(doctor);
const isFav = await favoriteDoctorsService.isFavorite(1);
// isFav should be true
```

### Test Removing Favorite
```typescript
await favoriteDoctorsService.removeFavorite(1);
const isFav = await favoriteDoctorsService.isFavorite(1);
// isFav should be false
```

### Test Get Favorites
```typescript
const favorites = await favoriteDoctorsService.getFavorites();
// Should return array of FavoriteDoctor objects
```

---

## File Locations

- **Service**: `services/favoriteDoctorsService.ts`
- **Component**: `components/DoctorCard.tsx`
- **Dashboard**: `app/patient-dashboard.tsx`
- **Guide**: `FAVORITES_FEATURE_GUIDE.md`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`

---

**Last Updated**: November 17, 2025
