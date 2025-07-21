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

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

export default function DoctorWithdrawals() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState(150000); // Mock earnings
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('bank');
  const [recentWithdrawals, setRecentWithdrawals] = useState([
    {
      id: '1',
      amount: 50000,
      method: 'bank',
      status: 'completed',
      date: '2024-01-15',
      reference: 'WD-001'
    },
    {
      id: '2',
      amount: 75000,
      method: 'mobile',
      status: 'pending',
      date: '2024-01-20',
      reference: 'WD-002'
    }
  ]);

  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user]);

  if (!user) return null;

  const handleWithdrawal = () => {
    const amount = parseFloat(withdrawalAmount);
    if (amount > earnings) {
      Alert.alert('Error', 'Withdrawal amount cannot exceed available earnings.');
      return;
    }
    if (amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    
    // Simulate withdrawal process
    Alert.alert(
      'Withdrawal Request',
      `Withdrawal request for ${formatCurrency(amount)} via ${withdrawalMethod} has been submitted. You will receive payment within 3-5 business days.`,
      [
        {
          text: 'OK',
          onPress: () => {
            setEarnings(earnings - amount);
            setWithdrawalAmount('');
            
            // Add to recent withdrawals
            const newWithdrawal = {
              id: Date.now().toString(),
              amount: amount,
              method: withdrawalMethod,
              status: 'pending',
              date: new Date().toISOString().split('T')[0],
              reference: `WD-${Date.now().toString().slice(-6)}`
            };
            setRecentWithdrawals([newWithdrawal, ...recentWithdrawals]);
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MW', {
      style: 'currency',
      currency: 'MWK'
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome name="arrow-left" size={22} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Withdraw Earnings</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Earnings Summary */}
          <View style={styles.earningsCard}>
            <View style={styles.earningsHeader}>
              <FontAwesome name="money" size={24} color="#4CAF50" />
              <Text style={styles.earningsTitle}>Available Balance</Text>
            </View>
            <Text style={styles.earningsAmount}>{formatCurrency(earnings)}</Text>
            <Text style={styles.earningsSubtitle}>Ready for withdrawal</Text>
          </View>

          {/* Withdrawal Form */}
          <View style={styles.withdrawalCard}>
            <Text style={styles.sectionTitle}>Request Withdrawal</Text>
            
            <Text style={styles.inputLabel}>Amount (MWK)</Text>
            <TextInput
              style={styles.amountInput}
              value={withdrawalAmount}
              onChangeText={setWithdrawalAmount}
              placeholder="Enter withdrawal amount"
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
              
              <TouchableOpacity 
                style={[styles.paymentMethod, withdrawalMethod === 'mobile' && styles.paymentMethodActive]}
                onPress={() => setWithdrawalMethod('mobile')}
              >
                <FontAwesome name="mobile" size={16} color={withdrawalMethod === 'mobile' ? '#4CAF50' : '#666'} />
                <Text style={[styles.paymentMethodText, withdrawalMethod === 'mobile' && styles.paymentMethodTextActive]}>
                  Mobile Money
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.withdrawButton, !withdrawalAmount && styles.withdrawButtonDisabled]} 
              onPress={handleWithdrawal}
              disabled={!withdrawalAmount}
            >
              <FontAwesome name="bank" size={16} color="#FFFFFF" />
              <Text style={styles.withdrawButtonText}>Request Withdrawal</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Withdrawals */}
          <View style={styles.recentWithdrawalsCard}>
            <Text style={styles.sectionTitle}>Recent Withdrawals</Text>
            {recentWithdrawals.map((withdrawal) => (
              <View key={withdrawal.id} style={styles.withdrawalItem}>
                <View style={styles.withdrawalInfo}>
                  <Text style={styles.withdrawalAmount}>{formatCurrency(withdrawal.amount)}</Text>
                  <Text style={styles.withdrawalDate}>{withdrawal.date}</Text>
                  <Text style={styles.withdrawalReference}>Ref: {withdrawal.reference}</Text>
                </View>
                <View style={styles.withdrawalStatus}>
                  <Text style={[styles.statusText, { color: getStatusColor(withdrawal.status) }]}>
                    {getStatusText(withdrawal.status)}
                  </Text>
                  <FontAwesome 
                    name={withdrawal.method === 'bank' ? 'bank' : 'mobile'} 
                    size={16} 
                    color="#666" 
                  />
                </View>
              </View>
            ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? 40 : 20,
    paddingTop: 20,
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
}); 