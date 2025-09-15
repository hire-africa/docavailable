<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Appointment;
use App\Models\TextSession;
use App\Models\WalletTransaction;
use App\Models\DoctorWallet;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    /** @test */
    public function it_can_send_appointment_notification()
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create(['role' => 'doctor']);
        
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->addDay(),
            'appointment_time' => '10:00:00',
        ]);

        $notificationService = app(NotificationService::class);
        $notificationService->sendAppointmentNotification($appointment, 'created');

        Notification::assertSentTo(
            $patient,
            \App\Notifications\AppointmentNotification::class
        );

        Notification::assertSentTo(
            $doctor,
            \App\Notifications\AppointmentNotification::class
        );
    }

    /** @test */
    public function it_can_send_text_session_notification()
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create(['role' => 'doctor']);
        
        $textSession = TextSession::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'active',
        ]);

        $notificationService = app(NotificationService::class);
        $notificationService->sendTextSessionNotification($textSession, 'started');

        Notification::assertSentTo(
            $patient,
            \App\Notifications\TextSessionNotification::class
        );

        Notification::assertSentTo(
            $doctor,
            \App\Notifications\TextSessionNotification::class
        );
    }

    /** @test */
    public function it_can_send_wallet_notification()
    {
        $doctor = User::factory()->create(['role' => 'doctor']);
        $wallet = DoctorWallet::factory()->create(['doctor_id' => $doctor->id]);
        
        $transaction = WalletTransaction::factory()->create([
            'doctor_id' => $doctor->id,
            'type' => 'credit',
            'amount' => 1000.00,
            'description' => 'Text session payment',
        ]);

        $notificationService = app(NotificationService::class);
        $notificationService->sendWalletNotification($transaction, 'payment_received');

        Notification::assertSentTo(
            $doctor,
            \App\Notifications\WalletNotification::class
        );
    }

    /** @test */
    public function it_can_get_user_notifications()
    {
        $user = User::factory()->create();
        $user->notifications()->create([
            'id' => \Illuminate\Support\Str::uuid(),
            'type' => \App\Notifications\CustomNotification::class,
            'data' => [
                'type' => 'custom',
                'title' => 'Test Notification',
                'message' => 'This is a test notification',
            ],
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/notifications');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'notifications',
                    'pagination',
                    'unread_count',
                ],
            ]);
    }

    /** @test */
    public function it_can_mark_notification_as_read()
    {
        $user = User::factory()->create();
        $notification = $user->notifications()->create([
            'id' => \Illuminate\Support\Str::uuid(),
            'type' => \App\Notifications\CustomNotification::class,
            'data' => [
                'type' => 'custom',
                'title' => 'Test Notification',
                'message' => 'This is a test notification',
            ],
        ]);

        $response = $this->actingAs($user, 'api')
            ->postJson('/api/notifications/mark-read', [
                'notification_id' => $notification->id,
            ]);

        $response->assertStatus(200);
        $this->assertNotNull($notification->fresh()->read_at);
    }

    /** @test */
    public function it_can_mark_all_notifications_as_read()
    {
        $user = User::factory()->create();
        
        // Create multiple unread notifications
        for ($i = 0; $i < 3; $i++) {
            $user->notifications()->create([
                'id' => \Illuminate\Support\Str::uuid(),
                'type' => \App\Notifications\CustomNotification::class,
                'data' => [
                    'type' => 'custom',
                    'title' => "Test Notification {$i}",
                    'message' => "This is test notification {$i}",
                ],
            ]);
        }

        $response = $this->actingAs($user, 'api')
            ->postJson('/api/notifications/mark-all-read');

        $response->assertStatus(200);
        $this->assertEquals(0, $user->unreadNotifications()->count());
    }

    /** @test */
    public function it_can_delete_notification()
    {
        $user = User::factory()->create();
        $notification = $user->notifications()->create([
            'id' => \Illuminate\Support\Str::uuid(),
            'type' => \App\Notifications\CustomNotification::class,
            'data' => [
                'type' => 'custom',
                'title' => 'Test Notification',
                'message' => 'This is a test notification',
            ],
        ]);

        $response = $this->actingAs($user, 'api')
            ->deleteJson("/api/notifications/{$notification->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
    }

    /** @test */
    public function it_can_get_notification_preferences()
    {
        $user = User::factory()->create([
            'email_notifications_enabled' => true,
            'push_notifications_enabled' => true,
            'sms_notifications_enabled' => false,
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/notifications/preferences');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'email_notifications_enabled' => true,
                    'push_notifications_enabled' => true,
                    'sms_notifications_enabled' => false,
                ],
            ]);
    }

    /** @test */
    public function it_can_update_notification_preferences()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'api')
            ->patchJson('/api/notifications/preferences', [
                'email_notifications_enabled' => false,
                'push_notifications_enabled' => true,
                'sms_notifications_enabled' => true,
            ]);

        $response->assertStatus(200);
        
        $user->refresh();
        $this->assertFalse($user->email_notifications_enabled);
        $this->assertTrue($user->push_notifications_enabled);
        $this->assertTrue($user->sms_notifications_enabled);
    }

    /** @test */
    public function it_can_update_push_token()
    {
        $user = User::factory()->create();
        $pushToken = 'test_push_token_123';

        $response = $this->actingAs($user, 'api')
            ->postJson('/api/notifications/push-token', [
                'push_token' => $pushToken,
            ]);

        $response->assertStatus(200);
        
        $user->refresh();
        $this->assertEquals($pushToken, $user->push_token);
    }

    /** @test */
    public function it_can_remove_push_token()
    {
        $user = User::factory()->create(['push_token' => 'test_token']);

        $response = $this->actingAs($user, 'api')
            ->deleteJson('/api/notifications/push-token');

        $response->assertStatus(200);
        
        $user->refresh();
        $this->assertNull($user->push_token);
    }

    /** @test */
    public function it_can_get_notification_statistics()
    {
        $user = User::factory()->create();
        
        // Create some notifications
        for ($i = 0; $i < 5; $i++) {
            $user->notifications()->create([
                'id' => \Illuminate\Support\Str::uuid(),
                'type' => \App\Notifications\CustomNotification::class,
                'data' => [
                    'type' => 'custom',
                    'title' => "Test Notification {$i}",
                    'message' => "This is test notification {$i}",
                ],
                'read_at' => $i < 3 ? now() : null, // 3 read, 2 unread
            ]);
        }

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/notifications/stats');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_notifications' => 5,
                    'unread_notifications' => 2,
                    'read_notifications' => 3,
                ],
            ]);
    }

    /** @test */
    public function it_respects_notification_preferences()
    {
        $user = User::factory()->create([
            'email_notifications_enabled' => false,
            'push_notifications_enabled' => false,
        ]);

        $notification = new \App\Notifications\CustomNotification(
            'Test Title',
            'Test Message'
        );

        $channels = $notification->via($user);
        
        // Should only include database channel
        $this->assertContains('database', $channels);
        $this->assertNotContains('mail', $channels);
        $this->assertNotContains('fcm', $channels);
    }

    /** @test */
    public function it_includes_push_channel_when_enabled_and_token_exists()
    {
        $user = User::factory()->create([
            'push_notifications_enabled' => true,
            'push_token' => 'test_token',
        ]);

        $notification = new \App\Notifications\CustomNotification(
            'Test Title',
            'Test Message'
        );

        $channels = $notification->via($user);
        
        $this->assertContains('database', $channels);
        $this->assertContains('fcm', $channels);
    }
}
