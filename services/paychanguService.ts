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
  meta?: Record<string, any>;
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
    this.secretKey = Constants.expoConfig?.extra?.paychanguSecretKey || '';
    this.environment = Constants.expoConfig?.extra?.paychanguEnvironment || 'sandbox';
    
    // PayChangu standard checkout endpoint
    this.baseUrl = 'https://api.paychangu.com/payment';
  }

  /**
   * Initialize a payment transaction
   */
  async initiatePayment(request: PaychanguPaymentRequest): Promise<PaychanguPaymentResponse> {
    try {
      console.log('PaychanguService: Initiating payment:', request);

      const payload = {
        amount: request.amount.toString(),
        currency: request.currency,
        email: request.email,
        first_name: request.firstName,
        last_name: request.lastName,
        callback_url: request.callbackUrl,
        return_url: request.returnUrl,
        tx_ref: request.reference,
        customization: {
          title: request.title || "DocAvailable Payment",
          description: request.description
        },
        meta: request.meta || {}
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          transactionId: response.data.data.data.tx_ref,
          paymentUrl: response.data.data.checkout_url,
          status: response.data.data.data.status
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