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
        Schema::table('users', function (Blueprint $table) {
            // Add missing columns
            $table->string('display_name')->nullable()->after('last_name');
            $table->string('user_type')->default('patient')->after('display_name');
            $table->string('status')->default('active')->after('user_type');
            
            // Add other commonly used columns
            $table->date('date_of_birth')->nullable()->after('status');
            $table->enum('gender', ['male', 'female', 'other'])->nullable()->after('date_of_birth');
            $table->string('country')->nullable()->after('gender');
            $table->string('city')->nullable()->after('country');
            $table->integer('years_of_experience')->nullable()->after('city');
            $table->text('bio')->nullable()->after('years_of_experience');
            $table->string('specialization')->nullable()->after('bio');
            $table->string('sub_specialization')->nullable()->after('specialization');
            $table->json('specializations')->nullable()->after('sub_specialization');
            $table->json('languages_spoken')->nullable()->after('specializations');
            $table->string('profile_picture')->nullable()->after('languages_spoken');
            $table->string('national_id')->nullable()->after('profile_picture');
            $table->string('medical_degree')->nullable()->after('national_id');
            $table->string('medical_licence')->nullable()->after('medical_degree');
            $table->text('health_history')->nullable()->after('medical_licence');
            $table->string('occupation')->nullable()->after('health_history');
            $table->decimal('rating', 3, 2)->default(0)->after('occupation');
            $table->integer('total_ratings')->default(0)->after('rating');
            $table->string('google_id')->nullable()->after('total_ratings');
            $table->boolean('is_online_for_instant_sessions')->default(false)->after('google_id');
            $table->timestamp('last_online_at')->nullable()->after('is_online_for_instant_sessions');
            $table->text('public_key')->nullable()->after('last_online_at');
            $table->text('private_key')->nullable()->after('public_key');
            $table->boolean('encryption_enabled')->default(false)->after('private_key');
            $table->json('notification_preferences')->nullable()->after('encryption_enabled');
            $table->json('privacy_preferences')->nullable()->after('notification_preferences');
            $table->boolean('email_notifications_enabled')->default(true)->after('privacy_preferences');
            $table->boolean('push_notifications_enabled')->default(true)->after('email_notifications_enabled');
            $table->boolean('sms_notifications_enabled')->default(false)->after('push_notifications_enabled');
        });
        
        // Update existing records to set display_name and user_type
        DB::table('users')->whereNull('display_name')->update([
            'display_name' => DB::raw("CONCAT(first_name, ' ', last_name)"),
            'user_type' => DB::raw("CASE WHEN role = 'patient' THEN 'patient' WHEN role = 'doctor' THEN 'doctor' WHEN role = 'admin' THEN 'admin' ELSE 'patient' END"),
            'status' => 'active'
        ]);
        
        // Drop the old role column
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('patient')->after('last_name');
        });
        
        DB::table('users')->update([
            'role' => DB::raw('user_type')
        ]);
        
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'display_name', 'user_type', 'status', 'date_of_birth', 'gender', 'country', 'city',
                'years_of_experience', 'bio', 'specialization', 'sub_specialization', 'specializations',
                'languages_spoken', 'profile_picture', 'national_id', 'medical_degree', 'medical_licence',
                'health_history', 'occupation', 'rating', 'total_ratings', 'google_id',
                'is_online_for_instant_sessions', 'last_online_at', 'public_key', 'private_key',
                'encryption_enabled', 'notification_preferences', 'privacy_preferences',
                'email_notifications_enabled', 'push_notifications_enabled', 'sms_notifications_enabled'
            ]);
        });
    }
};
