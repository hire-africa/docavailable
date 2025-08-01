import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { paymentService } from '../services/paymentService';

// Local interface for SubscriptionPlan
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  textSessions: number;
  voiceCalls: number;
  videoCalls: number;
  features: string[];
  popular?: boolean;
}

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
  onPaymentSuccess: () => void;
}

type PaymentMethod = 'bank' | 'mobile';

export default function PaymentModal({ visible, onClose, plan, onPaymentSuccess }: PaymentModalProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('mobile');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const handlePayment = async () => {
    if (!plan) return;

    // Validate inputs based on payment method
    if (selectedPaymentMethod === 'mobile') {
      if (!phoneNumber.trim()) {
        Alert.alert('Error', 'Please enter your phone number');
        return;
      }
      
      // Validate phone number format (basic validation for Malawi numbers)
      const phoneRegex = /^(0|\+265|265)?[789]\d{7}$/;
      if (!phoneRegex.test(phoneNumber.trim().replace(/\s/g, ''))) {
        Alert.alert('Error', 'Please enter a valid phone number (e.g., 0881234567 or +265881234567)');
        return;
      }
    }

    if (selectedPaymentMethod === 'bank' && !accountNumber.trim()) {
      Alert.alert('Error', 'Please enter your account number');
      return;
    }

    setIsProcessing(true);

    try {
      const paymentRequest: PaymentRequest = {
        amount: plan.price,
        currency: plan.currency,
        method: selectedPaymentMethod,
        phoneNumber: selectedPaymentMethod === 'mobile' ? phoneNumber.trim() : undefined,
        accountNumber: selectedPaymentMethod === 'bank' ? accountNumber : undefined,
        description: `${plan.name} subscription`
      };

      const result = await paymentService.processPayment(paymentRequest);

      if (result.success) {
        Alert.alert(
          'Payment Successful!',
          `Your ${plan.name} subscription has been activated.\nTransaction ID: ${result.transactionId}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onPaymentSuccess();
                onClose();
                setIsProcessing(false);
              }
            }
          ]
        );
      } else {
        Alert.alert('Payment Failed', result.error || 'Please try again or contact support.');
        setIsProcessing(false);
      }
    } catch (error) {
      Alert.alert('Payment Failed', 'Please try again or contact support.');
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'MWK') {
      return `mk ${amount.toLocaleString()}`;
    } else if (currency === 'USD') {
      return `$${amount.toLocaleString()}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Payment</Text>
            <Text style={styles.headerSubtitle}>Complete your subscription</Text>
          </View>
          <View style={styles.headerIcon}>
            <FontAwesome name="credit-card" size={20} color="#4CAF50" />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Plan Summary */}
          {plan && (
            <View style={styles.planSummary}>
              <Text style={styles.planTitle}>{plan.name} Plan</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>{formatCurrency(plan.price, plan.currency)}</Text>
                <Text style={styles.period}>/month</Text>
              </View>
              <View style={styles.features}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.feature}>
                    <FontAwesome name="check" size={14} color="#4CAF50" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Payment Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Payment Method</Text>
            
            {/* Mobile Money Option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPaymentMethod === 'mobile' && styles.selectedPaymentOption
              ]}
              onPress={() => setSelectedPaymentMethod('mobile')}
            >
              <View style={styles.paymentOptionHeader}>
                <View style={styles.paymentIcon}>
                  <FontAwesome name="mobile" size={20} color="#4CAF50" />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>Mobile Money</Text>
                  <Text style={styles.paymentSubtitle}>Airtel Money, TNM Mpamba</Text>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedPaymentMethod === 'mobile' && styles.radioButtonSelected
                ]}>
                  {selectedPaymentMethod === 'mobile' && (
                    <FontAwesome name="check" size={12} color="#fff" />
                  )}
                </View>
              </View>
              
              {selectedPaymentMethod === 'mobile' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <Text style={styles.textInput}>
                    Enter your phone number
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Bank Transfer Option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPaymentMethod === 'bank' && styles.selectedPaymentOption
              ]}
              onPress={() => setSelectedPaymentMethod('bank')}
            >
              <View style={styles.paymentOptionHeader}>
                <View style={styles.paymentIcon}>
                  <FontAwesome name="university" size={20} color="#4CAF50" />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>Bank Transfer</Text>
                  <Text style={styles.paymentSubtitle}>Direct bank transfer</Text>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedPaymentMethod === 'bank' && styles.radioButtonSelected
                ]}>
                  {selectedPaymentMethod === 'bank' && (
                    <FontAwesome name="check" size={12} color="#fff" />
                  )}
                </View>
              </View>
              
              {selectedPaymentMethod === 'bank' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Account Number</Text>
                  <Text style={styles.textInput}>
                    Enter your account number
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Payment Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Instructions</Text>
            <View style={styles.instructions}>
              {selectedPaymentMethod === 'mobile' ? (
                <>
                  <Text style={styles.instructionText}>• You will receive an SMS with payment instructions</Text>
                  <Text style={styles.instructionText}>• Enter the provided code to complete payment</Text>
                  <Text style={styles.instructionText}>• Payment will be processed securely</Text>
                </>
              ) : (
                <>
                  <Text style={styles.instructionText}>• You will receive bank transfer details</Text>
                  <Text style={styles.instructionText}>• Complete the transfer within 24 hours</Text>
                  <Text style={styles.instructionText}>• Subscription will be activated after payment confirmation</Text>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Payment Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.payButton,
              isProcessing && styles.payButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <FontAwesome name="spinner" size={16} color="#fff" />
                <Text style={styles.payButtonText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.payButtonText}>
                Pay {plan ? formatCurrency(plan.price, plan.currency) : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 50,
  },
  closeButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerIcon: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  planSummary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  period: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  features: {
    gap: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  paymentOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedPaymentOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0F8F0',
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  paymentSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  inputContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  instructions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  payButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#B7EFC5',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 