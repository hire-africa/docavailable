# Backend API Requirements for Private Image Storage

## Overview
This document outlines the backend changes needed to support secure, private image storage with signed URLs for the telemedicine chat feature.

## Why Private Storage?
- **Security**: Medical images contain sensitive patient data
- **Compliance**: HIPAA/GDPR require secure storage and access control
- **Privacy**: URLs expire automatically, preventing unauthorized sharing
- **Scalability**: Cloud storage handles file serving, not your backend

## Required Backend Changes

### 1. Update Image Upload Endpoint

**Endpoint**: `POST /api/upload/chat-image`

**Current Behavior**: Saves to public storage, returns direct URL

**New Behavior**: Save to private DigitalOcean Spaces, return image ID

**Request** (unchanged):
```
Content-Type: multipart/form-data

file: [image file]
appointment_id: [number]
```

**Response** (NEW format):
```json
{
  "success": true,
  "message": "Chat image uploaded successfully",
  "data": {
    "id": 123,                    // NEW: Database ID for this image
    "image_id": "123",            // NEW: String version of ID
    "file_path": "chat_images/appointment_145/1762379401_YoxmX4UUfE.jpg",  // Path in private storage
    "appointment_id": 145,
    "uploaded_by": 2,
    "created_at": "2025-11-05T21:50:01.000000Z",
    "signed_url": "https://docavailable-storage.fra1.digitaloceanspaces.com/chat_images/...[signed-url-params]"  // OPTIONAL: Initial signed URL
  }
}
```

**Laravel Implementation Example**:
```php
use Illuminate\Support\Facades\Storage;

public function uploadChatImage(Request $request)
{
    $request->validate([
        'file' => 'required|image|max:10240', // 10MB max
        'appointment_id' => 'required|integer'
    ]);

    $file = $request->file('file');
    $appointmentId = $request->appointment_id;
    
    // Generate unique filename
    $timestamp = time();
    $randomString = Str::random(10);
    $extension = $file->getClientOriginalExtension();
    $filename = "{$timestamp}_{$randomString}.{$extension}";
    
    // Store in PRIVATE Spaces bucket
    $path = "chat_images/appointment_{$appointmentId}/{$filename}";
    Storage::disk('spaces')->put($path, file_get_contents($file), 'private'); // Note: 'private' visibility
    
    // Save metadata to database
    $chatImage = ChatImage::create([
        'appointment_id' => $appointmentId,
        'file_path' => $path,
        'uploaded_by' => auth()->id(),
        'filename' => $filename,
        'size' => $file->getSize(),
        'mime_type' => $file->getMimeType(),
    ]);
    
    // Optionally generate initial signed URL (valid for 1 hour)
    $signedUrl = Storage::disk('spaces')->temporaryUrl($path, now()->addHour());
    
    return response()->json([
        'success' => true,
        'message' => 'Chat image uploaded successfully',
        'data' => [
            'id' => $chatImage->id,
            'image_id' => (string) $chatImage->id,
            'file_path' => $path,
            'appointment_id' => $appointmentId,
            'uploaded_by' => auth()->id(),
            'created_at' => $chatImage->created_at,
            'signed_url' => $signedUrl, // Optional
        ]
    ]);
}
```

### 2. Create Signed URL Endpoint (NEW)

**Endpoint**: `GET /api/chat-images/{id}/signed-url`

**Purpose**: Generate temporary signed URL for viewing an image

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://docavailable-storage.fra1.digitaloceanspaces.com/chat_images/appointment_145/1762379401_YoxmX4UUfE.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
    "expires_in": 3600,  // Seconds until URL expires
    "expires_at": "2025-11-05T22:50:01.000000Z"
  }
}
```

**Laravel Implementation**:
```php
public function getSignedUrl($id)
{
    $chatImage = ChatImage::findOrFail($id);
    
    // Check if user has permission to view this image
    $appointment = Appointment::find($chatImage->appointment_id);
    
    if (!$appointment) {
        abort(404, 'Appointment not found');
    }
    
    // Check if user is participant in this appointment
    $userId = auth()->id();
    if ($appointment->patient_id !== $userId && $appointment->doctor_id !== $userId) {
        abort(403, 'You do not have permission to view this image');
    }
    
    // Generate signed URL (valid for 1 hour)
    $expiresIn = 3600; // 1 hour
    $signedUrl = Storage::disk('spaces')->temporaryUrl(
        $chatImage->file_path,
        now()->addSeconds($expiresIn)
    );
    
    // Optional: Log access for audit trail
    ChatImageAccess::create([
        'chat_image_id' => $chatImage->id,
        'accessed_by' => $userId,
        'accessed_at' => now(),
    ]);
    
    return response()->json([
        'success' => true,
        'data' => [
            'url' => $signedUrl,
            'expires_in' => $expiresIn,
            'expires_at' => now()->addSeconds($expiresIn),
        ]
    ]);
}
```

### 3. Database Migration

**Create `chat_images` table**:
```php
Schema::create('chat_images', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('appointment_id');
    $table->string('file_path'); // Path in private storage
    $table->string('filename');
    $table->unsignedBigInteger('uploaded_by');
    $table->integer('size'); // File size in bytes
    $table->string('mime_type');
    $table->timestamps();
    
    $table->foreign('appointment_id')->references('id')->on('appointments')->onDelete('cascade');
    $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('cascade');
    
    $table->index(['appointment_id', 'created_at']);
});
```

**Optional: Create `chat_image_access` table for audit trail**:
```php
Schema::create('chat_image_access', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('chat_image_id');
    $table->unsignedBigInteger('accessed_by');
    $table->timestamp('accessed_at');
    
    $table->foreign('chat_image_id')->references('id')->on('chat_images')->onDelete('cascade');
    $table->foreign('accessed_by')->references('id')->on('users')->onDelete('cascade');
    
    $table->index(['chat_image_id', 'accessed_at']);
});
```

### 4. Configure DigitalOcean Spaces

**In `config/filesystems.php`**:
```php
'spaces' => [
    'driver' => 's3',
    'key' => env('DO_SPACES_KEY'),
    'secret' => env('DO_SPACES_SECRET'),
    'endpoint' => env('DO_SPACES_ENDPOINT'),
    'region' => env('DO_SPACES_REGION'),
    'bucket' => env('DO_SPACES_BUCKET'),
    'url' => env('DO_SPACES_URL'),
    'visibility' => 'private', // IMPORTANT: Default to private
],
```

**In `.env`**:
```
DO_SPACES_KEY=your_spaces_key
DO_SPACES_SECRET=your_spaces_secret
DO_SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com
DO_SPACES_REGION=fra1
DO_SPACES_BUCKET=docavailable-storage
DO_SPACES_URL=https://docavailable-storage.fra1.digitaloceanspaces.com
```

### 5. Routes

**In `routes/api.php`**:
```php
Route::middleware('auth:sanctum')->group(function () {
    // Upload image
    Route::post('/upload/chat-image', [ChatImageController::class, 'uploadChatImage']);
    
    // Get signed URL
    Route::get('/chat-images/{id}/signed-url', [ChatImageController::class, 'getSignedUrl']);
});
```

## Security Benefits

1. **Private Storage**: Files not publicly accessible
2. **Temporary URLs**: Signed URLs expire after 1 hour
3. **Access Control**: Backend checks user permissions before generating URL
4. **Audit Trail**: Optional logging of who accessed which images
5. **HIPAA Compliant**: Meets requirements for secure PHI storage

## Frontend Changes (Already Implemented)

✅ **signedUrlService.ts**: Fetches and caches signed URLs
✅ **imageService.ts**: Handles upload to private storage
✅ **ImageMessage.tsx**: Automatically fetches signed URLs for display
✅ **URL caching**: Reduces API calls by caching valid URLs

## Testing Checklist

- [ ] Upload image returns `image_id` in response
- [ ] Signed URL endpoint returns valid temporary URL
- [ ] Signed URLs expire after specified time
- [ ] Unauthorized users cannot access images
- [ ] Images display correctly in chat
- [ ] URLs refresh automatically when expired
- [ ] Audit trail logs access (if implemented)

## Migration Path

1. **Phase 1**: Implement new endpoints (keep old format working)
2. **Phase 2**: Test with new app version
3. **Phase 3**: Migrate existing images to private storage
4. **Phase 4**: Remove old public storage support

## Questions?

Contact frontend team if you need clarification on any requirements.
