<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Copy data from old columns to new columns
        DB::statement('UPDATE users SET user_type = role WHERE role IS NOT NULL AND user_type IS NULL');
        DB::statement('UPDATE users SET bio = professional_bio WHERE professional_bio IS NOT NULL AND bio IS NULL');
        DB::statement('UPDATE users SET display_name = first_name || " " || last_name WHERE display_name IS NULL');

        // Drop old columns
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'professional_bio']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate old columns
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'doctor', 'patient'])->default('patient')->after('password');
            $table->text('professional_bio')->nullable()->after('years_of_experience');
        });

        // Copy data back
        DB::statement('UPDATE users SET role = user_type WHERE user_type IS NOT NULL');
        DB::statement('UPDATE users SET professional_bio = bio WHERE bio IS NOT NULL');
    }
}; 