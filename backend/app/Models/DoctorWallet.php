<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

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
        return DB::transaction(function () use ($amount, $description, $sessionType, $sessionId, $sessionTable, $metadata) {
            // Extract payment transaction ID and gateway from metadata
            $paymentTransactionId = $metadata['payment_transaction_id'] ?? null;
            $paymentGateway = $metadata['payment_gateway'] ?? null;
            
            // Remove payment fields from metadata to avoid duplication
            $cleanMetadata = $metadata;
            unset($cleanMetadata['payment_transaction_id'], $cleanMetadata['payment_gateway']);
            
            // Create transaction record
            $transaction = WalletTransaction::create([
                'doctor_id' => $this->doctor_id,
                'type' => 'credit',
                'amount' => $amount,
                'description' => $description,
                'session_type' => $sessionType,
                'session_id' => $sessionId,
                'session_table' => $sessionTable,
                'metadata' => $cleanMetadata,
                'payment_transaction_id' => $paymentTransactionId,
                'payment_gateway' => $paymentGateway,
                'payment_status' => 'completed',
            ]);

            // Update wallet balance
            $this->increment('balance', $amount);
            $this->increment('total_earned', $amount);

            return $transaction;
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