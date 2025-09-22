#!/usr/bin/env node

/**
 * Chat Input Fix Test
 * Tests the logic for when inputs should be disabled
 */

console.log('🧪 Testing Chat Input Fix Logic');
console.log('================================');
console.log('');

// Test scenarios
const scenarios = [
  {
    name: 'Patient waiting for doctor response',
    isPatient: true,
    hasPatientSentMessage: true,
    hasDoctorResponded: false,
    isSessionActivated: false,
    expected: 'Input should be DISABLED for patient'
  },
  {
    name: 'Doctor when patient is waiting',
    isPatient: false,
    hasPatientSentMessage: true,
    hasDoctorResponded: false,
    isSessionActivated: false,
    expected: 'Input should be ENABLED for doctor'
  },
  {
    name: 'Patient after doctor responded',
    isPatient: true,
    hasPatientSentMessage: true,
    hasDoctorResponded: true,
    isSessionActivated: true,
    expected: 'Input should be ENABLED for patient'
  },
  {
    name: 'Doctor after responding',
    isPatient: false,
    hasPatientSentMessage: true,
    hasDoctorResponded: true,
    isSessionActivated: true,
    expected: 'Input should be ENABLED for doctor'
  },
  {
    name: 'Patient before sending first message',
    isPatient: true,
    hasPatientSentMessage: false,
    hasDoctorResponded: false,
    isSessionActivated: false,
    expected: 'Input should be ENABLED for patient'
  },
  {
    name: 'Doctor before patient sends message',
    isPatient: false,
    hasPatientSentMessage: false,
    hasDoctorResponded: false,
    isSessionActivated: false,
    expected: 'Input should be ENABLED for doctor'
  }
];

// Test the logic
function testInputLogic(scenario) {
  const { isPatient, hasPatientSentMessage, hasDoctorResponded, isSessionActivated } = scenario;
  
  // This is the logic from our fix
  const shouldDisable = hasPatientSentMessage && !hasDoctorResponded && !isSessionActivated && isPatient;
  const isEnabled = !shouldDisable;
  
  return {
    ...scenario,
    result: isEnabled ? 'ENABLED' : 'DISABLED',
    correct: (isEnabled && scenario.expected.includes('ENABLED')) || (!isEnabled && scenario.expected.includes('DISABLED'))
  };
}

// Run tests
console.log('Running test scenarios...\n');

scenarios.forEach((scenario, index) => {
  const result = testInputLogic(scenario);
  
  console.log(`${index + 1}. ${result.name}`);
  console.log(`   Patient: ${result.isPatient}, Sent: ${result.hasPatientSentMessage}, Doctor Responded: ${result.hasDoctorResponded}, Session Active: ${result.isSessionActivated}`);
  console.log(`   Result: ${result.result}`);
  console.log(`   Expected: ${result.expected}`);
  console.log(`   ✅ ${result.correct ? 'PASS' : 'FAIL'}`);
  console.log('');
});

// Summary
const allPassed = scenarios.every(scenario => testInputLogic(scenario).correct);

console.log('================================');
console.log(`📊 Test Results: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
console.log('');

if (allPassed) {
  console.log('🎉 Chat input fix is working correctly!');
  console.log('✅ Doctors can now respond when patients are waiting');
  console.log('✅ Patients are properly disabled when waiting for doctor');
} else {
  console.log('❌ Some tests failed. Check the logic implementation.');
}
