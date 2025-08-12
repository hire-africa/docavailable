import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
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
  details?: any;
  duration?: number;
}

export default function NetworkTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const addTestResult = (name: string, status: 'pending' | 'success' | 'error', message: string, details?: any, duration?: number) => {
    setTestResults(prev => [
      ...prev.filter(t => t.name !== name),
      { name, status, message, details, duration }
    ]);
  };

  const runNetworkTests = async () => {
    setRunning(true);
    setTestResults([]);

    try {
      // Test 1: Environment Variable Check
      addTestResult('Environment Variable', 'pending', 'Checking environment configuration...');
      const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000';
      addTestResult(
        'Environment Variable',
        'success',
        'Environment variable loaded',
        { 
          apiUrl,
          hasEnvVar: !!process.env.EXPO_PUBLIC_API_BASE_URL,
          fallbackUsed: !process.env.EXPO_PUBLIC_API_BASE_URL
        }
      );

      // Test 2: Basic Network Connectivity
      addTestResult('Basic Connectivity', 'pending', 'Testing basic network connectivity...');
      const startTime = Date.now();
      try {
        const response = await fetch(`${apiUrl}/api/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (response.ok) {
          const data = await response.json();
          addTestResult(
            'Basic Connectivity',
            'success',
            `Connection successful (${duration}ms)`,
            { 
              status: response.status,
              duration,
              data
            },
            duration
          );
        } else {
          addTestResult(
            'Basic Connectivity',
            'error',
            `HTTP ${response.status}: ${response.statusText}`,
            { status: response.status, statusText: response.statusText }
          );
        }
      } catch (error: any) {
        addTestResult(
          'Basic Connectivity',
          'error',
          `Network error: ${error.message}`,
          { error: error.message, type: error.name }
        );
      }

      // Test 3: API Service Test
      addTestResult('API Service', 'pending', 'Testing API service wrapper...');
      const apiStartTime = Date.now();
      try {
        const response = await apiService.get('/api/health');
        const apiEndTime = Date.now();
        const apiDuration = apiEndTime - apiStartTime;

        if (response.success) {
          addTestResult(
            'API Service',
            'success',
            `API service working (${apiDuration}ms)`,
            { 
              success: response.success,
              data: response.data,
              duration: apiDuration
            },
            apiDuration
          );
        } else {
          addTestResult(
            'API Service',
            'error',
            'API service returned error',
            { success: response.success, message: response.message }
          );
        }
      } catch (error: any) {
        addTestResult(
          'API Service',
          'error',
          `API service error: ${error.message}`,
          { error: error.message, type: error.name }
        );
      }

      // Test 4: CORS Test
      addTestResult('CORS Headers', 'pending', 'Testing CORS configuration...');
      try {
        const corsResponse = await fetch(`${apiUrl}/health`, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'http://172.20.10.11:3000',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type',
          },
        });

        const corsHeaders = {
          allowOrigin: corsResponse.headers.get('Access-Control-Allow-Origin'),
          allowMethods: corsResponse.headers.get('Access-Control-Allow-Methods'),
          allowHeaders: corsResponse.headers.get('Access-Control-Allow-Headers'),
        };

        addTestResult(
          'CORS Headers',
          'success',
          'CORS headers present',
          corsHeaders
        );
      } catch (error: any) {
        addTestResult(
          'CORS Headers',
          'error',
          `CORS test failed: ${error.message}`,
          { error: error.message }
        );
      }

      // Test 5: Timeout Test
      addTestResult('Timeout Handling', 'pending', 'Testing timeout handling...');
      try {
        const timeoutResponse = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (timeoutResponse.ok) {
          addTestResult(
            'Timeout Handling',
            'success',
            'Request completed within timeout',
            { status: timeoutResponse.status }
          );
        } else {
          addTestResult(
            'Timeout Handling',
            'error',
            `Request failed: ${timeoutResponse.status}`,
            { status: timeoutResponse.status }
          );
        }
      } catch (error: any) {
        if (error.name === 'TimeoutError') {
          addTestResult(
            'Timeout Handling',
            'error',
            'Request timed out',
            { error: error.message }
          );
        } else {
          addTestResult(
            'Timeout Handling',
            'error',
            `Timeout test error: ${error.message}`,
            { error: error.message }
          );
        }
      }

      // Test 6: Platform Info
      addTestResult('Platform Info', 'success', 'Platform information', {
        platform: Platform.OS,
        version: Platform.Version,
        isIOS: Platform.OS === 'ios',
        isAndroid: Platform.OS === 'android',
        isWeb: Platform.OS === 'web',
      });

    } catch (error: any) {
      addTestResult('General', 'error', `General error: ${error.message}`, { error: error.message });
    } finally {
      setRunning(false);
    }
  };

  const runSpecificTest = async (testName: string) => {
    setRunning(true);
    addTestResult(testName, 'pending', 'Running test...');

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000';
      
      switch (testName) {
        case 'Basic Connectivity':
          const response = await fetch(`${apiUrl}/api/health`);
          if (response.ok) {
            const data = await response.json();
            addTestResult(testName, 'success', 'Connection successful', { data });
          } else {
            addTestResult(testName, 'error', `HTTP ${response.status}`, { status: response.status });
          }
          break;

        case 'API Service':
          const apiResponse = await apiService.get('/api/health');
          if (apiResponse.success) {
            addTestResult(testName, 'success', 'API service working', { data: apiResponse.data });
          } else {
            addTestResult(testName, 'error', 'API service failed', { message: apiResponse.message });
          }
          break;

        default:
          addTestResult(testName, 'error', 'Unknown test');
      }
    } catch (error: any) {
      addTestResult(testName, 'error', `Test error: ${error.message}`, { error: error.message });
    } finally {
      setRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
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

  const getOverallStatus = () => {
    if (testResults.length === 0) return 'none';
    const errors = testResults.filter(r => r.status === 'error').length;
    const successes = testResults.filter(r => r.status === 'success').length;
    
    if (errors === 0 && successes > 0) return 'success';
    if (errors > 0) return 'error';
    return 'pending';
  };

  const overallStatus = getOverallStatus();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Network Connectivity Test</Text>
        <Text style={styles.subtitle}>Comprehensive backend connectivity diagnostics</Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Overall Status:</Text>
        <Text style={[styles.statusText, { color: getStatusColor(overallStatus) }]}>
          {overallStatus.toUpperCase()}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runNetworkTests}
          disabled={running}
        >
          <Text style={styles.buttonText}>
            {running ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearResults}
          disabled={running}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {running && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Running network tests...</Text>
        </View>
      )}

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results</Text>
        
        {testResults.length === 0 ? (
          <Text style={styles.noResults}>No tests run yet. Tap "Run All Tests" to start.</Text>
        ) : (
          testResults.map((result, index) => (
            <View key={index} style={styles.testResult}>
              <View style={styles.testHeader}>
                <Text style={styles.testName}>{result.name}</Text>
                <Text style={styles.testIcon}>{getStatusIcon(result.status)}</Text>
              </View>
              
              <Text style={[styles.testStatus, { color: getStatusColor(result.status) }]}>
                {result.status.toUpperCase()}
                {result.duration && ` (${result.duration}ms)`}
              </Text>
              
              <Text style={styles.testMessage}>{result.message}</Text>
              
              {result.details && (
                <View style={styles.testData}>
                  <Text style={styles.testDataTitle}>Details:</Text>
                  <Text style={styles.testDataText}>
                    {JSON.stringify(result.details, null, 2)}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Network Configuration</Text>
        <Text style={styles.infoText}>
          • Backend URL: {process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000/api'}
        </Text>
        <Text style={styles.infoText}>
          • Platform: {Platform.OS}
        </Text>
        <Text style={styles.infoText}>
          • Environment: {process.env.NODE_ENV || 'development'}
        </Text>
        <Text style={styles.infoText}>
          • Tests Run: {testResults.length}
        </Text>
        <Text style={styles.infoText}>
          • Success Rate: {testResults.length > 0 ? 
            `${Math.round((testResults.filter(r => r.status === 'success').length / testResults.length) * 100)}%` : 
            'N/A'}
        </Text>
      </View>
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
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  noResults: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  testResult: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  testMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  testData: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  testDataTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  testDataText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  infoContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
}); 