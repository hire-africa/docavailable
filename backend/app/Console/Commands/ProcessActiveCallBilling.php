<?php

namespace App\Console\Commands;

use Agence104\LiveKit\RoomServiceClient;
use App\Models\CallSession;
use App\Services\CallBillingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessActiveCallBilling extends Command
{
    protected $signature = 'calls:process-active-call-billing {--debug : Show detailed debug output}';

    protected $description = 'Server-side authoritative auto-billing for active connected call sessions';

    public function handle()
    {
        $debug = (bool) $this->option('debug');
        $service = new CallBillingService();

        $this->info('🔄 Processing active call billing (auto deductions)...');

        $query = CallSession::whereNotNull('connected_at')
            ->whereNull('ended_at')
            ->where('status', '!=', CallSession::STATUS_ENDED);

        $processed = 0;
        $skipped = 0;
        $errorCount = 0;

        $query->chunkById(50, function ($sessions) use (&$processed, &$skipped, &$errorCount, $debug, $service) {
            foreach ($sessions as $session) {
                try {
                    $result = $service->processAutoDeduction(
                        (string) $session->appointment_id,
                        (int) $session->patient_id,
                        (string) $session->call_type
                    );

                    if (!empty($result['success'])) {
                        // If auto_deductions didn't advance, we effectively skipped it.
                        $new = (int) ($result['data']['new_deductions'] ?? 0);
                        $remaining = (int) ($result['data']['remaining_calls'] ?? 0);

                        if ($new > 0) {
                            $processed++;
                            $this->line("✅ billed session {$session->id} (new={$new})");

                            // Cut the call when the last remaining session is consumed.
                            if ($remaining === 0) {
                                $this->terminateCallDueToExhaustedSessions($session->id, 'server_billing_remaining_calls_0');
                            }
                        } else {
                            $skipped++;
                            if ($debug) {
                                $this->line("⏭️ skipped session {$session->id} (no new buckets)");
                            }
                        }
                    } else {
                        $errorCount++;
                        $this->error("❌ failed session {$session->id}: " . ($result['message'] ?? 'unknown error'));
                        Log::warning('Active call billing failed', [
                            'call_session_id' => $session->id,
                            'result' => $result,
                        ]);
                    }
                } catch (\Throwable $e) {
                    $errorCount++;
                    $this->error("❌ exception session {$session->id}: " . $e->getMessage());
                    Log::error('Active call billing exception', [
                        'call_session_id' => $session->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            }
        });

        $this->info("📊 Summary: billed={$processed}, skipped={$skipped}, errors={$errorCount}");
        return 0;
    }

    /**
     * Terminate an active LiveKit room when a call consumes the last remaining call sessions.
     * - We always mark the DB call session as ended (idempotent).
     * - LiveKit deletion is best-effort: if it fails, DB ending still prevents further billing.
     */
    private function terminateCallDueToExhaustedSessions(int $callSessionId, string $reason): void
    {
        $roomName = 'call_' . $callSessionId;
        $now = now();

        // End in DB first so we can't double-bill or allow further session usage.
        DB::transaction(function () use ($callSessionId, $reason, $now) {
            $callSession = CallSession::where('id', $callSessionId)
                ->lockForUpdate()
                ->first();

            if (!$callSession) {
                return;
            }

            if ($callSession->status === CallSession::STATUS_ENDED) {
                return;
            }

            $callSession->update([
                'status' => CallSession::STATUS_ENDED,
                'ended_at' => $now,
                'last_activity_at' => $now,
                'is_connected' => false,
                'reason' => $reason,
                // Prevent any extra +1 manual hangup billing if/when the client later calls /end
                'manual_deduction_applied' => true,
            ]);
        });

        // Best-effort LiveKit room deletion so WebRTC clients disconnect automatically.
        try {
            $roomService = new RoomServiceClient();
            $roomService->deleteRoom($roomName);
            Log::info('LiveKit room deleted due to exhausted sessions', [
                'call_session_id' => $callSessionId,
                'room_name' => $roomName,
                'reason' => $reason,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to delete LiveKit room after exhausting sessions', [
                'call_session_id' => $callSessionId,
                'room_name' => $roomName,
                'reason' => $reason,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

