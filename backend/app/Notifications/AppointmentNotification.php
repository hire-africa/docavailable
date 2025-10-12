<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Appointment;

class AppointmentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $appointment;
    protected $type;
    protected $message;

    /**
     * Create a new notification instance.
     */
    public function __construct(Appointment $appointment, string $type, string $message = null)
    {
        $this->appointment = $appointment;
        $this->type = $type;
        $this->message = $message;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        $channels = ['database'];
        
        if ($notifiable->email_notifications_enabled) {
            $channels[] = 'mail';
        }
        
        if ($notifiable->push_notifications_enabled && $notifiable->push_token) {
            $channels[] = 'fcm';
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $subject = $this->getSubject();
        $greeting = $this->getGreeting($notifiable);
        $content = $this->getContent();

        return (new MailMessage)
            ->subject($subject)
            ->greeting($greeting)
            ->line($content)
            ->action('View Appointment', url('/appointments/' . $this->appointment->id))
            ->line('Thank you for using DocAvailable!');
    }

    /**
     * Get the FCM representation of the notification.
     */
    public function toFcm($notifiable): array
    {
        return [
            'notification' => [
                'title' => $this->getSubject(),
                'body' => $this->getContent(),
            ],
            'data' => [
                'type' => 'appointment_' . $this->type,
                'appointment_id' => $this->appointment->id,
                'notification_type' => $this->type,
                'click_action' => 'OPEN_APPOINTMENT',
            ],
        ];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => 'appointment',
            'appointment_id' => $this->appointment->id,
            'notification_type' => $this->type,
            'title' => $this->getSubject(),
            'message' => $this->getContent(),
            'data' => [
                'appointment' => [
                    'id' => $this->appointment->id,
                    'date' => $this->appointment->appointment_date,
                    'time' => $this->appointment->appointment_time,
                    'type' => $this->appointment->appointment_type,
                    'status' => $this->appointment->status,
                ],
                'doctor' => [
                    'id' => $this->appointment->doctor->id,
                    'name' => $this->appointment->doctor->first_name . ' ' . $this->appointment->doctor->last_name,
                ],
                'patient' => [
                    'id' => $this->appointment->patient->id,
                    'name' => $this->appointment->patient->first_name . ' ' . $this->appointment->patient->last_name,
                ],
            ],
        ];
    }

    /**
     * Get notification subject based on type
     */
    protected function getSubject(): string
    {
        return match ($this->type) {
            'created' => 'Appointment Booked Successfully',
            'confirmed' => 'Appointment Confirmed',
            'cancelled' => 'Appointment Cancelled',
            'reminder' => 'Appointment Reminder',
            'reschedule_proposed' => 'Appointment Reschedule Proposed',
            'reschedule_accepted' => 'Reschedule Accepted',
            'reschedule_rejected' => 'Reschedule Rejected',
            default => 'Appointment Update',
        };
    }

    /**
     * Get greeting based on user role
     */
    protected function getGreeting($notifiable): string
    {
        $name = $notifiable->first_name;
        
        if ($notifiable->isDoctor()) {
            return "Hello Dr. {$name},";
        }
        
        return "Hello {$name},";
    }

    /**
     * Get notification content based on type
     */
    protected function getContent(): string
    {
        if ($this->message) {
            return $this->message;
        }

        $appointmentDate = $this->appointment->appointment_date;
        $appointmentTime = $this->appointment->appointment_time;
        $formattedDate = date('l, F j, Y', strtotime($appointmentDate));
        $formattedTime = date('g:i A', strtotime($appointmentTime));

        return match ($this->type) {
            'created' => "Your appointment has been successfully booked for {$formattedDate} at {$formattedTime}.",
            'confirmed' => "Your appointment for {$formattedDate} at {$formattedTime} has been confirmed by your doctor.",
            'cancelled' => "Your appointment for {$formattedDate} at {$formattedTime} has been cancelled.",
            'reminder' => "Reminder: You have an appointment tomorrow ({$formattedDate}) at {$formattedTime}.",
            'reschedule_proposed' => "Your doctor has proposed a reschedule for your appointment. Please check the details and respond.",
            'reschedule_accepted' => "The patient has accepted your reschedule proposal for the appointment.",
            'reschedule_rejected' => "The patient has rejected your reschedule proposal for the appointment.",
            default => "There's an update regarding your appointment.",
        };
    }
}
