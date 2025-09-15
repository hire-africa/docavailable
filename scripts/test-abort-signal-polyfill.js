// Test script to verify AbortSignal.timeout polyfill works correctly

// Polyfill for AbortSignal.timeout for environments that don't support it
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function timeout(ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

console.log('🧪 Testing AbortSignal.timeout polyfill...\n');

// Test 1: Check if AbortSignal.timeout exists
console.log('Test 1: Checking if AbortSignal.timeout exists...');
if (AbortSignal.timeout) {
  console.log('✅ AbortSignal.timeout is available');
} else {
  console.log('❌ AbortSignal.timeout is not available');
  process.exit(1);
}

// Test 2: Test timeout functionality
console.log('\nTest 2: Testing timeout functionality...');
try {
  const signal = AbortSignal.timeout(1000); // 1 second timeout
  console.log('✅ AbortSignal.timeout() created successfully');
  
  // Check if signal is an AbortSignal
  if (signal instanceof AbortSignal) {
    console.log('✅ Signal is an instance of AbortSignal');
  } else {
    console.log('❌ Signal is not an instance of AbortSignal');
  }
  
  // Check if signal is not aborted initially
  if (!signal.aborted) {
    console.log('✅ Signal is not aborted initially');
  } else {
    console.log('❌ Signal is aborted initially');
  }
  
} catch (error) {
  console.log(`❌ Error creating timeout signal: ${error.message}`);
  process.exit(1);
}

// Test 3: Test actual timeout behavior
console.log('\nTest 3: Testing actual timeout behavior...');
const signal = AbortSignal.timeout(2000); // 2 second timeout

// Add event listener
signal.addEventListener('abort', () => {
  console.log('✅ Signal was aborted after timeout');
});

// Wait for timeout
setTimeout(() => {
  if (signal.aborted) {
    console.log('✅ Signal is aborted after 2 seconds');
  } else {
    console.log('❌ Signal is not aborted after 2 seconds');
  }
}, 2500);

// Test 4: Test with fetch (simulated)
console.log('\nTest 4: Testing with simulated fetch...');
const fetchSignal = AbortSignal.timeout(1000);

// Simulate a fetch operation
const simulateFetch = async () => {
  try {
    // Simulate a long-running operation
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 2000); // 2 seconds
      
      fetchSignal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Request aborted'));
      });
    });
    
    console.log('❌ Fetch should have been aborted');
  } catch (error) {
    if (error.message === 'Request aborted') {
      console.log('✅ Fetch was correctly aborted by timeout');
    } else {
      console.log(`❌ Unexpected error: ${error.message}`);
    }
  }
};

simulateFetch();

// Wait for all tests to complete
setTimeout(() => {
  console.log('\n🎉 All AbortSignal.timeout polyfill tests completed!');
  process.exit(0);
}, 5000);
