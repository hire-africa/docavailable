const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:8000/api';
const TEST_DOCTOR_EMAIL = 'doctor@test.com'; // Replace with actual test doctor email

async function testWalletIntegration() {
  console.log('🧪 Testing Wallet Integration...\n');

  try {
    // Step 1: Test wallet endpoint
    console.log('1️⃣ Testing wallet endpoint...');
    const walletResponse = await axios.get(`${BASE_URL}/doctor/wallet`, {
      headers: {
        'Authorization': 'Bearer YOUR_TEST_TOKEN', // You'll need to get a real token
        'Content-Type': 'application/json'
      }
    });

    if (walletResponse.data.success) {
      console.log('✅ Wallet endpoint working');
      console.log('   Balance:', walletResponse.data.data.balance);
      console.log('   Total Earned:', walletResponse.data.data.total_earned);
      console.log('   Total Withdrawn:', walletResponse.data.data.total_withdrawn);
      console.log('   Payment Rates:', walletResponse.data.data.payment_rates);
    } else {
      console.log('❌ Wallet endpoint failed:', walletResponse.data.message);
    }

    // Step 2: Test transactions endpoint
    console.log('\n2️⃣ Testing transactions endpoint...');
    const transactionsResponse = await axios.get(`${BASE_URL}/doctor/wallet/transactions?per_page=5`, {
      headers: {
        'Authorization': 'Bearer YOUR_TEST_TOKEN',
        'Content-Type': 'application/json'
      }
    });

    if (transactionsResponse.data.success) {
      console.log('✅ Transactions endpoint working');
      console.log('   Transaction count:', transactionsResponse.data.data.data?.length || 0);
    } else {
      console.log('❌ Transactions endpoint failed:', transactionsResponse.data.message);
    }

    // Step 3: Test payment rates endpoint
    console.log('\n3️⃣ Testing payment rates endpoint...');
    const ratesResponse = await axios.get(`${BASE_URL}/doctor/wallet/payment-rates`, {
      headers: {
        'Authorization': 'Bearer YOUR_TEST_TOKEN',
        'Content-Type': 'application/json'
      }
    });

    if (ratesResponse.data.success) {
      console.log('✅ Payment rates endpoint working');
      console.log('   Rates:', ratesResponse.data.data);
    } else {
      console.log('❌ Payment rates endpoint failed:', ratesResponse.data.message);
    }

    console.log('\n🎉 Wallet integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testWalletIntegration(); 