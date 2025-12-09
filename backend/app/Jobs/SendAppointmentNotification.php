<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Appointment;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendAppointmentNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 30;

    protected $appointment;
    protected $notificationType;

    /**
     * Create a new job instance.
     */
    public function __construct(Appointment $appointment, string $notificationType)
    {
        $this->appointment = $appointment;
        $this->notificationType = $notificationType;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $appointment = $this->appointment->load(['patient', 'doctor']);
            
            switch ($this->notificationType) {
                case 'appointment_created':
                    $this->sendAppointmentCreatedNotification($appointment);
                    break;
                case 'appointment_confirmed':
                    $this->sendAppointmentConfirmedNotification($appointment);
                    break;
                case 'appointment_cancelled':
                    $this->sendAppointmentCancelledNotification($appointment);
                    break;
                case 'appointment_reminder':
                    $this->sendAppointmentReminderNotification($appointment);
                    break;
                case 'reschedule_proposed':
                    $this->sendRescheduleProposedNotification($appointment);
                    break;
                case 'reschedule_accepted':
                    $this->sendRescheduleAcceptedNotification($appointment);
                    break;
                case 'reschedule_rejected':
                    $this->sendRescheduleRejectedNotification($appointment);
                    break;
                default:
                    Log::warning("Unknown notification type: {$this->notificationType}");
            }
        } catch (\Exception $e) {
            Log::error("Failed to send appointment notification: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send appointment created notification
     */
    protected function sendAppointmentCreatedNotification(Appointment $appointment): void
    {
        // Send email to patient
        if ($appointment->patient->email) {
            Mail::send('emails.appointment.created', [
                'appointment' => $appointment,
                'patient' => $appointment->patient,
                'doctor' => $appointment->doctor
            ], function ($message) use ($appointment) {
                $message->to($appointment->patient->email)
                    ->subject('Appointment Booked Successfully');
            });
        }

        // Send email to doctor
        if ($appointment->doctor->email) {
            Mail::send('emails.appointment.new_booking', [
                'appointment' => $appointment,
                'patient' => $appointment->patient,
                'doctor' => $appointment->doctor
            ], function ($message) use ($appointment) {
                $message->to($appointment->doctor->email)
                    ->subject('New Appointment Booking');
            });
        }

        // Send push notification if push token exists
        $this->sendPushNotification($appointment->patient, 'Appointment booked successfully');
        $this->sendPushNotification($appointment->doctor, 'New appointment booking received');
    }

    /**
     * Send appointment confirmed notification
     */
    protected function sendAppointmentConfirmedNotification(Appointment $appointment): void
    {
        if ($appointment->patient->email) {
            Mail::send('emails.appointment.confirmed', [
                'appointment' => $appointment,
                'patient' => $appointment->patient,
                'doctor' => $appointment->doctor
            ], function ($message) use ($appointment) {
                $message->to($appointment->patient->email)
                    ->subject('Appointment Confirmed');
            });
        }

        $this->sendPushNotification($appointment->patient, 'Your appointment has been confirmed');
    }

    /**
     * Send appointment cancelled notification
     */
    protected function sendAppointmentCancelledNotification(Appointment $appointment): void
    {
        if ($appointment->patient->email) {
            Mail::send('emails.appointment.cancelled', [
                'appointment' => $appointment,
                'patient' => $appointment->patient,
                'doctor' => $appointment->doctor
            ], function ($message) use ($appointment) {
                $message->to($appointment->patient->email)
                    ->subject('Appointment Cancelled');
            });
        }

        if ($appointment->doctor->email) {
            Mail::send('emails.appointment.cancelled_doctor', [
                'appointment' => $appointment,
                'patient' => $appointment->patient,
                'doctor' => $appointment->doctor
            ], function ($message) use ($appointment) {
                $message->to($appointment->doctor->email)
                    ->subject('Appointment Cancelled');
            });
        }

        $this->sendPushNotification($appointment->patient, 'Your appointment has been cancelled');
        $this->sendPushNotification($appointment->doctor, 'An appointment has been cancelled');
    }

    /**
     * Send appointment reminder notification
     */
    protected function sendAppointmentReminderNotification(Appointment $appointment): void
    {
        if ($appointment->patient->email) {
            Mail::send('emails.appointment.reminder', [
                'appointment' => $appointment,
                'patient' => $appointment->patient,
                'doctor' => $appointment->doctor
            ], function ($message) use ($appointment) {
                $message->to($appointment->patient->email)
                    ->subject('Appointment Reminder');
            });
        }

        $this->sendPushNotification($appointment->patient, 'Appointment reminder: You have an appointment tomorrow');
    }

    /**
     * Send reschedule proposed notification
     */
    protected function sendRescheduleProposedNotification(Appointment $appointment): void
    {
        if ($appointment->patient->email) {
            Mail::send('emails.appointment.reschedule_proposed', [
                'appointment' => $appointment,
                'patient' => $appointment->patient,
                'doctor' => $appointment->doctor
            ], function ($message) use ($appointment) {
                $message->to($appointment->patient->email)
                    ->subject('Appointment Reschedule Proposed');
            });
        }

        $this->sendPushNotification($appointment->patient, 'Your doctor has proposed a reschedule for your appointment');
    }

    /**
     * Send reschedule accepted notification
     */
    protected function sendRescheduleAcceptedNotification(Appointment $appointment): void
    {
        if ($appointment->doctor->email) {
            Mail::send('emails.appointment.reschedule_accepted', [
                'appointment' => $appointment,
                'patient' => $appointment->patient,
                'doctor' => $appointment->doctor
            ], function ($message) use ($appointment) {
                $message->to($appointment->doctor->email)
                    ->subject('Reschedule Accepted');
            });
        }

        $this->sendPushNotification($appointment->doctor, 'Patient has accepted the reschedule proposal');
    }

    /**
     * Send reschedule rejected notification
     */
    protected function sendRescheduleRejectedNotification(Appointment $appointment): void
    {
        if ($appointment->doctor->email) {
            Mail::send('emails.appointment.reschedule_rejected', [
                'appointment' => $appointment,
                'patient' => $appointment->patient,
                'doctor' => $appointment->doctor
            ], function ($message) use ($appointment) {
                $message->to($appointment->doctor->email)
                    ->subject('Reschedule Rejected');
            });
        }

        $this->sendPushNotification($appointment->doctor, 'Patient has rejected the reschedule proposal');
    }

    /**
     * Send push notification
     */
    protected function sendPushNotification(User $user, string $message): void
    {
        if ($user->push_token) {
            // Implement push notification logic here
            // This could use Firebase Cloud Messaging or another service
            Log::info("Push notification sent to user {$user->id}: {$message}");
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("Appointment notification job failed: " . $exception->getMessage(), [
            'appointment_id' => $this->appointment->id,
            'notification_type' => $this->notificationType,
            'exception' => $exception
        ]);
    }
} 