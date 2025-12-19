<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class VoiceMessageArchiveService
{
    /**
     * Archive voice messages for an ended session
     * Copies voice files from temporary chat folder to permanent archive
     */
    public function archiveSessionVoiceMessages(int $sessionId): array
    {
        try {
            $sourceFolder = "chat_voice_messages/{$sessionId}";
            $archiveFolder = "archived_voice_messages/{$sessionId}";
            
            // Check if source folder exists
            if (!Storage::disk('public')->exists($sourceFolder)) {
                Log::info("No voice messages to archive", ['session_id' => $sessionId]);
                return ['archived' => 0, 'files' => []];
            }
            
            // Get all voice files in the session folder
            $voiceFiles = Storage::disk('public')->files($sourceFolder);
            $archivedFiles = [];
            
            foreach ($voiceFiles as $file) {
                $filename = basename($file);
                $archivePath = "{$archiveFolder}/{$filename}";
                
                // Copy file to archive location
                if (Storage::disk('public')->copy($file, $archivePath)) {
                    $archivedFiles[] = $archivePath;
                    Log::info("Archived voice message", [
                        'session_id' => $sessionId,
                        'original' => $file,
                        'archived' => $archivePath
                    ]);
                }
            }
            
            Log::info("Voice messages archived for session", [
                'session_id' => $sessionId,
                'count' => count($archivedFiles)
            ]);
            
            return [
                'archived' => count($archivedFiles),
                'files' => $archivedFiles
            ];
            
        } catch (\Exception $e) {
            Log::error("Failed to archive voice messages", [
                'session_id' => $sessionId,
                'error' => $e->getMessage()
            ]);
            
            return ['archived' => 0, 'files' => [], 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Get archived voice file URL
     */
    public function getArchivedVoiceUrl(int $sessionId, string $filename): string
    {
        $path = "archived_voice_messages/{$sessionId}/{$filename}";
        
        // Check if archived version exists
        if (Storage::disk('public')->exists($path)) {
            return url("/api/audio/{$path}");
        }
        
        // Fallback to original path
        $originalPath = "chat_voice_messages/{$sessionId}/{$filename}";
        return url("/api/audio/{$originalPath}");
    }
}

