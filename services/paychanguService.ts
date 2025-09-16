import axios from 'axios';
import Constants from 'expo-constants';

export interface PaychanguPaymentRequest {
  amount: number;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  description: string;
  reference: string;
  callbackUrl: string;
  returnUrl: string;
  title?: string;
  meta?: {
    phoneNumber?: string;
    plan_id?: number;
    user_id?: number;
    transaction_id?: number;
  };
}

export interface PaychanguPaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
  status?: string;
}

export interface PaychanguWebhookData {
  transaction_id: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  phone_number: string;
  payment_method: string;
  timestamp: string;
}

class PaychanguService {
  private apiKey: string;
  private secretKey: string;
  private merchantId: string;
  private environment: string;
  private baseUrl: string;

  constructor() {
    // Frontend should not handle PayChangu API directly
    // All PayChangu operations should go through the backend
    this.secretKey = '';
    this.environment = 'production';
    this.baseUrl = '';
  }

  /**
   * Initialize a payment transaction through backend API
   */
  async initiatePayment(request: PaychanguPaymentRequest): Promise<PaychanguPaymentResponse> {
    try {
      console.log('PaychanguService: Initiating payment through backend:', request);

      // Get the backend URL from environment
      const backendUrl = Constants.expoConfig?.extra?.apiBaseUrl || 'https://docavailable-3vbdv.ondigitalocean.app';
      
      // Call backend API to initiate PayChangu payment
      const response = await axios.post(`${backendUrl}/api/payments/paychangu/initiate`, {
        plan_id: request.meta?.plan_id || 1, // Default to plan 1 if not specified
        amount: request.amount,
        currency: request.currency,
        email: request.email,
        first_name: request.firstName,
        last_name: request.lastName,
        phone: request.meta?.phoneNumber || '+265000000000'
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          // Add authentication token if available
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (response.data.success) {
        console.log('PaychanguService: Backend response data:', response.data);
        return {
          success: true,
          transactionId: response.data.data.reference,
          paymentUrl: response.data.data.checkout_url,
          status: 'pending'
        };
      } else {
        console.error('PaychanguService: Backend returned error:', response.data);
        return {
          success: false,
          error: response.data.message || 'Payment initiation failed'
        };
      }
    } catch (error) {
      console.error('PaychanguService: Payment initiation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment initiation failed'
      };
    }
  }

  /**
   * Get authentication token from auth service
   */
  private async getAuthToken(): Promise<string> {
    try {
      // Import authService to get the stored token
      const authService = (await import('./authService')).default;
      const token = await authService.getStoredToken();
      console.log('PaychanguService: Retrieved auth token:', token ? 'Present' : 'Missing');
      return token || '';
    } catch (error) {
      console.error('PaychanguService: Error getting auth token:', error);
      return '';
    }
  }

  /**
   * Check payment status through backend API
   */
  async checkPaymentStatus(transactionId: string): Promise<PaychanguPaymentResponse> {
    try {
      console.log('PaychanguService: Checking payment status for:', transactionId);

      const backendUrl = Constants.expoConfig?.extra?.apiBaseUrl || 'https://docavailable-3vbdv.ondigitalocean.app';
      
      const response = await axios.get(`${backendUrl}/api/payments/status?transaction_id=${encodeURIComponent(transactionId)}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (response.data.success) {
        return {
          success: true,
          transactionId: response.data.data.tx_ref || transactionId,
          status: response.data.data.status
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Failed to check payment status'
        };
      }
    } catch (error) {
      console.error('PaychanguService: Failed to check payment status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check payment status'
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const webhookSecret = Constants.expoConfig?.extra?.paychanguWebhookSecret || '';
      
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('PaychanguService: Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Process webhook data
   */
  processWebhook(webhookData: PaychanguWebhookData): boolean {
    try {
      console.log('PaychanguService: Processing webhook:', webhookData);

      // Here you would typically:
      // 1. Update the payment status in your database
      // 2. Send notifications to the user
      // 3. Update subscription status
      // 4. Trigger any post-payment actions

      return webhookData.status === 'success';
    } catch (error) {
      console.error('PaychanguService: Webhook processing failed:', error);
      return false;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(transactionId: string, amount?: number): Promise<PaychanguPaymentResponse> {
    try {
      console.log('PaychanguService: Processing refund for:', transactionId);

      const payload = {
        transaction_id: transactionId,
        amount: amount, // If not provided, refunds full amount
        merchant_id: this.merchantId
      };

      const response = await axios.post(`${this.baseUrl}/payments/refund`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          success: true,
          transactionId: response.data.refund_id,
          status: 'refunded'
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Refund failed'
        };
      }
    } catch (error) {
      console.error('PaychanguService: Refund failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed'
      };
    }
  }
}

export const paychanguService = new PaychanguService(); 