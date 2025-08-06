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
        Schema::table('appointments', function (Blueprint $table) {
            $table->date('reschedule_proposed_date')->nullable();
            $table->time('reschedule_proposed_time')->nullable();
            $table->text('reschedule_reason')->nullable();
            $table->integer('reschedule_proposed_by')->nullable()->references('id')->on('users')->onDelete('cascade');
            $table->integer('reschedule_status')->default(0); // 0=pending, 1=accepted, 2=rejected
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn([
                'reschedule_proposed_date',
                'reschedule_proposed_time', 
                'reschedule_reason',
                'reschedule_proposed_by',
                'reschedule_status'
            ]);
        });
    }
};