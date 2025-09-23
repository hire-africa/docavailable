<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Exception;

class DoctorWallet extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_id',
        'balance',
        'total_earned',
        'total_withdrawn'
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'total_earned' => 'decimal:2',
        'total_withdrawn' => 'decimal:2',
    ];

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function transactions()
    {
        return $this->hasMany(WalletTransaction::class, 'doctor_id', 'doctor_id');
    }

    /**
     * Credit the wallet with earnings
     */
    public function credit(float $amount, string $description, ?string $sessionType = null, ?int $sessionId = null, ?string $sessionTable = null, ?array $metadata = null): WalletTransaction
    {
        // Use a transaction to ensure atomicity
        return DB::transaction(function () use ($amount, $description, $sessionType, $sessionId, $sessionTable, $metadata) {

        // Extract payment transaction ID and gateway from metadata
        $paymentTransactionId = $metadata['payment_transaction_id'] ?? null;
        $paymentGateway = $metadata['payment_gateway'] ?? null;
        
        // Remove payment fields from metadata to avoid duplication
        $cleanMetadata = $metadata;
        unset($cleanMetadata['payment_transaction_id'], $cleanMetadata['payment_gateway']);
        
        // Create transaction record using raw SQL
        $transactionId = DB::select("
            INSERT INTO wallet_transactions (doctor_id, type, amount, description, session_type, session_id, session_table, metadata, payment_transaction_id, payment_gateway, payment_status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
            RETURNING id
        ", [
            $this->doctor_id,
            'credit',
            $amount,
            $description,
            $sessionType,
            $sessionId,
            $sessionTable,
            json_encode($cleanMetadata),
            $paymentTransactionId,
            $paymentGateway,
            'completed',
            now(),
            now()
        ])[0]->id;

        // Update wallet balance using raw SQL
        DB::update("
            UPDATE doctor_wallets 
            SET balance = balance + ?, total_earned = total_earned + ?, updated_at = ? 
            WHERE id = ?
        ", [$amount, $amount, now(), $this->id]);

            // Refresh the model
            $this->refresh();

            // Return the transaction
            return WalletTransaction::find($transactionId);
        });
    }

    /**
     * Debit the wallet for withdrawals
     */
    public function debit(float $amount, string $description, ?array $metadata = null): WalletTransaction
    {
        if ($this->balance < $amount) {
            throw new \Exception('Insufficient balance');
        }

        return DB::transaction(function () use ($amount, $description, $metadata) {
            // Create transaction record
            $transaction = WalletTransaction::create([
                'doctor_id' => $this->doctor_id,
                'type' => 'debit',
                'amount' => $amount,
                'description' => $description,
                'metadata' => $metadata,
            ]);

            // Update wallet balance
            $this->decrement('balance', $amount);
            $this->increment('total_withdrawn', $amount);

            return $transaction;
        });
    }

    /**
     * Get or create wallet for a doctor
     */
    public static function getOrCreate(int $doctorId): self
    {
        return static::firstOrCreate(
            ['doctor_id' => $doctorId],
            [
                'balance' => 0.00,
                'total_earned' => 0.00,
                'total_withdrawn' => 0.00,
            ]
        );
    }

    /**
     * Get recent transactions
     */
    public function getRecentTransactions(int $limit = 10)
    {
        return $this->transactions()
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get earnings by session type
     */
    public function getEarningsByType()
    {
        return $this->transactions()
            ->where('type', 'credit')
            ->select('session_type', DB::raw('SUM(amount) as total_amount'))
            ->groupBy('session_type')
            ->get();
    }
} 