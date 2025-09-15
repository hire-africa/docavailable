import { useAuth } from '@/contexts/AuthContext';
import { hybridService } from '@/services/hybridService';
import { notificationApiService } from '@/services/notificationApiService';
import { walletApiService } from '@/services/walletApiService';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { apiService } from '../app/services/apiService';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export default function BackendTestPage() {
  const { user, userData } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const addTestResult = (name: string, status: 'pending' | 'success' | 'error', message: string, data?: any) => {
    setTestResults(prev => [
      ...prev.filter(t => t.name !== name),
      { name, status, message, data }
    ]);
  };

  const runAllTests = async () => {
    setRunning(true);
    setTestResults([]);

    try {
      // Test 1: Backend Connectivity
      addTestResult('Backend Connectivity', 'pending', 'Testing connection...');
      const connectivityTest = await hybridService.isBackendAvailable();
      addTestResult(
        'Backend Connectivity',
        connectivityTest ? 'success' : 'error',
        connectivityTest ? 'Backend is reachable' : 'Backend is not reachable'
      );

      if (!connectivityTest) {
        setRunning(false);
        return;
      }

      // Test 2: API Service Basic Request
      addTestResult('API Service', 'pending', 'Testing API service...');
      try {
        const response = await apiService.get('/api/health');
        addTestResult(
          'API Service',
          response.success ? 'success' : 'error',
          response.success ? 'API service working' : 'API service failed',
          response.data
        );
      } catch (error: any) {
        addTestResult('API Service', 'error', `API service error: ${error.message}`);
      }

      // Test 3: Authentication
      addTestResult('Authentication', 'pending', 'Testing authentication...');
      if (user) {
        try {
          const token = await user.getIdToken();
          addTestResult(
            'Authentication',
            'success',
            'Firebase token generated successfully',
            { tokenLength: token.length }
          );
        } catch (error: any) {
          addTestResult('Authentication', 'error', `Authentication error: ${error.message}`);
        }
      } else {
        addTestResult('Authentication', 'error', 'No user logged in');
      }

      // Test 4: New Chat API (requires authentication)
      if (user) {
        addTestResult('New Chat API', 'pending', 'Testing new chat API...');
        try {
          const chatResponse = await apiService.get('/chat/1/info');
          addTestResult(
            'New Chat API',
            chatResponse.success ? 'success' : 'error',
            chatResponse.success ? 'New Chat API working' : 'New Chat API failed',
            chatResponse.data
          );
        } catch (error: any) {
          addTestResult('New Chat API', 'error', `New Chat API error: ${error.message}`);
        }
      } else {
        addTestResult('New Chat API', 'error', 'New Chat API requires authentication - please log in');
      }

      // Test 5: Wallet API (for doctors)
      if (userData?.userType === 'doctor') {
        addTestResult('Wallet API', 'pending', 'Testing wallet API...');
        try {
          const walletResponse = await walletApiService.getWallet();
          addTestResult(
            'Wallet API',
            walletResponse.success ? 'success' : 'error',
            walletResponse.success ? 'Wallet API working' : 'Wallet API failed',
            walletResponse.data
          );
        } catch (error: any) {
          addTestResult('Wallet API', 'error', `Wallet API error: ${error.message}`);
        }
      }

      // Test 6: Notifications API (requires authentication)
      if (user) {
        addTestResult('Notifications API', 'pending', 'Testing notifications API...');
        try {
          const notificationResponse = await notificationApiService.getNotifications();
          addTestResult(
            'Notifications API',
            notificationResponse.success ? 'success' : 'error',
            notificationResponse.success ? 'Notifications API working' : 'Notifications API failed',
            notificationResponse.data
          );
        } catch (error: any) {
          addTestResult('Notifications API', 'error', `Notifications API error: ${error.message}`);
        }
      } else {
        addTestResult('Notifications API', 'error', 'Notifications API requires authentication - please log in');
      }

      // Test 7: Feature Flags
      addTestResult('Feature Flags', 'pending', 'Checking feature flags...');
      const flags = hybridService.getFeatureFlags();
      addTestResult(
        'Feature Flags',
        'success',
        'Feature flags loaded',
        flags
      );

    } catch (error: any) {
      addTestResult('General', 'error', `General error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const runSpecificTest = async (testName: string) => {
    setRunning(true);
    addTestResult(testName, 'pending', 'Running test...');

    try {
      switch (testName) {
        case 'Backend Connectivity':
          const connectivity = await hybridService.isBackendAvailable();
          addTestResult(testName, connectivity ? 'success' : 'error', 
            connectivity ? 'Backend is reachable' : 'Backend is not reachable');
          break;

        case 'New Chat API':
          if (user) {
            const chatResponse = await apiService.get('/chat/1/info');
            addTestResult(testName, chatResponse.success ? 'success' : 'error',
              chatResponse.success ? 'New Chat API working' : 'New Chat API failed',
              chatResponse.data);
          } else {
            addTestResult(testName, 'error', 'New Chat API requires authentication - please log in');
          }
          break;

        case 'Wallet API':
          const walletResponse = await walletApiService.getWallet();
          addTestResult(testName, walletResponse.success ? 'success' : 'error',
            walletResponse.success ? 'Wallet API working' : 'Wallet API failed',
            walletResponse.data);
          break;

        case 'Notifications API':
          if (user) {
            const notificationResponse = await notificationApiService.getNotifications();
            addTestResult(testName, notificationResponse.success ? 'success' : 'error',
              notificationResponse.success ? 'Notifications API working' : 'Notifications API failed',
              notificationResponse.data);
          } else {
            addTestResult(testName, 'error', 'Notifications API requires authentication - please log in');
          }
          break;

        default:
          addTestResult(testName, 'error', 'Unknown test');
      }
    } catch (error: any) {
      addTestResult(testName, 'error', `Test error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backend Integration Test</Text>
        <Text style={styles.subtitle}>Testing Laravel Backend Connectivity</Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userText}>
          User: {userData?.displayName || user?.email || 'Not logged in'}
        </Text>
        <Text style={styles.userText}>
          Type: {userData?.userType || 'Unknown'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runAllTests}
          disabled={running}
        >
          <Text style={styles.buttonText}>
            {running ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setTestResults([])}
          disabled={running}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {running && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Running tests...</Text>
        </View>
      )}

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results</Text>
        
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No tests run yet</Text>
        ) : (
          testResults.map((result, index) => (
            <View key={index} style={styles.testResult}>
              <View style={styles.testHeader}>
                <Text style={styles.testName}>{result.name}</Text>
                <Text style={styles.testIcon}>{getStatusIcon(result.status)}</Text>
              </View>
              
              <Text style={[styles.testStatus, { color: getStatusColor(result.status) }]}>
                {result.status.toUpperCase()}
              </Text>
              
              <Text style={styles.testMessage}>{result.message}</Text>
              
              {result.data && (
                <View style={styles.testData}>
                  <Text style={styles.testDataTitle}>Data:</Text>
                  <Text style={styles.testDataText}>
                    {JSON.stringify(result.data, null, 2)}
                  </Text>
                </View>
              )}

              {result.status === 'error' && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => runSpecificTest(result.name)}
                  disabled={running}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Integration Status</Text>
        <Text style={styles.infoText}>
          • Backend URL: {process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000/api'}
        </Text>
        <Text style={styles.infoText}>
          • Backend Enabled: {process.env.EXPO_PUBLIC_BACKEND_ENABLED || 'true'}
        </Text>
        <Text style={styles.infoText}>
          • Chat Backend: {process.env.EXPO_PUBLIC_USE_BACKEND_CHAT || 'true'}
        </Text>
        <Text style={styles.infoText}>
          • Wallet Backend: {process.env.EXPO_PUBLIC_USE_BACKEND_WALLET || 'true'}
        </Text>
        <Text style={styles.infoText}>
          • Notifications Backend: {process.env.EXPO_PUBLIC_USE_BACKEND_NOTIFICATIONS || 'true'}
        </Text>
      </View>

      {testResults.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Test Summary</Text>
          <Text style={styles.summaryText}>
            ✅ <Text style={styles.bold}>Backend Connectivity & API Service</Text> - These tests verify that your mobile app can reach the Laravel backend and make basic API calls.
          </Text>
          <Text style={styles.summaryText}>
            🔐 <Text style={styles.bold}>Authentication Required</Text> - Chat API and Notifications API require you to be logged in. This is normal security behavior.
          </Text>
          <Text style={styles.summaryText}>
            🎯 <Text style={styles.bold}>Next Steps</Text> - Log in to your account to test the full functionality of protected APIs.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  userInfo: {
    padding: 15,
    backgroundColor: '#e3f2fd',
    margin: 10,
    borderRadius: 8,
  },
  userText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    padding: 15,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  noResults: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  testResult: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e0e0e0',
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  testIcon: {
    fontSize: 18,
  },
  testStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  testMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  testData: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  testDataTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  testDataText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#ff9800',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 15,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryContainer: {
    padding: 15,
    backgroundColor: '#f0f8ff',
    margin: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
}); 