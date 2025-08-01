import apiService from './apiService';

export interface WithdrawalRequest {
  id: number;
  amount: number;
  bank_name: string;
  bank_account: string;
  account_holder_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  created_at: string;
  rejection_reason?: string;
}

interface GetDoctorRequestsParams {
  per_page?: number;
  page?: number;
}

const withdrawalRequestService = {
  async getDoctorRequests(params: GetDoctorRequestsParams = {}) {
    try {
      const response = await apiService.get('/doctor/withdrawal-requests', { params });
      return response;
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      return { success: false, message: 'Failed to fetch withdrawal requests' };
    }
  },

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-MW', {
      style: 'currency',
      currency: 'MWK'
    }).format(amount);
  },

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  },

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      case 'paid':
        return '#2196F3';
      default:
        return '#666';
    }
  },

  getStatusDisplay(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'paid':
        return 'Paid';
      default:
        return 'Unknown';
    }
  }
};

export default withdrawalRequestService; 