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
            if (!Schema::hasColumn('users', 'specialization')) {
                $table->string('specialization')->nullable()->after('id_document');
            }
            if (!Schema::hasColumn('users', 'years_of_experience')) {
                $table->integer('years_of_experience')->nullable()->after('specialization');
            }
            if (!Schema::hasColumn('users', 'professional_bio')) {
                $table->text('professional_bio')->nullable()->after('years_of_experience');
            }
            if (!Schema::hasColumn('users', 'national_id')) {
                $table->string('national_id')->nullable()->after('professional_bio');
            }
            if (!Schema::hasColumn('users', 'medical_degree')) {
                $table->string('medical_degree')->nullable()->after('national_id');
            }
            if (!Schema::hasColumn('users', 'medical_licence')) {
                $table->string('medical_licence')->nullable()->after('medical_degree');
            }
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
