<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\DoctorAvailability;
use Carbon\Carbon;

class ResetAvailabilityOverrides extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'availability:reset-overrides';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset doctor availability overrides when outside current working-hours slot';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $now = Carbon::now('UTC');

        $candidates = DoctorAvailability::where(function ($q) {
            $q->where('manually_offline', true)
              ->orWhere('manually_online', true);
        })->get();

        $resetCount = 0;

        foreach ($candidates as $availability) {
            try {
                $workingHours = $availability->working_hours;
                if (!is_array($workingHours)) {
                    $decoded = json_decode((string) $availability->working_hours, true);
                    $workingHours = is_array($decoded) ? $decoded : null;
                }

                $inSlot = false;
                if (is_array($workingHours)) {
                    $dayKey = strtolower($now->format('l'));
                    $day = $workingHours[$dayKey] ?? null;
                    if (is_array($day) && !empty($day['enabled']) && !empty($day['slots']) && is_array($day['slots'])) {
                        $nowMinutes = ((int) $now->format('H')) * 60 + ((int) $now->format('i'));
                        foreach ($day['slots'] as $slot) {
                            if (!is_array($slot)) continue;
                            $start = (string) ($slot['start'] ?? '');
                            $end = (string) ($slot['end'] ?? '');
                            if ($start === '' || $end === '') continue;

                            [$sh, $sm] = array_pad(explode(':', $start), 2, '0');
                            [$eh, $em] = array_pad(explode(':', $end), 2, '0');
                            $startMinutes = ((int) $sh) * 60 + ((int) $sm);
                            $endMinutes = ((int) $eh) * 60 + ((int) $em);

                            if ($endMinutes <= $startMinutes) {
                                if ($nowMinutes >= $startMinutes || $nowMinutes < $endMinutes) {
                                    $inSlot = true;
                                    break;
                                }
                            } else {
                                if ($nowMinutes >= $startMinutes && $nowMinutes < $endMinutes) {
                                    $inSlot = true;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (!$inSlot) {
                    $availability->manually_offline = false;
                    $availability->manually_online = false;
                    $availability->save();
                    $resetCount++;
                }
            } catch (\Throwable $e) {
                \Log::warning('Failed to reset availability overrides', [
                    'doctor_id' => $availability->doctor_id,
                    'availability_id' => $availability->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Reset overrides for {$resetCount} doctor(s)");

        return Command::SUCCESS;
    }
}
