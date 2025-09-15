import { PaychanguPaymentRequest, paychanguService } from './paychanguService';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  paymentUrl?: string;
  status?: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  method: 'mobile' | 'bank' | 'card';
  phoneNumber?: string;
  accountNumber?: string;
  description: string;
}

export const paymentService = {
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      console.log('PaymentService: Processing payment with Paychangu:', request);
      
      // Validate required fields for Paychangu
      if (!request.phoneNumber) {
        throw new Error('Phone number is required for Paychangu payments');
      }

      // Create Paychangu payment request
      const paychanguRequest: PaychanguPaymentRequest = {
        amount: request.amount,
        currency: request.currency,
        phoneNumber: request.phoneNumber,
        description: request.description,
        reference: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        callbackUrl: `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/payments/webhook`
      };

      // Initiate payment with Paychangu
      const result = await paychanguService.initiatePayment(paychanguRequest);

      if (result.success) {
        console.log('PaymentService: Payment initiated successfully, transaction ID:', result.transactionId);
        
        return {
          success: true,
          transactionId: result.transactionId,
          paymentUrl: result.paymentUrl,
          status: result.status
        };
      } else {
        throw new Error(result.error || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('PaymentService: Payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  },

  async checkPaymentStatus(transactionId: string): Promise<PaymentResult> {
    try {
      console.log('PaymentService: Checking payment status for:', transactionId);
      
      const result = await paychanguService.checkPaymentStatus(transactionId);
      
      return {
        success: result.success,
        transactionId: result.transactionId,
        status: result.status,
        error: result.error
      };
    } catch (error) {
      console.error('PaymentService: Failed to check payment status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check payment status'
      };
    }
  },

  async refundPayment(transactionId: string): Promise<PaymentResult> {
    try {
      console.log('PaymentService: Processing refund for transaction:', transactionId);
      
      const result = await paychanguService.refundPayment(transactionId);
      
      if (result.success) {
        return {
          success: true,
          transactionId: result.transactionId,
          status: result.status
        };
      } else {
        throw new Error(result.error || 'Refund failed');
      }
    } catch (error) {
      console.error('PaymentService: Refund failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed'
      };
    }
  }
}; 