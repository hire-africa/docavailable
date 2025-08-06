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
            'all_data' => $request->all(),
            'files' => $request->allFiles(),
            'headers' => $request->headers->all()
        ]);
        
        $request->validate([
            'profile_picture' => 'required|image|max:2048', // max 2MB
        ]);
        
        $user = $request->user();
        $path = $request->file('profile_picture')->store('profile_pictures', 'public');
        
        // Update user's profile picture URL
        $user->profile_picture = Storage::disk('public')->url($path);
        $user->save();
        
        // Dispatch job to process image asynchronously
        \App\Jobs\ProcessFileUpload::dispatch($path, 'profile_picture', $user->id);
        
        // Return temporary URL immediately
        $tempUrl = Storage::disk('public')->url($path);
        
        \Log::info('Profile picture uploaded successfully:', [
            'user_id' => $user->id,
            'path' => $path,
            'url' => $tempUrl
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Profile picture uploaded successfully. Processing in background.',
            'data' => [
                'profile_picture_url' => $tempUrl
            ],
            'processing' => true
        ]);
    }

    // Upload ID document
    public function uploadIdDocument(Request $request)
    {
        $request->validate([
            'document' => 'required|file|mimes:jpg,jpeg,png,pdf|max:4096', // max 4MB
        ]);
        $user = $request->user();
        $path = $request->file('document')->store('id_documents', 'public');
        $url = Storage::disk('public')->url($path);
        // Optionally, save $url to user's id_document field
        return response()->json(['url' => $url]);
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
            
            // Get the URL
            $url = Storage::disk('public')->url($path);
            
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
        
        // Get the URL
        $url = Storage::disk('public')->url($path);
        
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
            // Validate the path to prevent directory traversal
            if (str_contains($path, '..') || !str_starts_with($path, 'chat_voice_messages/')) {
                abort(404);
            }
            
            $fullPath = Storage::disk('public')->path($path);
            
            if (!file_exists($fullPath)) {
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
} 