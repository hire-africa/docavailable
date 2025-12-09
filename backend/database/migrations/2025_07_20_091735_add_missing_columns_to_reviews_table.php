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
        Schema::table('reviews', function (Blueprint $table) {
            $table->integer('doctor_id')->nullable()->after('user_id');
            $table->integer('patient_id')->nullable()->after('doctor_id');
            $table->string('chat_id')->nullable()->after('patient_id');
            $table->string('status')->default('pending')->after('comment');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['doctor_id', 'patient_id', 'chat_id', 'status']);
        });
    }
};
