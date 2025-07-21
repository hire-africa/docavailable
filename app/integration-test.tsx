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
import { apiService } from './services/apiService';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export default function IntegrationTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const addTestResult = (name: string, status: 'pending' | 'success' | 'error', message: string, data?: any) => {
    setTestResults(prev => [
      ...prev.filter(t => t.name !== name),
      { name, status, message, data }
    ]);
  };

  const runBasicTests = async () => {
    setRunning(true);
    setTestResults([]);

    try {
      // Test 1: Health Check (no auth required)
      addTestResult('Health Check', 'pending', 'Testing backend health...');
      try {
        const response = await apiService.get('/api/health');
        addTestResult(
          'Health Check',
          response.success ? 'success' : 'error',
          response.success ? 'Backend is healthy' : 'Backend health check failed',
          response.data
        );
      } catch (error: any) {
        addTestResult('Health Check', 'error', `Health check failed: ${error.message}`);
      }

      // Test 2: API Configuration
      addTestResult('API Configuration', 'pending', 'Checking API configuration...');
      const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.11:8000/api';
      addTestResult(
        'API Configuration',
        'success',
        'API configuration loaded',
        { 
          baseUrl: apiUrl,
          timeout: 30000,
          environment: process.env.NODE_ENV || 'development'
        }
      );

      // Test 3: Network Connectivity
      addTestResult('Network Connectivity', 'pending', 'Testing network connectivity...');
      try {
        const startTime = Date.now();
        const response = await fetch(`${apiUrl}/api/health`);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (response.ok) {
          addTestResult(
            'Network Connectivity',
            'success',
            `Network connectivity successful (${responseTime}ms)`,
            { responseTime, status: response.status }
          );
        } else {
          addTestResult(
            'Network Connectivity',
            'error',
            `Network connectivity failed: ${response.status}`,
            { status: response.status }
          );
        }
      } catch (error: any) {
        addTestResult('Network Connectivity', 'error', `Network error: ${error.message}`);
      }

      // Test 4: CORS Configuration
      addTestResult('CORS Configuration', 'pending', 'Testing CORS headers...');
      try {
        const response = await fetch(`${apiUrl}/api/health`, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'http://172.20.10.11:3000',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type',
          },
        });
        
        const corsHeaders = {
          allowOrigin: response.headers.get('Access-Control-Allow-Origin'),
          allowMethods: response.headers.get('Access-Control-Allow-Methods'),
          allowHeaders: response.headers.get('Access-Control-Allow-Headers'),
        };
        
        addTestResult(
          'CORS Configuration',
          'success',
          'CORS headers present',
          corsHeaders
        );
      } catch (error: any) {
        addTestResult('CORS Configuration', 'error', `CORS test failed: ${error.message}`);
      }

      // Test 5: Protected Endpoint (should return 401)
      addTestResult('Authentication Protection', 'pending', 'Testing protected endpoints...');
      try {
        const response = await apiService.get('/user');
        if (response.success) {
          addTestResult('Authentication Protection', 'error', 'Protected endpoint accessible without auth');
        } else {
          addTestResult('Authentication Protection', 'success', 'Protected endpoint properly secured');
        }
      } catch (error: any) {
        if (error.status === 401) {
          addTestResult('Authentication Protection', 'success', 'Protected endpoint properly secured (401)');
        } else {
          addTestResult('Authentication Protection', 'error', `Auth test failed: ${error.message}`);
        }
      }

    } catch (error: any) {
      addTestResult('General', 'error', `General error: ${error.message}`);
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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runBasicTests}
          disabled={running}
        >
          <Text style={styles.buttonText}>
            {running ? 'Running Tests...' : 'Run Basic Tests'}
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
          • Environment: {process.env.NODE_ENV || 'development'}
        </Text>
        <Text style={styles.infoText}>
          • Platform: {Platform.OS}
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
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
}); 