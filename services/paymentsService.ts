import { apiService } from './apiService';

export const paymentsService = {
  initiatePlanPurchase(planId: number) {
    return apiService.post('/payments/paychangu/initiate', { plan_id: planId });
  },
};

