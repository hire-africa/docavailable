import Constants from 'expo-constants';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "AIzaSyAfRKBWJ8otf8VEo5nVZv5cG7qDX-t4ksc",
  authDomain: "doc-push.firebaseapp.com",
  projectId: "doc-push",
  storageBucket: "doc-push.firebasestorage.app",
  messagingSenderId: "327624693503",
  appId: "1:327624693503:android:c5161ae5476505b5861eca"
};

// Initialize Firebase only if not already initialized
let app;
if (getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
} else {
  app = getApps()[0];
}

// Initialize Firebase services with error handling
let auth, db, storage;

try {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log('✅ Firebase services initialized successfully');
} catch (error) {
  console.error('❌ Firebase services initialization failed:', error);
  // Create mock services for development
  auth = null;
  db = null;
  storage = null;
}

export { auth, db, storage };
export default app;
