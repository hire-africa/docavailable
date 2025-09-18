import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import DatePickerField from './DatePickerField';

// Test component to verify DatePickerField behavior
export default function DatePickerFieldTest() {
  const [selectedDate, setSelectedDate] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    addTestResult(`Date selected: ${date}`);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DatePickerField Test</Text>
      
      <DatePickerField
        value={selectedDate}
        onChange={handleDateChange}
        label="Test Date Selection"
        minimumDate={new Date()}
      />
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>{result}</Text>
        ))}
      </View>
      
      <View style={styles.buttonContainer}>
        <Text 
          style={styles.clearButton} 
          onPress={clearResults}
        >
          Clear Results
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  clearButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
