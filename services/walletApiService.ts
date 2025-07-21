import { ApiResponse, apiService } from '../app/services/apiService';

// Wallet interfaces matching Laravel backend
export interface DoctorWallet {
  id: number;
  doctor_id: number;
  balance: number;
  total_earnings: number;
  total_withdrawn: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_type?: string;
  reference_id?: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface PaymentRate {
  id: number;
  consultation_type: 'text' | 'voice' | 'video';
  rate: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  amount: number;
  payment_method: 'bank_transfer' | 'paypal' | 'stripe';
  payment_details: {
    account_number?: string;
    bank_name?: string;
    paypal_email?: string;
    stripe_account_id?: string;
  };
}

export interface Withdrawal {
  id: number;
  wallet_id: number;
  amount: number;
  payment_method: string;
  payment_details: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EarningsSummary {
  total_earnings: number;
  this_month: number;
  this_week: number;
  today: number;
  pending_withdrawals: number;
  available_balance: number;
}

class WalletApiService {
  // Get doctor's wallet information
  async getWallet(): Promise<ApiResponse<DoctorWallet>> {
    return apiService.get<DoctorWallet>('/doctor/wallet');
  }

  // Get wallet transactions with pagination
  async getTransactions(page: number = 1, perPage: number = 20): Promise<ApiResponse<{
    transactions: WalletTransaction[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>> {
    return apiService.get('/doctor/wallet/transactions', { page, per_page: perPage });
  }

  // Get earnings summary
  async getEarningsSummary(): Promise<ApiResponse<EarningsSummary>> {
    return apiService.get<EarningsSummary>('/doctor/wallet/earnings');
  }

  // Get payment rates
  async getPaymentRates(): Promise<ApiResponse<PaymentRate[]>> {
    return apiService.get<PaymentRate[]>('/doctor/wallet/rates');
  }

  // Update payment rate
  async updatePaymentRate(consultationType: 'text' | 'voice' | 'video', rate: number): Promise<ApiResponse<PaymentRate>> {
    return apiService.patch<PaymentRate>(`/doctor/wallet/rates/${consultationType}`, { rate });
  }

  // Request withdrawal
  async requestWithdrawal(data: WithdrawalRequest): Promise<ApiResponse<Withdrawal>> {
    return apiService.post<Withdrawal>('/doctor/wallet/withdrawals', data);
  }

  // Get withdrawal history
  async getWithdrawals(page: number = 1): Promise<ApiResponse<{
    withdrawals: Withdrawal[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>> {
    return apiService.get('/doctor/wallet/withdrawals', { page });
  }

  // Get specific withdrawal
  async getWithdrawal(withdrawalId: number): Promise<ApiResponse<Withdrawal>> {
    return apiService.get<Withdrawal>(`/doctor/wallet/withdrawals/${withdrawalId}`);
  }

  // Cancel pending withdrawal
  async cancelWithdrawal(withdrawalId: number): Promise<ApiResponse<void>> {
    return apiService.delete(`/doctor/wallet/withdrawals/${withdrawalId}`);
  }

  // Get transaction by ID
  async getTransaction(transactionId: number): Promise<ApiResponse<WalletTransaction>> {
    return apiService.get<WalletTransaction>(`/doctor/wallet/transactions/${transactionId}`);
  }

  // Get transactions by date range
  async getTransactionsByDateRange(startDate: string, endDate: string, page: number = 1): Promise<ApiResponse<{
    transactions: WalletTransaction[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>> {
    return apiService.get('/doctor/wallet/transactions', {
      start_date: startDate,
      end_date: endDate,
      page
    });
  }

  // Get transactions by type
  async getTransactionsByType(type: 'credit' | 'debit', page: number = 1): Promise<ApiResponse<{
    transactions: WalletTransaction[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>> {
    return apiService.get('/doctor/wallet/transactions', { type, page });
  }
}

export const walletApiService = new WalletApiService(); 