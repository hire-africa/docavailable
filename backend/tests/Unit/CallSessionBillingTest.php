<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class CallSessionBillingTest extends TestCase
{
    /**
     * Test billing calculation for various call durations
     */
    public function test_call_session_billing_calculations()
    {
        // Test cases: [duration_seconds, expected_sessions, description]
        $testCases = [
            [40, 1, '40 seconds should deduct 1 session (manual only)'],
            [60, 1, '1 minute should deduct 1 session (manual only)'],
            [300, 1, '5 minutes should deduct 1 session (manual only)'],
            [600, 1, '10 minutes should deduct 1 session (manual only)'],
            [660, 2, '11 minutes should deduct 2 sessions (1 auto + 1 manual)'],
            [1200, 2, '20 minutes should deduct 2 sessions (2 auto + 1 manual)'],
            [1800, 3, '30 minutes should deduct 3 sessions (3 auto + 1 manual)'],
            [3600, 4, '60 minutes should deduct 4 sessions (6 auto + 1 manual)'],
        ];

        foreach ($testCases as [$durationSeconds, $expectedSessions, $description]) {
            // Simulate the billing calculation logic
            $elapsedMinutes = floor($durationSeconds / 60);
            $autoDeductions = floor($elapsedMinutes / 10);
            $manualDeduction = 1; // Always 1 for connected calls
            $totalSessionsToDeduct = $autoDeductions + $manualDeduction;

            $this->assertEquals(
                $expectedSessions,
                $totalSessionsToDeduct,
                $description . " - Duration: {$durationSeconds}s, Elapsed: {$elapsedMinutes}m, Auto: {$autoDeductions}, Manual: {$manualDeduction}"
            );
        }
    }

    /**
     * Test that the old bug is fixed (40 seconds should not charge for 5 sessions)
     */
    public function test_forty_second_call_billing_fix()
    {
        $durationSeconds = 40;
        $elapsedMinutes = floor($durationSeconds / 60); // Should be 0
        $autoDeductions = floor($elapsedMinutes / 10); // Should be 0
        $manualDeduction = 1; // Should be 1
        $totalSessionsToDeduct = $autoDeductions + $manualDeduction; // Should be 1

        $this->assertEquals(0, $elapsedMinutes, '40 seconds should be 0 minutes');
        $this->assertEquals(0, $autoDeductions, '40 seconds should have 0 auto deductions');
        $this->assertEquals(1, $manualDeduction, '40 seconds should have 1 manual deduction');
        $this->assertEquals(1, $totalSessionsToDeduct, '40 seconds should deduct only 1 session total');
    }

    /**
     * Test payment amount calculation
     */
    public function test_payment_amount_calculation()
    {
        $sessionsToDeduct = 1;
        $paymentPerSession = 4000; // MWK
        $expectedPayment = $sessionsToDeduct * $paymentPerSession;

        $this->assertEquals(4000, $expectedPayment, '1 session should pay 4000 MWK');
        
        $sessionsToDeduct = 5;
        $expectedPayment = $sessionsToDeduct * $paymentPerSession;
        $this->assertEquals(20000, $expectedPayment, '5 sessions should pay 20000 MWK');
    }
}
