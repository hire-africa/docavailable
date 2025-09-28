#!/usr/bin/env node

/**
 * Test script for call availability functionality
 * This script tests the new call-sessions API endpoints
 */

const axios = require('axios');

const API_BASE_URL = 'https://docavailable-3vbdv.ondigitalocean.app';

async function testCallAvailability() {
  console.log('🧪 Testing Call Availability API Endpoints');
  console.log('==========================================\n');

  try {
    // Test 1: Check if endpoints exist (should return 401 without auth)
    console.log('1️⃣ Testing endpoint availability...');
    
    const testEndpoints = [
      '/api/call-sessions/check-availability',
      '/api/call-sessions/start',
      '/api/call-sessions/end',
      '/api/call-sessions/deduction'
    ];

    for (const endpoint of testEndpoints) {
      try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
          call_type: 'voice'
        }, {
          timeout: 10000,
          validateStatus: () => true // Don't throw on any status
        });
        
        if (response.status === 401) {
          console.log(`✅ ${endpoint} - Endpoint exists (401 Unauthorized expected)`);
        } else if (response.status === 404) {
          console.log(`❌ ${endpoint} - Endpoint not found (404)`);
        } else {
          console.log(`⚠️  ${endpoint} - Unexpected status: ${response.status}`);
        }
      } catch (error) {
        if (error.code === 'ENOTFOUND' || error.message.includes('Network Error')) {
          console.log(`❌ ${endpoint} - Network error: ${error.message}`);
        } else {
          console.log(`❌ ${endpoint} - Error: ${error.message}`);
        }
      }
    }

    console.log('\n2️⃣ Testing with invalid auth token...');
    
    // Test with invalid token
    try {
      const response = await axios.post(`${API_BASE_URL}/api/call-sessions/check-availability`, {
        call_type: 'voice'
      }, {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (response.status === 401) {
        console.log('✅ Authentication working correctly (401 with invalid token)');
      } else {
        console.log(`⚠️  Unexpected response with invalid token: ${response.status}`);
        console.log('Response:', response.data);
      }
    } catch (error) {
      console.log(`❌ Error testing with invalid token: ${error.message}`);
    }

    console.log('\n3️⃣ Testing request validation...');
    
    // Test with missing call_type
    try {
      const response = await axios.post(`${API_BASE_URL}/api/call-sessions/check-availability`, {}, {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (response.status === 400) {
        console.log('✅ Request validation working (400 for missing call_type)');
      } else {
        console.log(`⚠️  Unexpected response for missing call_type: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error testing request validation: ${error.message}`);
    }

    // Test with invalid call_type
    try {
      const response = await axios.post(`${API_BASE_URL}/api/call-sessions/check-availability`, {
        call_type: 'invalid'
      }, {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (response.status === 400) {
        console.log('✅ Call type validation working (400 for invalid call_type)');
      } else {
        console.log(`⚠️  Unexpected response for invalid call_type: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error testing call type validation: ${error.message}`);
    }

    console.log('\n✅ Call availability API test completed!');
    console.log('\n📋 Summary:');
    console.log('- All endpoints should return 401 (Unauthorized) without valid auth');
    console.log('- Request validation should return 400 (Bad Request) for invalid data');
    console.log('- If you see 404 errors, the endpoints are not deployed yet');
    console.log('- If you see network errors, check your internet connection');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testCallAvailability().catch(console.error);
