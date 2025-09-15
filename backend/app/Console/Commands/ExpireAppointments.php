<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Appointment;
use Carbon\Carbon;

class ExpireAppointments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:expire';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Expire appointments that are past their scheduled time';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting appointment expiration check...');

        $now = Carbon::now();
        
        // Find pending appointments that are past their scheduled time
        $expiredAppointments = Appointment::where('status', Appointment::STATUS_PENDING)
            ->where(function ($query) use ($now) {
                $query->where('appointment_date', '<', $now->format('Y-m-d'))
                    ->orWhere(function ($q) use ($now) {
                        $q->where('appointment_date', '=', $now->format('Y-m-d'))
                          ->where('appointment_time', '<', $now->format('H:i:s'));
                    });
            })
            ->get();

        $count = $expiredAppointments->count();
        
        if ($count === 0) {
            $this->info('No expired appointments found.');
            return;
        }

        $this->info("Found {$count} expired appointment(s).");

        foreach ($expiredAppointments as $appointment) {
            $appointment->update([
                'status' => Appointment::STATUS_CANCELLED,
                'cancellation_reason' => 'Automatically expired - appointment time has passed',
                'cancelled_by' => 'system'
            ]);

            $this->line("Expired appointment ID: {$appointment->id} - {$appointment->appointment_date} {$appointment->appointment_time}");
        }

        $this->info('Appointment expiration completed successfully.');
    }
} 