<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

echo "🧹 Clearing All Sessions and Appointments\n";
echo "=========================================\n\n";

// Function to safely truncate table
function safeTruncateTable($tableName, $description) {
    try {
        if (Schema::hasTable($tableName)) {
            $count = DB::table($tableName)->count();
            DB::table($tableName)->truncate();
            echo "✅ Cleared {$count} {$description}\n";
        } else {
            echo "⚠️  Table '{$tableName}' does not exist\n";
        }
    } catch (Exception $e) {
        echo "❌ Error clearing {$description}: {$e->getMessage()}\n";
    }
}

// Function to safely delete all records from table
function safeDeleteAllRecords($tableName, $description) {
    try {
        if (Schema::hasTable($tableName)) {
            $count = DB::table($tableName)->count();
            DB::table($tableName)->delete();
            echo "✅ Cleared {$count} {$description}\n";
        } else {
            echo "⚠️  Table '{$tableName}' does not exist\n";
        }
    } catch (Exception $e) {
        echo "❌ Error clearing {$description}: {$e->getMessage()}\n";
    }
}

echo "Step 1: Clearing Chat-Related Data\n";
echo "----------------------------------\n";

// Clear chat message reactions first (due to foreign key constraints)
safeDeleteAllRecords('chat_message_reactions', 'chat message reactions');

// Clear chat message reads
safeDeleteAllRecords('chat_message_reads', 'chat message reads');

// Clear chat messages
safeDeleteAllRecords('chat_messages', 'chat messages');

// Clear chat room participants
safeDeleteAllRecords('chat_room_participants', 'chat room participants');

// Clear chat rooms
safeDeleteAllRecords('chat_rooms', 'chat rooms');

echo "\nStep 2: Clearing Sessions\n";
echo "--------------------------\n";

// Clear text sessions
safeDeleteAllRecords('text_sessions', 'text sessions');

echo "\nStep 3: Clearing Appointments\n";
echo "------------------------------\n";

// Clear appointments
safeDeleteAllRecords('appointments', 'appointments');

echo "\nStep 4: Clearing Cache\n";
echo "----------------------\n";

// Clear all cache related to sessions and chat
try {
    // Clear text session cache keys
    $cacheKeys = Cache::get('text_session_cache_keys', []);
    foreach ($cacheKeys as $key) {
        Cache::forget($key);
    }
    Cache::forget('text_session_cache_keys');
    
    // Clear other potential cache keys
    $potentialCacheKeys = [
        'active_sessions',
        'user_sessions',
        'chat_messages',
        'chat_rooms',
        'appointments_cache',
        'session_cache'
    ];
    
    foreach ($potentialCacheKeys as $key) {
        Cache::forget($key);
    }
    
    echo "✅ Cleared session and chat cache\n";
} catch (Exception $e) {
    echo "❌ Error clearing cache: {$e->getMessage()}\n";
}

echo "\nStep 5: Verification\n";
echo "--------------------\n";

// Verify tables are empty
$tablesToCheck = [
    'text_sessions' => 'text sessions',
    'appointments' => 'appointments',
    'chat_messages' => 'chat messages',
    'chat_rooms' => 'chat rooms',
    'chat_room_participants' => 'chat room participants',
    'chat_message_reads' => 'chat message reads',
    'chat_message_reactions' => 'chat message reactions'
];

foreach ($tablesToCheck as $table => $description) {
    if (Schema::hasTable($table)) {
        $count = DB::table($table)->count();
        if ($count === 0) {
            echo "✅ {$description} table is empty\n";
        } else {
            echo "⚠️  {$description} table still has {$count} records\n";
        }
    } else {
        echo "⚠️  Table '{$table}' does not exist\n";
    }
}

echo "\n🎉 Database cleanup completed!\n";
echo "All sessions, appointments, and related chat data have been cleared.\n";
echo "You can now start fresh with new sessions and appointments.\n"; 