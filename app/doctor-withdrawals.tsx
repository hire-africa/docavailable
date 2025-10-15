import { walletApiService } from '@/services/walletApiService';
import { FontAwesome } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

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
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false 
        }} 
      />
      <DoctorWithdrawalsContent />
    </>
  );
}

function DoctorWithdrawalsContent() {
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
  
  // Mzunguko fields
  const [mzungukoFullName, setMzungukoFullName] = useState('');
  const [mzungukoEmail, setMzungukoEmail] = useState('');

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
      console.log('[DoctorWithdrawals] Loading wallet data...');
      
      // Load wallet information
      const walletResponse = await walletApiService.getWallet();
      console.log('[DoctorWithdrawals] Wallet response:', walletResponse);
      if (walletResponse.success && walletResponse.data) {
        setWallet(walletResponse.data);
        console.log('[DoctorWithdrawals] Wallet data set:', walletResponse.data);
      } else {
        console.log('[DoctorWithdrawals] Wallet response failed or no data:', walletResponse);
      }

      // Load recent transactions
      const transactionsResponse = await walletApiService.getTransactions(1, 10);
      console.log('[DoctorWithdrawals] Transactions response:', transactionsResponse);
      if (transactionsResponse.success && transactionsResponse.data) {
        setTransactions(transactionsResponse.data.data || []);
        console.log('[DoctorWithdrawals] Transactions data set:', transactionsResponse.data.data);
      } else {
        console.log('[DoctorWithdrawals] Transactions response failed or no data:', transactionsResponse);
      }
    } catch (error) {
      console.error('[DoctorWithdrawals] Error loading wallet data:', error);
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

  const getSessionTypeDescription = (sessionType: string) => {
    switch (sessionType) {
      case 'text_session':
        return 'Text Consultation';
      case 'audio_call':
        return 'Audio Call';
      case 'video_call':
        return 'Video Call';
      case 'instant_session':
        return 'Instant Session';
      default:
        return 'Consultation';
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings & Withdrawals</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadWalletData}
          disabled={loading}
        >
          <FontAwesome 
            name="refresh" 
            size={18} 
            color={loading ? "#999" : "#4CAF50"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadWalletData}
              colors={['#4CAF50']}
              tintColor="#4CAF50"
            />
          }
        >

          {/* Modern Earnings Summary */}
          <View style={styles.modernEarningsCard}>
            <View style={styles.earningsCardHeader}>
              <View style={styles.earningsIconContainer}>
                <FontAwesome name="wallet" size={20} color="#fff" />
              </View>
              <Text style={styles.earningsCardTitle}>Available Balance</Text>
          </View>

             <Text style={styles.modernEarningsAmount}>{formatCurrency(wallet?.balance || 0)}</Text>
             <Text style={styles.modernEarningsSubtitle}>Ready for withdrawal</Text>
            </View>

          {/* Modern Payment Rates */}
          <View style={styles.modernPaymentRatesCard}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="money" size={20} color="#4CAF50" />
              <Text style={styles.modernSectionTitle}>Payment Rates ({userCurrency})</Text>
              </View>
            
            <View style={styles.ratesContainer}>
              <View style={styles.modernRateItem}>
                <View style={styles.rateIconContainer}>
                  <FontAwesome name="comment" size={16} color="#4CAF50" />
              </View>
                <View style={styles.rateInfo}>
                  <Text style={styles.modernRateLabel}>Text Session</Text>
                  <Text style={styles.modernRateValue}>{formatCurrency(paymentRates.text_session)}</Text>
            </View>
          </View>

              <View style={styles.modernRateItem}>
                <View style={styles.rateIconContainer}>
                  <FontAwesome name="phone" size={16} color="#4CAF50" />
            </View>
                <View style={styles.rateInfo}>
                  <Text style={styles.modernRateLabel}>Audio Call</Text>
                  <Text style={styles.modernRateValue}>{formatCurrency(paymentRates.audio_call)}</Text>
            </View>
              </View>
              
              <View style={styles.modernRateItem}>
                <View style={styles.rateIconContainer}>
                  <FontAwesome name="video-camera" size={16} color="#4CAF50" />
                </View>
                <View style={styles.rateInfo}>
                  <Text style={styles.modernRateLabel}>Video Call</Text>
                  <Text style={styles.modernRateValue}>{formatCurrency(paymentRates.video_call)}</Text>
                </View>
              </View>
            </View>
          </View>


           {/* Modern Withdrawal Form */}
          <View style={styles.modernWithdrawalCard}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="credit-card" size={20} color="#4CAF50" />
              <Text style={styles.modernSectionTitle}>Request Withdrawal</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.modernInputLabel}>Amount ({userCurrency})</Text>
              <View style={styles.amountInputContainer}>
                <FontAwesome name="dollar-sign" size={16} color="#666" style={styles.inputIcon} />
            <TextInput
                  style={styles.modernAmountInput}
              value={withdrawalAmount}
              onChangeText={setWithdrawalAmount}
              placeholder={`Enter withdrawal amount in ${userCurrency}`}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.modernInputLabel}>Payment Method</Text>
              <View style={styles.modernPaymentMethodContainer}>
              <TouchableOpacity 
                  style={[styles.modernPaymentMethod, withdrawalMethod === 'bank' && styles.modernPaymentMethodActive]}
                onPress={() => setWithdrawalMethod('bank')}
              >
                  <View style={styles.paymentMethodIcon}>
                    <FontAwesome name="bank" size={18} color={withdrawalMethod === 'bank' ? '#4CAF50' : '#666'} />
                  </View>
                  <Text style={[styles.modernPaymentMethodText, withdrawalMethod === 'bank' && styles.modernPaymentMethodTextActive]}>
                  Bank Transfer
                </Text>
              </TouchableOpacity>
              
              {/* Mobile Money only for Malawian users */}
              {isMalawiUser && (
                <TouchableOpacity 
                    style={[styles.modernPaymentMethod, withdrawalMethod === 'mobile' && styles.modernPaymentMethodActive]}
                  onPress={() => setWithdrawalMethod('mobile')}
                >
                    <View style={styles.paymentMethodIcon}>
                      <FontAwesome name="mobile" size={18} color={withdrawalMethod === 'mobile' ? '#4CAF50' : '#666'} />
                    </View>
                    <Text style={[styles.modernPaymentMethodText, withdrawalMethod === 'mobile' && styles.modernPaymentMethodTextActive]}>
                    Mobile Money
                  </Text>
                </TouchableOpacity>
              )}
                
              </View>
            </View>

            {/* Mzunguko Payment Method - Separate Row */}
            <View style={styles.paymentMethodContainer}>
              <TouchableOpacity 
                style={[styles.modernPaymentMethod, styles.mzungukoPaymentMethod, withdrawalMethod === 'mzunguko' && styles.modernPaymentMethodActive]}
                onPress={() => setWithdrawalMethod('mzunguko')}
              >
                <View style={styles.paymentMethodIcon}>
                  <Image source={require('../assets/images/mzunguko.png')} style={styles.mzungukoIcon} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Modern Bank Transfer Fields */}
            {withdrawalMethod === 'bank' && (
              <View style={styles.modernBankFields}>
                <View style={styles.inputGroup}>
                  <Text style={styles.modernInputLabel}>Bank Name</Text>
                  <View style={styles.modernInputContainer}>
                    <FontAwesome name="university" size={16} color="#666" style={styles.inputIcon} />
                <TextInput
                      style={styles.modernTextInput}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Enter bank name"
                  placeholderTextColor="#999"
                />
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.modernInputLabel}>Account Number</Text>
                  <View style={styles.modernInputContainer}>
                    <FontAwesome name="hashtag" size={16} color="#666" style={styles.inputIcon} />
                <TextInput
                      style={styles.modernTextInput}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Enter account number"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                  </View>
                </View>
                
                {isMalawiUser && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.modernInputLabel}>Bank Branch</Text>
                    <View style={styles.modernInputContainer}>
                      <FontAwesome name="building" size={16} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.modernTextInput}
                      value={bankBranch}
                      onChangeText={setBankBranch}
                      placeholder="Enter bank branch name"
                      placeholderTextColor="#999"
                    />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Modern Mobile Money Fields */}
            {withdrawalMethod === 'mobile' && (
              <View style={styles.modernMobileFields}>
                <View style={styles.inputGroup}>
                  <Text style={styles.modernInputLabel}>Mobile Money Provider</Text>
                  <View style={styles.modernProviderContainer}>
                  <TouchableOpacity 
                      style={[styles.modernProviderOption, mobileMoneyProvider === 'airtel' && styles.modernProviderOptionActive]}
                    onPress={() => setMobileMoneyProvider('airtel')}
                  >
                      <FontAwesome name="mobile" size={16} color={mobileMoneyProvider === 'airtel' ? '#4CAF50' : '#666'} />
                      <Text style={[styles.modernProviderText, mobileMoneyProvider === 'airtel' && styles.modernProviderTextActive]}>
                      Airtel Money
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                      style={[styles.modernProviderOption, mobileMoneyProvider === 'tnm' && styles.modernProviderOptionActive]}
                    onPress={() => setMobileMoneyProvider('tnm')}
                  >
                      <FontAwesome name="mobile" size={16} color={mobileMoneyProvider === 'tnm' ? '#4CAF50' : '#666'} />
                      <Text style={[styles.modernProviderText, mobileMoneyProvider === 'tnm' && styles.modernProviderTextActive]}>
                      TNM Mpamba
                    </Text>
                  </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.modernInputLabel}>Phone Number</Text>
                  <View style={styles.modernInputContainer}>
                    <FontAwesome name="phone" size={16} color="#666" style={styles.inputIcon} />
                <TextInput
                      style={styles.modernTextInput}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
                  </View>
                </View>
              </View>
            )}

            {/* Modern Mzunguko Fields */}
            {withdrawalMethod === 'mzunguko' && (
              <View style={styles.modernMzungukoFields}>
                <View style={styles.inputGroup}>
                  <Text style={styles.modernInputLabel}>Mzunguko Full Name</Text>
                  <View style={styles.modernInputContainer}>
                    <FontAwesome name="user" size={16} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modernTextInput}
                      value={mzungukoFullName}
                      onChangeText={setMzungukoFullName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.modernInputLabel}>Email Address</Text>
                  <View style={styles.modernInputContainer}>
                    <FontAwesome name="envelope" size={16} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modernTextInput}
                      value={mzungukoEmail}
                      onChangeText={setMzungukoEmail}
                      placeholder="Enter your email address"
                      keyboardType="email-address"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.modernWithdrawButton, (!withdrawalAmount || submitting || withdrawalMethod === 'mzunguko') && styles.modernWithdrawButtonDisabled]} 
              onPress={withdrawalMethod === 'mzunguko' ? () => Alert.alert('Coming Soon', 'Mzunguko payment method is coming soon!') : handleWithdrawal}
              disabled={!withdrawalAmount || submitting || withdrawalMethod === 'mzunguko'}
            >
              <View style={styles.withdrawButtonContent}>
                <FontAwesome name="credit-card" size={18} color="#FFFFFF" />
                <Text style={styles.modernWithdrawButtonText}>
                  {submitting ? 'Submitting...' : withdrawalMethod === 'mzunguko' ? 'Coming Soon' : 'Request Withdrawal'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Modern Recent Transactions */}
          <View style={styles.modernTransactionsCard}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="history" size={20} color="#4CAF50" />
              <Text style={styles.modernSectionTitle}>Recent Transactions</Text>
            </View>
            {transactions.length > 0 ? (
              <View style={styles.transactionsList}>
                {transactions.map((transaction) => (
                  <View key={transaction.id} style={styles.modernTransactionItem}>
                    <View style={styles.transactionIconContainer}>
                      <FontAwesome 
                        name={transaction.type === 'credit' ? 'arrow-up' : 'arrow-down'} 
                        size={16} 
                        color={transaction.type === 'credit' ? '#34C759' : '#FF3B30'} 
                      />
                    </View>
                     <View style={styles.transactionInfo}>
                       <Text style={styles.modernTransactionAmount}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Text>
                       <Text style={styles.modernTransactionDescription}>
                         {transaction.type === 'credit' 
                           ? `Paid from ${transaction.patient_name || 'Patient'}` 
                           : `Withdrawal to ${transaction.payment_method === 'bank_transfer' ? 'Bank Account' : 'Mobile Money'}`
                         }
                       </Text>
                       <Text style={styles.modernTransactionDate}>
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                    <View style={styles.transactionStatusContainer}>
                      <Text style={[styles.modernStatusText, { color: getStatusColor(transaction.status) }]}>
                      {getStatusText(transaction.status)}
                    </Text>
                  </View>
                </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyTransactionsContainer}>
                <FontAwesome name="inbox" size={48} color="#E0E0E0" />
                <Text style={styles.modernNoTransactionsText}>No transactions yet</Text>
                <Text style={styles.modernNoTransactionsSubtext}>Your transaction history will appear here</Text>
              </View>
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
    backgroundColor: '#F5F7FA',
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
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? 40 : 20,
    paddingTop: 20,
  },
   // Header Styles
   header: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     paddingHorizontal: 20,
     paddingVertical: 16,
     backgroundColor: '#fff',
     borderBottomWidth: 1,
     borderBottomColor: '#E0E0E0',
     marginTop: 20,
   },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modern Header Styles
  modernHeader: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerContent: {
    padding: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  currencyText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Modern Earnings Card Styles
  modernEarningsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  earningsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  earningsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  earningsCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  modernEarningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  modernEarningsSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
   modernWalletStats: {
     marginBottom: 12,
   },
   modernStatItem: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
   },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  modernStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modernStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  // Modern Payment Rates Styles
  modernPaymentRatesCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 12,
  },
  ratesContainer: {
    gap: 12,
  },
  modernRateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  rateIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rateInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernRateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
   modernRateValue: {
     fontSize: 16,
     fontWeight: 'bold',
     color: '#4CAF50',
   },
   legendItem: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingVertical: 8,
   },
   legendColor: {
     width: 16,
     height: 16,
     borderRadius: 8,
     marginRight: 12,
   },
   legendLabel: {
     fontSize: 14,
     fontWeight: '600',
     color: '#222',
     flex: 1,
   },
   legendValue: {
     fontSize: 14,
     fontWeight: 'bold',
     color: '#222',
   },
  // Modern Withdrawal Form Styles
  modernWithdrawalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  inputGroup: {
    marginBottom: 20,
  },
  modernInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 8,
  },
  modernAmountInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#222',
  },
  modernPaymentMethodContainer: {
    flexDirection: 'row',
    gap: 12,
  },
   modernPaymentMethod: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#F8F9FA',
     borderRadius: 12,
     padding: 12,
     borderWidth: 1,
     borderColor: '#E0E0E0',
     minHeight: 50,
   },
  modernPaymentMethodActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
   modernPaymentMethodText: {
     fontSize: 12,
     fontWeight: '600',
     color: '#666',
     flex: 1,
     textAlign: 'center',
   },
  modernPaymentMethodTextActive: {
    color: '#4CAF50',
  },
  modernBankFields: {
    marginTop: 8,
  },
  modernInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modernTextInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#222',
  },
  modernMobileFields: {
    marginTop: 8,
  },
  modernProviderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modernProviderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modernProviderOptionActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  modernProviderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  modernProviderTextActive: {
    color: '#4CAF50',
  },
  modernWithdrawButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernWithdrawButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  withdrawButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernWithdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Modern Transactions Styles
  modernTransactionsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  transactionsList: {
    gap: 12,
  },
  modernTransactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  modernTransactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  modernTransactionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  modernTransactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionStatusContainer: {
    alignItems: 'flex-end',
  },
  modernStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  emptyTransactionsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modernNoTransactionsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  modernNoTransactionsSubtext: {
    fontSize: 14,
    color: '#999',
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
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 20,
    gap: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    width: '31%',
    marginBottom: 8,
    minHeight: 50,
  },
  paymentMethodActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  paymentMethodText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
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
  // Mzunguko Styles
  modernMzungukoFields: {
    marginTop: 16,
  },
  mzungukoIcon: {
    width: 106,
    height: 106,
    resizeMode: 'contain',
  },
  mzungukoPaymentMethod: {
    flex: 0,
    width: 120,
    justifyContent: 'center',
    alignSelf: 'center',
  },
}); 