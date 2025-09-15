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
            // Add encryption key fields
            $table->text('public_key')->nullable()->after('remember_token');
            $table->text('private_key')->nullable()->after('public_key');
            $table->boolean('encryption_enabled')->default(false)->after('private_key');
            
            // Add index for encrypted users
            $table->index('encryption_enabled');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['encryption_enabled']);
            $table->dropColumn([
                'public_key',
                'private_key',
                'encryption_enabled'
            ]);
        });
    }
}; 