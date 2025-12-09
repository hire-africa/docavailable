import { ApiResponse, apiService } from './apiService';

// Wallet interfaces matching Laravel backend
export interface DoctorWallet {
  id: number;
  doctor_id: number;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  doctor_id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  session_type?: string;
  session_id?: number;
  session_table?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PaymentRate {
  text_session: number;
  audio_call: number;
  video_call: number;
  currency: string;
}

export interface WithdrawalRequest {
  amount: number;
  payment_method: 'bank_transfer' | 'mobile_money';
  payment_details: {
    account_number?: string;
    bank_name?: string;
    mobile_number?: string;
  };
}

export interface Withdrawal {
  id: number;
  doctor_id: number;
  amount: number;
  payment_method: string;
  payment_details: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EarningsSummary {
  wallet: {
    balance: number;
    total_earned: number;
    total_withdrawn: number;
  };
  earnings_by_type: any[];
  recent_transactions: WalletTransaction[];
  payment_rates: PaymentRate;
}

class WalletApiService {
  // Get doctor's wallet information
  async getWallet(): Promise<ApiResponse<DoctorWallet>> {
    return apiService.get<DoctorWallet>('/doctor/wallet');
  }

  // Get wallet transactions with pagination
  async getTransactions(page: number = 1, perPage: number = 20): Promise<ApiResponse<{
    data: WalletTransaction[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  }>> {
    return apiService.get('/doctor/wallet/transactions', { page, per_page: perPage });
  }

  // Get earnings summary
  async getEarningsSummary(): Promise<ApiResponse<EarningsSummary>> {
    return apiService.get<EarningsSummary>('/doctor/wallet/earnings-summary');
  }

  // Get payment rates
  async getPaymentRates(): Promise<ApiResponse<PaymentRate>> {
    return apiService.get<PaymentRate>('/doctor/wallet/payment-rates');
  }

  // Request withdrawal
  async requestWithdrawal(data: WithdrawalRequest): Promise<ApiResponse<Withdrawal>> {
    return apiService.post<Withdrawal>('/doctor/wallet/withdraw', data);
  }

  // Get withdrawal requests
  async getWithdrawalRequests(): Promise<ApiResponse<Withdrawal[]>> {
    return apiService.get<Withdrawal[]>('/doctor/wallet/withdrawal-requests');
  }
}

export const walletApiService = new WalletApiService(); 