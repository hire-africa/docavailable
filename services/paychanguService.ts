import axios from 'axios';
import Constants from 'expo-constants';

export interface PaychanguPaymentRequest {
  amount: number;
  currency: string;
  phoneNumber: string;
  description: string;
  reference: string;
  callbackUrl?: string;
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
    this.apiKey = Constants.expoConfig?.extra?.paychanguApiKey || '';
    this.secretKey = Constants.expoConfig?.extra?.paychanguSecretKey || '';
    this.merchantId = Constants.expoConfig?.extra?.paychanguMerchantId || '';
    this.environment = Constants.expoConfig?.extra?.paychanguEnvironment || 'sandbox';
    
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.paychangu.com/v1'
      : 'https://sandbox-api.paychangu.com/v1';
  }

  /**
   * Initialize a payment transaction
   */
  async initiatePayment(request: PaychanguPaymentRequest): Promise<PaychanguPaymentResponse> {
    try {
      console.log('PaychanguService: Initiating payment:', request);

      const payload = {
        amount: request.amount,
        currency: request.currency,
        phone_number: request.phoneNumber,
        description: request.description,
        reference: request.reference,
        callback_url: request.callbackUrl,
        merchant_id: this.merchantId
      };

      const response = await axios.post(`${this.baseUrl}/payments/initiate`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          success: true,
          transactionId: response.data.transaction_id,
          paymentUrl: response.data.payment_url,
          status: response.data.status
        };
      } else {
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
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<PaychanguPaymentResponse> {
    try {
      console.log('PaychanguService: Checking payment status for:', transactionId);

      const response = await axios.get(`${this.baseUrl}/payments/${transactionId}/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          success: true,
          transactionId: response.data.transaction_id,
          status: response.data.status
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