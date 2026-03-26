<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('doctor_availabilities', function (Blueprint $table) {
            if (!Schema::hasColumn('doctor_availabilities', 'last_active_at')) {
                $table->timestamp('last_active_at')->nullable()->after('working_hours');
            }
            if (!Schema::hasColumn('doctor_availabilities', 'manually_offline')) {
                $table->boolean('manually_offline')->default(false)->after('last_active_at');
            }
            if (!Schema::hasColumn('doctor_availabilities', 'manually_online')) {
                $table->boolean('manually_online')->default(false)->after('manually_offline');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('doctor_availabilities', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('doctor_availabilities', 'last_active_at')) {
                $columns[] = 'last_active_at';
            }
            if (Schema::hasColumn('doctor_availabilities', 'manually_offline')) {
                $columns[] = 'manually_offline';
            }
            if (Schema::hasColumn('doctor_availabilities', 'manually_online')) {
                $columns[] = 'manually_online';
            }
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
