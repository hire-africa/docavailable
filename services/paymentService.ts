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

      // Get user data from auth service
      const authService = (await import('./authService')).default;
      const user = await authService.getCurrentUser();
      
      if (!user) {
        throw new Error('User not authenticated. Please log in to continue.');
      }

      // Create Paychangu payment request with actual user data
      const paychanguRequest: PaychanguPaymentRequest = {
        amount: request.amount,
        currency: request.currency,
        email: user.email || 'user@example.com',
        firstName: user.firstName || user.display_name?.split(' ')[0] || 'User',
        lastName: user.lastName || user.display_name?.split(' ').slice(1).join(' ') || 'Name',
        description: request.description,
        reference: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        callbackUrl: 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/callback',
        returnUrl: 'https://docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/return',
        meta: {
          phoneNumber: request.phoneNumber,
          plan_id: 1, // You might want to pass this from the calling component
          user_id: user.id
        }
      };

      // Initiate payment with Paychangu
      console.log('PaymentService: Calling Paychangu service with request:', paychanguRequest);
      const result = await paychanguService.initiatePayment(paychanguRequest);
      console.log('PaymentService: Paychangu service response:', result);

      if (result.success) {
        console.log('PaymentService: Payment initiated successfully');
        console.log('PaymentService: Transaction ID:', result.transactionId);
        console.log('PaymentService: Payment URL:', result.paymentUrl);
        console.log('PaymentService: Status:', result.status);
        
        // Validate that we have the required data
        if (!result.paymentUrl) {
          throw new Error('Payment URL is missing from PayChangu response');
        }
        if (!result.transactionId) {
          throw new Error('Transaction ID is missing from PayChangu response');
        }
        
        return {
          success: true,
          transactionId: result.transactionId,
          paymentUrl: result.paymentUrl,
          status: result.status
        };
      } else {
        console.error('PaymentService: Payment initiation failed:', result.error);
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