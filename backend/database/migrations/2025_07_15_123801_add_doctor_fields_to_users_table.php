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
        Schema::table('users', function (Blueprint $table) {
            $table->string('specialization')->nullable()->after('id_document');
            $table->integer('years_of_experience')->nullable()->after('specialization');
            $table->text('professional_bio')->nullable()->after('years_of_experience');
            $table->string('national_id')->nullable()->after('professional_bio');
            $table->string('medical_degree')->nullable()->after('national_id');
            $table->string('medical_licence')->nullable()->after('medical_degree');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['specialization', 'years_of_experience', 'professional_bio', 'national_id', 'medical_degree', 'medical_licence']);
        });
    }
};
