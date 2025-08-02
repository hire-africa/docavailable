import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { walletApiService } from '../services/walletApiService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

// Payment rates based on currency
const PAYMENT_RATES = {
  MWK: {
    text_session: 4000,
    audio_call: 5000,
    video_call: 6000,
    currency: 'MWK'
  },
  USD: {
    text_session: 4,
    audio_call: 5,
    video_call: 6,
    currency: 'USD'
  }
};

export default function DoctorWithdrawals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('bank');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('airtel');
  const [submitting, setSubmitting] = useState(false);
  
  // Bank fields
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  
  // Mobile money fields
  const [phoneNumber, setPhoneNumber] = useState('');

  // Determine currency based on user's country
  const userCurrency = user?.country?.toLowerCase() === 'malawi' ? 'MWK' : 'USD';
  const paymentRates = PAYMENT_RATES[userCurrency];
  const isMalawiUser = user?.country?.toLowerCase() === 'malawi';

  // Set default payment method based on user's country
  useEffect(() => {
    if (!isMalawiUser && withdrawalMethod === 'mobile') {
      setWithdrawalMethod('bank');
    }
  }, [isMalawiUser, withdrawalMethod]);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    loadWalletData();
  }, [user]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      
      // Load wallet information
      const walletResponse = await walletApiService.getWallet();
      if (walletResponse.success && walletResponse.data) {
        setWallet(walletResponse.data);
      }

      // Load recent transactions
      const transactionsResponse = await walletApiService.getTransactions(1, 10);
      if (transactionsResponse.success && transactionsResponse.data) {
        setTransactions(transactionsResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (amount > (wallet?.balance || 0)) {
      Alert.alert('Error', 'Withdrawal amount cannot exceed available balance.');
      return;
    }
    if (amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    // Validate required fields based on method
    if (withdrawalMethod === 'mobile') {
      if (!phoneNumber.trim()) {
        Alert.alert('Error', 'Please enter your phone number.');
        return;
      }
    } else {
      if (!bankName.trim() || !accountNumber.trim()) {
        Alert.alert('Error', 'Please fill in all required bank details.');
        return;
      }
      if (isMalawiUser && !bankBranch.trim()) {
        Alert.alert('Error', 'Please enter bank branch name.');
        return;
      }
    }
    
    try {
      setSubmitting(true);
      
      const withdrawalData = {
        amount: amount,
        payment_method: withdrawalMethod === 'bank' ? 'bank_transfer' : 'mobile_money',
        payment_details: {
          bank_name: withdrawalMethod === 'bank' ? bankName : '',
          account_number: withdrawalMethod === 'bank' ? accountNumber : '',
          bank_branch: withdrawalMethod === 'bank' && isMalawiUser ? bankBranch : '',
          mobile_provider: withdrawalMethod === 'mobile' ? mobileMoneyProvider : '',
          mobile_number: withdrawalMethod === 'mobile' ? phoneNumber : '',
        }
      };

      const response = await walletApiService.requestWithdrawal(withdrawalData);
      
      if (response.success) {
        Alert.alert(
          'Withdrawal Request Submitted',
          `Withdrawal request for ${formatCurrency(amount)} via ${withdrawalMethod === 'bank' ? 'Bank Transfer' : `${mobileMoneyProvider === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}`} has been submitted. You will receive payment within 3-5 business days.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setWithdrawalAmount('');
                setBankName('');
                setAccountNumber('');
                setBankBranch('');
                setPhoneNumber('');
                loadWalletData(); // Refresh data
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to submit withdrawal request');
      }
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = userCurrency;
    const locale = currency === 'MWK' ? 'en-MW' : 'en-US';
    const currencyCode = currency === 'MWK' ? 'MWK' : 'USD';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'pending':
        return '#FF9500';
      case 'failed':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContent}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading wallet data...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Currency Info */}
          <View style={styles.currencyInfo}>
            <Text style={styles.currencyText}>
              Currency: {userCurrency} ({user?.country || 'Unknown Country'})
            </Text>
          </View>

          {/* Earnings Summary */}
          <View style={styles.earningsCard}>
            <View style={styles.earningsHeader}>
              <FontAwesome name="money" size={24} color="#4CAF50" />
              <Text style={styles.earningsTitle}>Available Balance</Text>
            </View>
            <Text style={styles.earningsAmount}>{formatCurrency(wallet?.balance || 0)}</Text>
            <Text style={styles.earningsSubtitle}>Ready for withdrawal</Text>
            
            {/* Additional wallet info */}
            <View style={styles.walletStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Earned</Text>
                <Text style={styles.statValue}>{formatCurrency(wallet?.total_earned || 0)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Withdrawn</Text>
                <Text style={styles.statValue}>{formatCurrency(wallet?.total_withdrawn || 0)}</Text>
              </View>
            </View>
          </View>

          {/* Payment Rates */}
          <View style={styles.paymentRatesCard}>
            <Text style={styles.sectionTitle}>Payment Rates ({userCurrency})</Text>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Text Session</Text>
              <Text style={styles.rateValue}>{formatCurrency(paymentRates.text_session)}</Text>
            </View>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Audio Call</Text>
              <Text style={styles.rateValue}>{formatCurrency(paymentRates.audio_call)}</Text>
            </View>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Video Call</Text>
              <Text style={styles.rateValue}>{formatCurrency(paymentRates.video_call)}</Text>
            </View>
          </View>

          {/* Withdrawal Form */}
          <View style={styles.withdrawalCard}>
            <Text style={styles.sectionTitle}>Request Withdrawal</Text>
            
            <Text style={styles.inputLabel}>Amount ({userCurrency})</Text>
            <TextInput
              style={styles.amountInput}
              value={withdrawalAmount}
              onChangeText={setWithdrawalAmount}
              placeholder={`Enter withdrawal amount in ${userCurrency}`}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            
            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.paymentMethodContainer}>
              <TouchableOpacity 
                style={[styles.paymentMethod, withdrawalMethod === 'bank' && styles.paymentMethodActive]}
                onPress={() => setWithdrawalMethod('bank')}
              >
                <FontAwesome name="bank" size={16} color={withdrawalMethod === 'bank' ? '#4CAF50' : '#666'} />
                <Text style={[styles.paymentMethodText, withdrawalMethod === 'bank' && styles.paymentMethodTextActive]}>
                  Bank Transfer
                </Text>
              </TouchableOpacity>
              
              {/* Mobile Money only for Malawian users */}
              {isMalawiUser && (
                <TouchableOpacity 
                  style={[styles.paymentMethod, withdrawalMethod === 'mobile' && styles.paymentMethodActive]}
                  onPress={() => setWithdrawalMethod('mobile')}
                >
                  <FontAwesome name="mobile" size={16} color={withdrawalMethod === 'mobile' ? '#4CAF50' : '#666'} />
                  <Text style={[styles.paymentMethodText, withdrawalMethod === 'mobile' && styles.paymentMethodTextActive]}>
                    Mobile Money
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bank Transfer Fields */}
            {withdrawalMethod === 'bank' && (
              <View style={styles.bankFields}>
                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Enter bank name"
                  placeholderTextColor="#999"
                />
                
                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Enter account number"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                
                {isMalawiUser && (
                  <>
                    <Text style={styles.inputLabel}>Bank Branch</Text>
                    <TextInput
                      style={styles.textInput}
                      value={bankBranch}
                      onChangeText={setBankBranch}
                      placeholder="Enter bank branch name"
                      placeholderTextColor="#999"
                    />
                  </>
                )}
              </View>
            )}

            {/* Mobile Money Fields */}
            {withdrawalMethod === 'mobile' && (
              <View style={styles.mobileFields}>
                <Text style={styles.inputLabel}>Mobile Money Provider</Text>
                <View style={styles.providerContainer}>
                  <TouchableOpacity 
                    style={[styles.providerOption, mobileMoneyProvider === 'airtel' && styles.providerOptionActive]}
                    onPress={() => setMobileMoneyProvider('airtel')}
                  >
                    <Text style={[styles.providerText, mobileMoneyProvider === 'airtel' && styles.providerTextActive]}>
                      Airtel Money
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.providerOption, mobileMoneyProvider === 'tnm' && styles.providerOptionActive]}
                    onPress={() => setMobileMoneyProvider('tnm')}
                  >
                    <Text style={[styles.providerText, mobileMoneyProvider === 'tnm' && styles.providerTextActive]}>
                      TNM Mpamba
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>
            )}

            <TouchableOpacity 
              style={[styles.withdrawButton, (!withdrawalAmount || submitting) && styles.withdrawButtonDisabled]} 
              onPress={handleWithdrawal}
              disabled={!withdrawalAmount || submitting}
            >
              <FontAwesome name="bank" size={16} color="#FFFFFF" />
              <Text style={styles.withdrawButtonText}>
                {submitting ? 'Submitting...' : 'Request Withdrawal'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View style={styles.recentWithdrawalsCard}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <View key={transaction.id} style={styles.withdrawalItem}>
                  <View style={styles.withdrawalInfo}>
                    <Text style={styles.withdrawalAmount}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Text>
                    <Text style={styles.withdrawalDate}>
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </Text>
                    <Text style={styles.withdrawalReference}>{transaction.description}</Text>
                  </View>
                  <View style={styles.withdrawalStatus}>
                    <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                      {getStatusText(transaction.status)}
                    </Text>
                    <FontAwesome 
                      name={transaction.type === 'credit' ? 'arrow-up' : 'arrow-down'} 
                      size={16} 
                      color={transaction.type === 'credit' ? '#34C759' : '#FF3B30'} 
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noTransactionsText}>No transactions yet</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
    maxWidth: maxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? 40 : 20,
    paddingTop: 20,
  },
  currencyInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currencyText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  earningsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  walletStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  paymentRatesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rateLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  rateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  withdrawalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#000',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  paymentMethodActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  paymentMethodTextActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  bankFields: {
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#000',
  },
  mobileFields: {
    marginTop: 16,
  },
  providerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  providerOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  providerOptionActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  providerText: {
    fontSize: 14,
    color: '#666',
  },
  providerTextActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  withdrawButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  recentWithdrawalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  withdrawalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  withdrawalInfo: {
    flex: 1,
  },
  withdrawalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  withdrawalDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  withdrawalReference: {
    fontSize: 12,
    color: '#999',
  },
  withdrawalStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noTransactionsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
}); 