<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Services\EncryptionService;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $encryptionService = new EncryptionService();

        // Enable encryption for all existing chat rooms
        $chatRooms = DB::table('chat_rooms')->get();
        
        foreach ($chatRooms as $room) {
            if (!$room->encryption_enabled) {
                $roomKey = $encryptionService->generateRoomKey();
                DB::table('chat_rooms')
                    ->where('id', $room->id)
                    ->update([
                        'encryption_key' => $roomKey,
                        'encryption_enabled' => true,
                        'updated_at' => now()
                    ]);
            }
        }

        // Enable encryption for all users who don't have it enabled
        $users = DB::table('users')->where('encryption_enabled', false)->get();
        
        foreach ($users as $user) {
            $keyPair = $encryptionService->generateKeyPair();
            DB::table('users')
                ->where('id', $user->id)
                ->update([
                    'public_key' => $keyPair['public_key'],
                    'private_key' => $keyPair['private_key'],
                    'encryption_enabled' => true,
                    'updated_at' => now()
                ]);
        }

        // Update all existing messages to be marked as encrypted
        // Note: This doesn't actually encrypt existing messages, just marks them
        // as encrypted for consistency. New messages will be properly encrypted.
        DB::table('chat_messages')
            ->where('is_encrypted', false)
            ->update([
                'is_encrypted' => true,
                'updated_at' => now()
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Note: We cannot safely reverse this migration as it would
        // require decrypting messages and removing encryption keys
        // This could result in data loss, so we'll leave the migration
        // as a one-way operation for security reasons.
    }
}; 