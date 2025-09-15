<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Appointment;
use App\Models\Subscription;
use App\Models\ChatRoom;
use App\Models\ChatMessage;
use App\Models\ChatRoomParticipant;
use App\Models\DoctorWallet;
use App\Models\WalletTransaction;
use App\Models\Notification;
use App\Models\NotificationPreference;
use Carbon\Carbon;

class MigrateFirebaseData extends Command
{
    protected $signature = 'firebase:migrate-data {--dry-run : Show what would be migrated without actually doing it}';
    protected $description = 'Migrate all Firebase data to Laravel database';

    private $migratedUsers = [];
    private $migratedAppointments = [];
    private $migratedChatRooms = [];

    public function handle()
    {
        $this->info('Starting Firebase to Laravel data migration...');
        
        if ($this->option('dry-run')) {
            $this->warn('DRY RUN MODE - No data will be actually migrated');
        }

        try {
            // Initialize Firebase Admin SDK
            $this->initializeFirebase();
            
            // Migrate data in order
            $this->migrateUsers();
            $this->migrateAppointments();
            $this->migrateSubscriptions();
            $this->migrateChatData();
            $this->migrateWalletData();
            $this->migrateNotifications();
            
            $this->info('Migration completed successfully!');
            
        } catch (\Exception $e) {
            $this->error('Migration failed: ' . $e->getMessage());
            return 1;
        }
    }

    private function initializeFirebase()
    {
        // Initialize Firebase Admin SDK
        $this->info('Initializing Firebase connection...');
        
        // You'll need to set up Firebase Admin SDK credentials
        // This is just a placeholder - you'll need to configure it properly
        $this->warn('Please ensure Firebase Admin SDK is properly configured');
    }

    private function migrateUsers()
    {
        $this->info('Migrating users...');
        
        // This is a placeholder - you'll need to implement actual Firebase data fetching
        $firebaseUsers = $this->getFirebaseUsers();
        
        foreach ($firebaseUsers as $firebaseUser) {
            if ($this->option('dry-run')) {
                $this->line("Would migrate user: {$firebaseUser['email']}");
                continue;
            }

            try {
                $user = User::updateOrCreate(
                    ['firebase_uid' => $firebaseUser['uid']],
                    [
                        'email' => $firebaseUser['email'],
                        'first_name' => $firebaseUser['firstName'] ?? '',
                        'last_name' => $firebaseUser['lastName'] ?? '',
                        'display_name' => $firebaseUser['displayName'] ?? '',
                        'user_type' => $firebaseUser['userType'] ?? 'patient',
                        'date_of_birth' => $firebaseUser['dateOfBirth'] ?? null,
                        'gender' => $firebaseUser['gender'] ?? null,
                        'country' => $firebaseUser['country'] ?? null,
                        'city' => $firebaseUser['city'] ?? null,
                        'years_of_experience' => $firebaseUser['yearsOfExperience'] ?? 0,
                        'occupation' => $firebaseUser['occupation'] ?? '',
                        'bio' => $firebaseUser['bio'] ?? '',
                        'health_history' => $firebaseUser['healthHistory'] ?? '',
                        'status' => $firebaseUser['status'] ?? 'active',
                        'rating' => $firebaseUser['rating'] ?? 0,
                        'total_ratings' => $firebaseUser['totalRatings'] ?? 0,
                        'created_at' => Carbon::parse($firebaseUser['createdAt']),
                        'updated_at' => Carbon::parse($firebaseUser['updatedAt']),
                    ]
                );

                $this->migratedUsers[$firebaseUser['uid']] = $user->id;
                $this->line("Migrated user: {$user->email}");
                
            } catch (\Exception $e) {
                $this->error("Failed to migrate user {$firebaseUser['email']}: " . $e->getMessage());
            }
        }
    }

    private function migrateAppointments()
    {
        $this->info('Migrating appointments...');
        
        $firebaseAppointments = $this->getFirebaseAppointments();
        
        foreach ($firebaseAppointments as $firebaseAppointment) {
            if ($this->option('dry-run')) {
                $this->line("Would migrate appointment: {$firebaseAppointment['id']}");
                continue;
            }

            try {
                $patientId = $this->migratedUsers[$firebaseAppointment['patientId']] ?? null;
                $doctorId = $this->migratedUsers[$firebaseAppointment['doctorId']] ?? null;
                
                if (!$patientId || !$doctorId) {
                    $this->warn("Skipping appointment {$firebaseAppointment['id']} - missing user mapping");
                    continue;
                }

                $appointment = Appointment::updateOrCreate(
                    ['firebase_id' => $firebaseAppointment['id']],
                    [
                        'patient_id' => $patientId,
                        'doctor_id' => $doctorId,
                        'date' => $firebaseAppointment['date'],
                        'time' => $firebaseAppointment['time'],
                        'consultation_type' => $firebaseAppointment['consultationType'],
                        'reason' => $firebaseAppointment['reason'],
                        'status' => $firebaseAppointment['status'],
                        'notes' => $firebaseAppointment['notes'] ?? null,
                        'chat_id' => $firebaseAppointment['chatId'] ?? null,
                        'scheduled_time' => $this->parseDateTime($firebaseAppointment['date'], $firebaseAppointment['time']),
                        'patient_joined' => $firebaseAppointment['patientJoined'] ?? null,
                        'actual_start_time' => $firebaseAppointment['actualStartTime'] ?? null,
                        'actual_end_time' => $firebaseAppointment['actualEndTime'] ?? null,
                        'sessions_deducted' => $firebaseAppointment['sessionsDeducted'] ?? 0,
                        'no_show' => $firebaseAppointment['noShow'] ?? false,
                        'completed_at' => $firebaseAppointment['completedAt'] ?? null,
                        'earnings_awarded' => $firebaseAppointment['earningsAwarded'] ?? 0,
                        'created_at' => Carbon::parse($firebaseAppointment['createdAt']),
                        'updated_at' => Carbon::parse($firebaseAppointment['updatedAt']),
                    ]
                );

                $this->migratedAppointments[$firebaseAppointment['id']] = $appointment->id;
                $this->line("Migrated appointment: {$appointment->id}");
                
            } catch (\Exception $e) {
                $this->error("Failed to migrate appointment {$firebaseAppointment['id']}: " . $e->getMessage());
            }
        }
    }

    private function migrateSubscriptions()
    {
        $this->info('Migrating subscriptions...');
        
        $firebaseSubscriptions = $this->getFirebaseSubscriptions();
        
        foreach ($firebaseSubscriptions as $firebaseSubscription) {
            if ($this->option('dry-run')) {
                $this->line("Would migrate subscription for user: {$firebaseSubscription['userId']}");
                continue;
            }

            try {
                $userId = $this->migratedUsers[$firebaseSubscription['userId']] ?? null;
                
                if (!$userId) {
                    $this->warn("Skipping subscription for user {$firebaseSubscription['userId']} - user not found");
                    continue;
                }

                $subscription = Subscription::updateOrCreate(
                    ['user_id' => $userId],
                    [
                        'plan_id' => $firebaseSubscription['planId'],
                        'plan_name' => $firebaseSubscription['planName'],
                        'plan_price' => $firebaseSubscription['planPrice'],
                        'plan_currency' => $firebaseSubscription['planCurrency'],
                        'text_sessions_remaining' => $firebaseSubscription['textSessionsRemaining'],
                        'voice_calls_remaining' => $firebaseSubscription['voiceCallsRemaining'],
                        'video_calls_remaining' => $firebaseSubscription['videoCallsRemaining'],
                        'total_text_sessions' => $firebaseSubscription['totalTextSessions'],
                        'total_voice_calls' => $firebaseSubscription['totalVoiceCalls'],
                        'total_video_calls' => $firebaseSubscription['totalVideoCalls'],
                        'status' => $firebaseSubscription['isActive'] ? 1 : 0,
                        'activated_at' => Carbon::parse($firebaseSubscription['activatedAt']),
                        'expires_at' => $firebaseSubscription['expiresAt'] ? Carbon::parse($firebaseSubscription['expiresAt']) : null,
                        'is_active' => $firebaseSubscription['isActive'],
                        'created_at' => Carbon::now(),
                        'updated_at' => Carbon::now(),
                    ]
                );

                $this->line("Migrated subscription for user: {$userId}");
                
            } catch (\Exception $e) {
                $this->error("Failed to migrate subscription for user {$firebaseSubscription['userId']}: " . $e->getMessage());
            }
        }
    }

    private function migrateChatData()
    {
        $this->info('Migrating chat data...');
        
        $firebaseChats = $this->getFirebaseChats();
        
        foreach ($firebaseChats as $firebaseChat) {
            if ($this->option('dry-run')) {
                $this->line("Would migrate chat: {$firebaseChat['id']}");
                continue;
            }

            try {
                // Create chat room
                $chatRoom = ChatRoom::updateOrCreate(
                    ['firebase_id' => $firebaseChat['id']],
                    [
                        'name' => $firebaseChat['name'] ?? null,
                        'type' => $firebaseChat['type'] ?? 'private',
                        'created_by' => $this->migratedUsers[$firebaseChat['createdBy']] ?? 1,
                        'created_at' => Carbon::parse($firebaseChat['createdAt']),
                        'updated_at' => Carbon::parse($firebaseChat['updatedAt']),
                    ]
                );

                $this->migratedChatRooms[$firebaseChat['id']] = $chatRoom->id;

                // Add participants
                foreach ($firebaseChat['participants'] ?? [] as $participant) {
                    $userId = $this->migratedUsers[$participant['uid']] ?? null;
                    if ($userId) {
                        ChatRoomParticipant::updateOrCreate(
                            [
                                'chat_room_id' => $chatRoom->id,
                                'user_id' => $userId,
                            ],
                            [
                                'role' => $participant['role'] ?? 'member',
                                'joined_at' => Carbon::now(),
                            ]
                        );
                    }
                }

                // Migrate messages
                $this->migrateChatMessages($firebaseChat['id'], $chatRoom->id);

                $this->line("Migrated chat: {$chatRoom->id}");
                
            } catch (\Exception $e) {
                $this->error("Failed to migrate chat {$firebaseChat['id']}: " . $e->getMessage());
            }
        }
    }

    private function migrateChatMessages($firebaseChatId, $chatRoomId)
    {
        $firebaseMessages = $this->getFirebaseMessages($firebaseChatId);
        
        foreach ($firebaseMessages as $firebaseMessage) {
            try {
                $senderId = $this->migratedUsers[$firebaseMessage['sender']] ?? null;
                if (!$senderId) continue;

                ChatMessage::updateOrCreate(
                    ['firebase_id' => $firebaseMessage['id']],
                    [
                        'chat_room_id' => $chatRoomId,
                        'sender_id' => $senderId,
                        'content' => $firebaseMessage['text'],
                        'message_type' => 'text',
                        'created_at' => Carbon::parse($firebaseMessage['timestamp']),
                        'updated_at' => Carbon::parse($firebaseMessage['timestamp']),
                    ]
                );
            } catch (\Exception $e) {
                $this->warn("Failed to migrate message {$firebaseMessage['id']}: " . $e->getMessage());
            }
        }
    }

    private function migrateWalletData()
    {
        $this->info('Migrating wallet data...');
        
        // Create wallets for doctors
        foreach ($this->migratedUsers as $firebaseUid => $userId) {
            $user = User::find($userId);
            if ($user && $user->user_type === 'doctor') {
                try {
                    $wallet = DoctorWallet::firstOrCreate(
                        ['doctor_id' => $userId],
                        [
                            'balance' => 0,
                            'total_earnings' => 0,
                            'total_withdrawn' => 0,
                        ]
                    );
                    
                    $this->line("Created wallet for doctor: {$user->email}");
                } catch (\Exception $e) {
                    $this->error("Failed to create wallet for doctor {$user->email}: " . $e->getMessage());
                }
            }
        }
    }

    private function migrateNotifications()
    {
        $this->info('Migrating notifications...');
        
        // Create default notification preferences for all users
        foreach ($this->migratedUsers as $firebaseUid => $userId) {
            try {
                $types = ['appointment', 'text_session', 'wallet', 'custom'];
                foreach ($types as $type) {
                    NotificationPreference::firstOrCreate(
                        [
                            'user_id' => $userId,
                            'type' => $type,
                        ],
                        [
                            'email_enabled' => true,
                            'push_enabled' => true,
                            'sms_enabled' => false,
                        ]
                    );
                }
            } catch (\Exception $e) {
                $this->error("Failed to create notification preferences for user {$userId}: " . $e->getMessage());
            }
        }
    }

    // Placeholder methods for Firebase data fetching
    private function getFirebaseUsers()
    {
        // Implement Firebase data fetching
        $this->warn('Implement Firebase data fetching for users');
        return [];
    }

    private function getFirebaseAppointments()
    {
        // Implement Firebase data fetching
        $this->warn('Implement Firebase data fetching for appointments');
        return [];
    }

    private function getFirebaseSubscriptions()
    {
        // Implement Firebase data fetching
        $this->warn('Implement Firebase data fetching for subscriptions');
        return [];
    }

    private function getFirebaseChats()
    {
        // Implement Firebase data fetching
        $this->warn('Implement Firebase data fetching for chats');
        return [];
    }

    private function getFirebaseMessages($chatId)
    {
        // Implement Firebase data fetching
        $this->warn('Implement Firebase data fetching for messages');
        return [];
    }

    private function parseDateTime($date, $time)
    {
        try {
            return Carbon::createFromFormat('Y-m-d H:i A', $date . ' ' . $time);
        } catch (\Exception $e) {
            return Carbon::now();
        }
    }
} 