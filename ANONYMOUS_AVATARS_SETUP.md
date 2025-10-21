# Anonymous Mode Avatar Setup

## Overview

The anonymous mode now uses gender-specific default avatars instead of generic anonymous identifiers. When anonymous mode is enabled, patients will be displayed as "Patient" with either a male or female avatar based on their gender.

## Avatar Images Required

You need to create the following default avatar images in your backend:

### File Structure
```
backend/public/images/default-avatars/
├── male.jpg
└── female.jpg
```

### Image Specifications
- **Format**: JPG
- **Size**: 200x200 pixels (or higher resolution for better quality)
- **Style**: Professional, neutral medical avatars
- **Background**: Solid color or transparent

## Implementation Details

### Backend (Laravel)
- Images are served from `/images/default-avatars/` directory
- Full URLs are generated using `config('app.url')`
- Gender detection from user's `gender` field
- Fallback to male avatar for unknown/other genders

### Frontend (React Native)
- Uses `process.env.EXPO_PUBLIC_API_URL` for base URL
- Fallback to default icon if image fails to load
- Displays "Patient" as the name instead of anonymous identifiers

## Gender Mapping

| User Gender | Display Name | Avatar Image |
|-------------|--------------|--------------|
| `male` | "Patient" | `male.jpg` |
| `female` | "Patient" | `female.jpg` |
| `other` | "Patient" | `male.jpg` (fallback) |
| `unknown` | "Patient" | `male.jpg` (fallback) |

## Testing

1. **Enable Anonymous Mode**
   - Patient toggles anonymous consultations ON
   - Warning modal appears with confirmation

2. **Check Display**
   - Doctor sees "Patient" instead of real name
   - Gender-appropriate avatar is displayed
   - Profile picture URLs point to default avatars

3. **Verify Fallback**
   - Unknown gender shows male avatar
   - Failed image loads show default icon

## Benefits

- **More Natural**: "Patient" is more user-friendly than "Patient-A1B2C3D4"
- **Gender-Appropriate**: Visual cues help doctors understand patient demographics
- **Consistent**: Same gender always shows same avatar
- **Professional**: Clean, medical-appropriate default images
- **Privacy-Preserving**: No personal information is revealed

## File Upload

To add the avatar images to your Laravel backend:

1. Create the directory: `backend/public/images/default-avatars/`
2. Upload `male.jpg` and `female.jpg` to this directory
3. Ensure proper file permissions (644)
4. Test that images are accessible via URL

The anonymous mode will automatically use these images when displaying anonymized patient information.
