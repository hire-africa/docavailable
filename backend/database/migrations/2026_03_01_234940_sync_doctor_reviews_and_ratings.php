<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Force all existing reviews to 'approved' status if they are 'pending'
        DB::table('reviews')->where('status', 'pending')->update(['status' => 'approved']);

        // 2. Ensure doctor_id and patient_id are populated from user_id and reviewer_id if null
        DB::table('reviews')->whereNull('doctor_id')->whereNotNull('user_id')->update([
            'doctor_id' => DB::raw('user_id')
        ]);

        DB::table('reviews')->whereNull('patient_id')->whereNotNull('reviewer_id')->update([
            'patient_id' => DB::raw('reviewer_id')
        ]);

        // 3. Recalculate average rating and total ratings for all doctors
        $doctorIds = DB::table('reviews')
            ->where('status', 'approved')
            ->whereNotNull('doctor_id')
            ->distinct()
            ->pluck('doctor_id');

        foreach ($doctorIds as $doctorId) {
            $stats = DB::table('reviews')
                ->where('doctor_id', $doctorId)
                ->where('status', 'approved')
                ->select(
                    DB::raw('COUNT(*) as total_count'),
                    DB::raw('AVG(rating) as average_rating')
                )
                ->first();

            if ($stats && $stats->total_count > 0) {
                DB::table('users')
                    ->where('id', $doctorId)
                    ->update([
                        'rating' => round($stats->average_rating, 1),
                        'total_ratings' => $stats->total_count
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No easy way to reverse this without losing data about what was previously 'pending'
    }
};
