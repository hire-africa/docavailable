<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileUploadController extends Controller
{
    // Upload profile picture
    public function uploadProfilePicture(Request $request)
    {
        // Debug logging
        \Log::info('Profile picture upload request:', [
            'has_file' => $request->hasFile('profile_picture'),
            'has_profile_picture' => $request->has('profile_picture'),
            'profile_picture_type' => gettype($request->input('profile_picture')),
            'all_data' => $request->all(),
            'files' => $request->allFiles(),
            'headers' => $request->headers->all()
        ]);
        
        $user = $request->user();
        
        // Handle base64 image upload (from React Native)
        if ($request->has('profile_picture') && is_string($request->input('profile_picture'))) {
            $base64Image = $request->input('profile_picture');
            
            // Validate base64 image
            if (strlen($base64Image) < 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid image data provided.'
                ], 422);
            }
            
            // Decode base64 image
            $image = preg_replace('/^data:image\/\w+;base64,/', '', $base64Image);
            $image = base64_decode($image);
            
            if (!$image || strlen($image) < 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to decode image data.'
                ], 422);
            }
            
            // Generate filename
            $filename = \Illuminate\Support\Str::uuid() . '.jpg';
            $path = 'profile_pictures/' . $filename;
            
            // Compress image before storing
            $compressedImage = $this->compressImage($image);
            
            // Store compressed image in DigitalOcean Spaces
            Storage::disk('spaces')->put($path, $compressedImage);
            
            // Get the public URL from DigitalOcean Spaces
            $publicUrl = Storage::disk('spaces')->url($path);
            
        } else {
            // Handle file upload (fallback)
            $request->validate([
                'profile_picture' => 'required|image|max:2048', // max 2MB
            ]);
            
            // Get file content and compress it
            $fileContent = file_get_contents($request->file('profile_picture')->getPathname());
            $compressedContent = $this->compressImage($fileContent);
            
            // Generate filename
            $filename = \Illuminate\Support\Str::uuid() . '.jpg';
            $path = 'profile_pictures/' . $filename;
            
            // Store compressed image in DigitalOcean Spaces
            Storage::disk('spaces')->put($path, $compressedContent);
            
            // Get the public URL from DigitalOcean Spaces
            $publicUrl = Storage::disk('spaces')->url($path);
        }
        
        // Store the full URL in the database
        $user->profile_picture = $publicUrl;
        $user->save();
        
        \Log::info('Profile picture uploaded to DigitalOcean Spaces:', [
            'user_id' => $user->id,
            'path' => $path ?? 'unknown',
            'public_url' => $publicUrl,
            'compression_applied' => true
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile picture uploaded successfully to DigitalOcean Spaces.',
            'data' => [
                'profile_picture_url' => $publicUrl
            ],
            'processing' => false
        ]);
    }

    /**
     * Upload profile picture (public - for registration process)
     */
    public function uploadProfilePicturePublic(Request $request)
    {
        // Debug logging
        \Log::info('Public profile picture upload request:', [
            'has_profile_picture' => $request->has('profile_picture'),
            'profile_picture_type' => gettype($request->input('profile_picture')),
            'all_data' => $request->all(),
        ]);
        
        // Handle base64 image upload (from React Native)
        if ($request->has('profile_picture') && is_string($request->input('profile_picture'))) {
            $base64Image = $request->input('profile_picture');
            
            // Validate base64 image
            if (strlen($base64Image) < 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid image data provided.'
                ], 422);
            }
            
            // Decode base64 image
            $image = preg_replace('/^data:image\/\w+;base64,/', '', $base64Image);
            $image = base64_decode($image);
            
            if (!$image || strlen($image) < 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to decode image data.'
                ], 422);
            }
            
            // Generate filename
            $filename = \Illuminate\Support\Str::uuid() . '.jpg';
            $path = 'profile_pictures/' . $filename;
            
            // Compress image before storing
            $compressedImage = $this->compressImage($image);
            
            // Store compressed image in DigitalOcean Spaces
            Storage::disk('spaces')->put($path, $compressedImage);
            
            // Get the public URL from DigitalOcean Spaces
            $publicUrl = Storage::disk('spaces')->url($path);
            
            \Log::info('Public profile picture uploaded to DigitalOcean Spaces:', [
                'path' => $path,
                'public_url' => $publicUrl,
                'compression_applied' => true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Profile picture uploaded successfully to DigitalOcean Spaces.',
                'data' => [
                    'profile_picture_url' => $publicUrl
                ],
                'processing' => false
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'No profile picture data provided.'
            ], 422);
        }
    }

    /**
     * Compress image data for faster loading
     */
    private function compressImage($imageData, $quality = 75, $maxWidth = 800, $maxHeight = 800)
    {
        try {
            // If Intervention Image is available, use it for compression
            if (class_exists('Intervention\Image\Facades\Image')) {
                $image = \Intervention\Image\Facades\Image::make($imageData);
                
                // Resize if too large
                if ($image->width() > $maxWidth || $image->height() > $maxHeight) {
                    $image->resize($maxWidth, $maxHeight, function ($constraint) {
                        $constraint->aspectRatio();
                        $constraint->upsize();
                    });
                }
                
                // Compress and return as JPEG
                return $image->encode('jpg', $quality);
            } else {
                // Fallback: basic compression using GD (if available)
                if (!function_exists('imagecreatefromstring') || !function_exists('imagejpeg')) {
                    \Log::warning('GD extension not available, returning original image data');
                    return $imageData; // Return original if GD is not available
                }
                
                $sourceImage = imagecreatefromstring($imageData);
                if (!$sourceImage) {
                    return $imageData; // Return original if GD fails
                }
                
                $width = imagesx($sourceImage);
                $height = imagesy($sourceImage);
                
                // Calculate new dimensions maintaining aspect ratio
                $ratio = min($maxWidth / $width, $maxHeight / $height);
                if ($ratio < 1) {
                    $newWidth = (int)($width * $ratio);
                    $newHeight = (int)($height * $ratio);
                } else {
                    $newWidth = $width;
                    $newHeight = $height;
                }
                
                // Create new image
                $compressedImage = imagecreatetruecolor($newWidth, $newHeight);
                
                // Preserve transparency for PNG
                imagealphablending($compressedImage, false);
                imagesavealpha($compressedImage, true);
                
                // Resize
                imagecopyresampled($compressedImage, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                
                // Output as JPEG with compression
                ob_start();
                imagejpeg($compressedImage, null, $quality);
                $compressedData = ob_get_contents();
                ob_end_clean();
                
                // Clean up
                imagedestroy($sourceImage);
                imagedestroy($compressedImage);
                
                return $compressedData;
            }
        } catch (\Exception $e) {
            \Log::warning('Image compression failed, using original: ' . $e->getMessage());
            return $imageData; // Return original if compression fails
        }
    }

    // Upload ID document
    public function uploadIdDocument(Request $request)
    {
        $user = $request->user();
        
        // Debug logging
        \Log::info('ID document upload request:', [
            'has_file' => $request->hasFile('document'),
            'has_document' => $request->has('document'),
            'document_type' => gettype($request->input('document')),
            'type' => $request->input('type'),
            'all_data' => $request->all(),
            'files' => $request->allFiles(),
            'headers' => $request->headers->all()
        ]);
        
        // Handle base64 image upload (from React Native)
        if ($request->has('document') && is_string($request->input('document'))) {
            $base64Image = $request->input('document');
            $documentType = $request->input('type', 'government_id');
            
            // Validate base64 image
            if (strlen($base64Image) < 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid document data provided.'
                ], 422);
            }
            
            // Decode base64 image
            $image = preg_replace('/^data:image\/\w+;base64,/', '', $base64Image);
            $image = base64_decode($image);
            
            if (!$image || strlen($image) < 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to decode document data.'
                ], 422);
            }
            
            // Generate filename based on document type
            $filename = $documentType . '_' . \Illuminate\Support\Str::uuid() . '.jpg';
            $path = 'id_documents/' . $filename;
            
            // Store in DigitalOcean Spaces
            Storage::disk('spaces')->put($path, $image);
            
            // Get the public URL from DigitalOcean Spaces
            $publicUrl = Storage::disk('spaces')->url($path);
            
            // Update user's document field based on type
            switch ($documentType) {
                case 'government_id':
                    $user->id_document = $publicUrl;
                    break;
                case 'address_proof':
                    $user->address_proof = $publicUrl;
                    break;
                case 'selfie':
                    $user->selfie_verification = $publicUrl;
                    break;
            }
            $user->save();
            
            \Log::info('ID document uploaded to DigitalOcean Spaces:', [
                'user_id' => $user->id,
                'type' => $documentType,
                'path' => $path,
                'public_url' => $publicUrl
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully.',
                'data' => [
                    'document_url' => $publicUrl,
                    'type' => $documentType
                ]
            ]);
        } else {
            // Handle file upload (fallback)
            $request->validate([
                'document' => 'required|file|mimes:jpg,jpeg,png,pdf|max:4096', // max 4MB
            ]);
            
            $documentType = $request->input('type', 'government_id');
            $user = $request->user();
            $path = $request->file('document')->store('id_documents', 'spaces');
            $url = Storage::disk('spaces')->url($path);
            
            // Update user's document field based on type
            switch ($documentType) {
                case 'government_id':
                    $user->id_document = $url;
                    break;
                case 'address_proof':
                    $user->address_proof = $url;
                    break;
                case 'selfie':
                    $user->selfie_verification = $url;
                    break;
            }
            $user->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully.',
                'data' => [
                    'document_url' => $url,
                    'type' => $documentType
                ]
            ]);
        }
    }

    // Upload chat image
    public function uploadChatImage(Request $request)
    {
        // Debug: Log the request data
        \Log::info('Chat image upload request:', [
            'has_file' => $request->hasFile('file'),
            'all_data' => $request->all(),
            'files' => $request->allFiles(),
            'headers' => $request->headers->all(),
            'content_type' => $request->header('Content-Type'),
        ]);
        
        try {
            $request->validate([
                'file' => 'required|file|mimes:jpg,jpeg,png,gif,webp|max:4096', // max 4MB
                'appointment_id' => 'required|integer',
            ]);
            
            $user = $request->user();
            $appointmentId = $request->input('appointment_id');
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $fileSize = $file->getSize();
            
            // Debug: Log file details
            \Log::info('Chat image file details:', [
                'original_name' => $originalName,
                'extension' => $extension,
                'size' => $fileSize,
                'mime_type' => $file->getMimeType(),
                'appointment_id' => $appointmentId,
            ]);
            
            // Create folder structure: chat_images/appointment_{id}/
            $folder = 'chat_images/appointment_' . $appointmentId;
            $filename = time() . '_' . Str::random(10) . '.' . $extension;
            $path = $file->storeAs($folder, $filename, 'public');
            
            // Get the URL - use API endpoint instead of direct storage URL
            $url = url("/api/images/{$path}");
            
            // Dispatch job to process image asynchronously
            \App\Jobs\ProcessFileUpload::dispatch($path, 'chat_image', $user->id, ['appointment_id' => $appointmentId]);
            
            \Log::info('Chat image uploaded successfully:', [
                'path' => $path,
                'url' => $url,
                'folder' => $folder,
                'appointment_id' => $appointmentId,
            ]);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'media_url' => $url,
                    'name' => $originalName,
                    'size' => $fileSize,
                    'type' => 'image',
                    'extension' => $extension
                ],
                'message' => 'Chat image uploaded successfully.'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Chat image upload error:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload chat image: ' . $e->getMessage()
            ], 422);
        }
    }

    // Upload chat attachment (general method for images and documents)
    public function uploadChatAttachment(Request $request)
    {
        // Debug: Log the request data
        \Log::info('Chat attachment upload request:', [
            'has_file' => $request->hasFile('file'),
            'all_data' => $request->all(),
            'files' => $request->allFiles(),
        ]);
        
        $request->validate([
            'file' => 'required|file|max:10240', // max 10MB for general attachments
        ]);
        
        $user = $request->user();
        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $fileSize = $file->getSize();
        
        // Debug: Log file details
        \Log::info('File details:', [
            'original_name' => $originalName,
            'extension' => $extension,
            'size' => $fileSize,
            'mime_type' => $file->getMimeType(),
        ]);
        
        // Determine file type and folder
        $isImage = in_array(strtolower($extension), ['jpg', 'jpeg', 'png', 'gif', 'webp']);
        $folder = $isImage ? 'chat_images' : 'chat_documents';
        
        // Generate unique filename
        $filename = time() . '_' . Str::random(10) . '.' . $extension;
        $path = $file->storeAs($folder, $filename, 'public');
        
        // Get the URL - use API endpoint instead of direct storage URL
        $url = url("/api/images/{$path}");
        
        // If it's an image, process it asynchronously
        if ($isImage) {
            \App\Jobs\ProcessFileUpload::dispatch($path, 'chat_image', $user->id);
        }
        
        \Log::info('File uploaded successfully:', [
            'path' => $path,
            'url' => $url,
            'folder' => $folder,
        ]);
        
        return response()->json([
            'success' => true,
            'data' => [
                'url' => $url,
                'name' => $originalName,
                'size' => $fileSize,
                'type' => $isImage ? 'image' : 'document',
                'extension' => $extension
            ],
            'message' => 'Attachment uploaded successfully.'
        ]);
    }

    // Upload voice message
    public function uploadVoiceMessage(Request $request)
    {
        // Debug: Log the request data
        \Log::info('Voice message upload request:', [
            'has_file' => $request->hasFile('file'),
            'all_data' => $request->all(),
            'files' => $request->allFiles(),
            'headers' => $request->headers->all(),
            'content_type' => $request->header('Content-Type'),
        ]);
        
        try {
            $request->validate([
                'file' => 'required|file|mimes:m4a,mp3,wav,aac,mp4|max:10240', // max 10MB for audio files, added mp4
                'appointment_id' => 'required|integer'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Voice message validation failed:', [
                'errors' => $e->errors(),
                'request_data' => $request->all(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }
        
        $user = $request->user();
        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $fileSize = $file->getSize();
        $appointmentId = $request->input('appointment_id');
        
        // Debug: Log file details
        \Log::info('Voice file details:', [
            'original_name' => $originalName,
            'extension' => $extension,
            'size' => $fileSize,
            'mime_type' => $file->getMimeType(),
            'appointment_id' => $appointmentId
        ]);
        
        try {
            // Generate unique filename for voice message
            $filename = 'voice_' . time() . '_' . Str::random(10) . '.' . $extension;
            $folder = 'chat_voice_messages/' . $appointmentId;
            $path = $file->storeAs($folder, $filename, 'public');
            
            // Get the public URL - use a custom route for better audio streaming
            $url = url("/api/audio/{$path}");
            
            \Log::info('Voice message uploaded successfully:', [
                'path' => $path,
                'url' => $url,
                'folder' => $folder,
                'appointment_id' => $appointmentId
            ]);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'url' => $url,
                    'name' => $originalName,
                    'size' => $fileSize,
                    'type' => 'voice',
                    'extension' => $extension,
                    'appointment_id' => $appointmentId
                ],
                'message' => 'Voice message uploaded successfully.'
            ]);
        } catch (\Exception $e) {
            \Log::error('Voice message upload failed:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'appointment_id' => $appointmentId
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload voice message: ' . $e->getMessage()
            ], 500);
        }
    }

    // Serve audio files with proper headers
    public function serveAudioFile($path)
    {
        try {
            // Debug: Log the requested path
            \Log::info('Audio file request:', [
                'requested_path' => $path,
                'url' => request()->url(),
                'full_url' => request()->fullUrl()
            ]);
            
            // Validate the path to prevent directory traversal
            if (str_contains($path, '..') || !str_starts_with($path, 'chat_voice_messages/')) {
                \Log::warning('Audio file path validation failed:', [
                    'path' => $path,
                    'contains_dots' => str_contains($path, '..'),
                    'starts_with_chat_voice' => str_starts_with($path, 'chat_voice_messages/')
                ]);
                abort(404);
            }
            
            $fullPath = Storage::disk('public')->path($path);
            
            \Log::info('Audio file path resolution:', [
                'requested_path' => $path,
                'full_path' => $fullPath,
                'file_exists' => file_exists($fullPath),
                'is_readable' => is_readable($fullPath),
                'storage_disk' => Storage::disk('public')->getDriver()->getAdapter()->getPathPrefix()
            ]);
            
            if (!file_exists($fullPath)) {
                \Log::error('Audio file not found:', [
                    'requested_path' => $path,
                    'full_path' => $fullPath,
                    'storage_path' => Storage::disk('public')->path(''),
                    'files_in_storage' => Storage::disk('public')->files('chat_voice_messages')
                ]);
                abort(404);
            }
            
            $extension = pathinfo($path, PATHINFO_EXTENSION);
            $mimeTypes = [
                'm4a' => 'audio/mp4',
                'mp3' => 'audio/mpeg',
                'wav' => 'audio/wav',
                'aac' => 'audio/aac',
                'ogg' => 'audio/ogg',
            ];
            
            $mimeType = $mimeTypes[strtolower($extension)] ?? 'audio/mpeg';
            $fileSize = filesize($fullPath);
            
            // Set proper headers for audio streaming
            $headers = [
                'Content-Type' => $mimeType,
                'Content-Length' => $fileSize,
                'Accept-Ranges' => 'bytes',
                'Cache-Control' => 'public, max-age=31536000',
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers' => 'Range, Accept-Ranges, Content-Range',
            ];
            
            // Handle range requests for audio streaming
            $range = request()->header('Range');
            if ($range && preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
                $start = (int) $matches[1];
                $end = !empty($matches[2]) ? (int) $matches[2] : ($fileSize - 1);
                $length = $end - $start + 1;
                
                $headers['Content-Range'] = "bytes $start-$end/$fileSize";
                $headers['Content-Length'] = $length;
                
                $handle = fopen($fullPath, 'rb');
                fseek($handle, $start);
                $content = fread($handle, $length);
                fclose($handle);
                
                return response($content, 206, $headers);
            }
            
            // Return full file
            return response()->file($fullPath, $headers);
            
        } catch (\Exception $e) {
            \Log::error('Error serving audio file:', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            abort(404);
        }
    }

    // Serve image files with proper headers
    public function serveImageFile($path)
    {
        try {
            // Validate the path to prevent directory traversal
            if (str_contains($path, '..') || !preg_match('/^(profile_pictures|profile-pictures|chat_images|documents|national_ids|medical_degrees|medical_licences|id_documents)\//', $path)) {
                abort(404);
            }
            
            $fullPath = Storage::disk('public')->path($path);
            
            if (!file_exists($fullPath)) {
                abort(404);
            }
            
            $extension = pathinfo($path, PATHINFO_EXTENSION);
            $mimeTypes = [
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
                'bmp' => 'image/bmp',
                'svg' => 'image/svg+xml',
            ];
            
            $mimeType = $mimeTypes[strtolower($extension)] ?? 'image/jpeg';
            $fileSize = filesize($fullPath);
            
            // Set proper headers for image serving
            $headers = [
                'Content-Type' => $mimeType,
                'Content-Length' => $fileSize,
                'Cache-Control' => 'public, max-age=31536000',
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
            ];
            
            // Return full file
            return response()->file($fullPath, $headers);
            
        } catch (\Exception $e) {
            \Log::error('Error serving image file:', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            abort(404);
        }
    }
} 