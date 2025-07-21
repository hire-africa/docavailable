export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
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
      console.log('PaymentService: Processing payment:', request);
      
      // TODO: Integrate with actual payment gateway
      // For now, simulate payment processing
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success (90% success rate)
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('PaymentService: Payment successful, transaction ID:', transactionId);
        
        return {
          success: true,
          transactionId
        };
      } else {
        throw new Error('Payment failed - insufficient funds');
      }
    } catch (error) {
      console.error('PaymentService: Payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  },

  async refundPayment(transactionId: string): Promise<PaymentResult> {
    try {
      console.log('PaymentService: Processing refund for transaction:', transactionId);
      
      // TODO: Integrate with actual payment gateway
      // For now, simulate refund
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        transactionId: `REFUND_${transactionId}`
      };
    } catch (error) {
      console.error('PaymentService: Refund failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed'
      };
    }
  }
}; 