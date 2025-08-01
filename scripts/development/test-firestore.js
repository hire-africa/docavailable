// Test script to verify Firestore connectivity
// Run this in the browser console to test if Firestore is accessible

const testFirestore = async () => {
  try {
    console.log('Testing Firestore connectivity...');
    
    // Test basic read operation
    const testDoc = await getDoc(doc(db, 'test', 'test'));
    console.log('✅ Firestore read test: PASSED');
    
    // Test write operation (will fail if rules are too restrictive)
    try {
      await setDoc(doc(db, 'test', 'test'), { timestamp: new Date() });
      console.log('✅ Firestore write test: PASSED');
    } catch (writeError) {
      console.log('❌ Firestore write test: FAILED');
      console.log('Error:', writeError.code, writeError.message);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Firestore connectivity test: FAILED');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.log('🔧 SOLUTION: Update Firestore security rules');
      console.log('Go to Firebase Console > Firestore Database > Rules');
      console.log('Add this rule: allow read, write: if request.auth != null;');
    } else if (error.code === 'unavailable') {
      console.log('🔧 SOLUTION: Check network connection');
    } else if (error.code === 'unauthenticated') {
      console.log('🔧 SOLUTION: User not authenticated');
    }
    
    return false;
  }
};

// Run the test
testFirestore(); 