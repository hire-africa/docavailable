<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Intervention\Image\Facades\Image;

class ProcessFileUpload implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 60;

    protected $filePath;
    protected $fileType;
    protected $userId;
    protected $options;

    /**
     * Create a new job instance.
     */
    public function __construct(string $filePath, string $fileType, int $userId, array $options = [])
    {
        $this->filePath = $filePath;
        $this->fileType = $fileType;
        $this->userId = $userId;
        $this->options = $options;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info("Processing file upload: {$this->filePath}");

            switch ($this->fileType) {
                case 'profile_picture':
                    $this->processProfilePicture();
                    break;
                case 'chat_image':
                    $this->processChatImage();
                    break;
                case 'id_document':
                    $this->processIdDocument();
                    break;
                default:
                    Log::warning("Unknown file type: {$this->fileType}");
            }

            Log::info("File processing completed: {$this->filePath}");
        } catch (\Exception $e) {
            Log::error("File processing failed: " . $e->getMessage(), [
                'file_path' => $this->filePath,
                'file_type' => $this->fileType,
                'user_id' => $this->userId,
                'exception' => $e
            ]);
            throw $e;
        }
    }

    /**
     * Process profile picture
     */
    protected function processProfilePicture(): void
    {
        $originalPath = $this->filePath;
        $directory = dirname($originalPath);
        $filename = basename($originalPath);
        $nameWithoutExt = pathinfo($filename, PATHINFO_FILENAME);
        $extension = pathinfo($filename, PATHINFO_EXTENSION);

        // Create different sizes
        $sizes = [
            'thumb' => [150, 150],
            'small' => [300, 300],
            'medium' => [600, 600],
            'large' => [1200, 1200]
        ];

        foreach ($sizes as $size => $dimensions) {
            $newPath = "{$directory}/{$nameWithoutExt}_{$size}.{$extension}";
            
            $this->resizeImage($originalPath, $newPath, $dimensions[0], $dimensions[1]);
            
            // Update user profile if this is the main profile picture
            if ($size === 'medium') {
                $this->updateUserProfilePicture($newPath);
            }
        }

        // Clean up original file
        Storage::disk('public')->delete($originalPath);
    }

    /**
     * Process chat image
     */
    protected function processChatImage(): void
    {
        $originalPath = $this->filePath;
        $directory = dirname($originalPath);
        $filename = basename($originalPath);
        $nameWithoutExt = pathinfo($filename, PATHINFO_FILENAME);
        $extension = pathinfo($filename, PATHINFO_EXTENSION);

        // Create optimized versions for chat
        $sizes = [
            'thumb' => [100, 100],
            'preview' => [400, 400],
            'full' => [800, 800]
        ];

        foreach ($sizes as $size => $dimensions) {
            $newPath = "{$directory}/{$nameWithoutExt}_{$size}.{$extension}";
            
            $this->resizeImage($originalPath, $newPath, $dimensions[0], $dimensions[1], 85);
        }

        // Clean up original file
        Storage::disk('public')->delete($originalPath);
    }

    /**
     * Process ID document
     */
    protected function processIdDocument(): void
    {
        $originalPath = $this->filePath;
        $extension = pathinfo($originalPath, PATHINFO_EXTENSION);

        // For PDFs, just validate and store
        if (strtolower($extension) === 'pdf') {
            $this->validatePdf($originalPath);
            return;
        }

        // For images, create optimized versions
        $directory = dirname($originalPath);
        $filename = basename($originalPath);
        $nameWithoutExt = pathinfo($filename, PATHINFO_FILENAME);

        $sizes = [
            'thumb' => [200, 200],
            'preview' => [800, 800],
            'full' => [1200, 1200]
        ];

        foreach ($sizes as $size => $dimensions) {
            $newPath = "{$directory}/{$nameWithoutExt}_{$size}.{$extension}";
            
            $this->resizeImage($originalPath, $newPath, $dimensions[0], $dimensions[1], 90);
        }

        // Clean up original file
        Storage::disk('public')->delete($originalPath);
    }

    /**
     * Resize and optimize image
     */
    protected function resizeImage(string $originalPath, string $newPath, int $width, int $height, int $quality = 80): void
    {
        try {
            $fullOriginalPath = Storage::disk('public')->path($originalPath);
            $fullNewPath = Storage::disk('public')->path($newPath);

            // Ensure directory exists
            $directory = dirname($fullNewPath);
            if (!file_exists($directory)) {
                mkdir($directory, 0755, true);
            }

            // Process image
            $image = Image::make($fullOriginalPath);
            
            // Resize maintaining aspect ratio
            $image->resize($width, $height, function ($constraint) {
                $constraint->aspectRatio();
                $constraint->upsize();
            });

            // Save with quality setting
            $image->save($fullNewPath, $quality);

            Log::info("Image resized: {$newPath} ({$width}x{$height})");
        } catch (\Exception $e) {
            Log::error("Image resize failed: " . $e->getMessage(), [
                'original_path' => $originalPath,
                'new_path' => $newPath,
                'dimensions' => "{$width}x{$height}"
            ]);
            throw $e;
        }
    }

    /**
     * Validate PDF file
     */
    protected function validatePdf(string $filePath): void
    {
        try {
            $fullPath = Storage::disk('public')->path($filePath);
            
            // Basic PDF validation
            $content = file_get_contents($fullPath);
            if (strpos($content, '%PDF') !== 0) {
                throw new \Exception('Invalid PDF file');
            }

            Log::info("PDF validated: {$filePath}");
        } catch (\Exception $e) {
            Log::error("PDF validation failed: " . $e->getMessage(), [
                'file_path' => $filePath
            ]);
            throw $e;
        }
    }

    /**
     * Update user profile picture
     */
    protected function updateUserProfilePicture(string $imagePath): void
    {
        try {
            $user = \App\Models\User::find($this->userId);
            if ($user) {
                $user->update([
                    // Store the full URL in database
                    'profile_picture' => Storage::disk('public')->url($imagePath)
                ]);
                
                Log::info("User profile picture updated: {$this->userId}");
            }
        } catch (\Exception $e) {
            Log::error("Failed to update user profile picture: " . $e->getMessage(), [
                'user_id' => $this->userId,
                'image_path' => $imagePath
            ]);
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("File upload processing job failed: " . $exception->getMessage(), [
            'file_path' => $this->filePath,
            'file_type' => $this->fileType,
            'user_id' => $this->userId,
            'exception' => $exception
        ]);

        // Clean up failed upload
        try {
            Storage::disk('public')->delete($this->filePath);
        } catch (\Exception $e) {
            Log::error("Failed to clean up file after job failure: " . $e->getMessage());
        }
    }
} 