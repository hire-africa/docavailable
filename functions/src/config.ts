import * as admin from 'firebase-admin';

// Server-side Firebase configuration
export const initializeFirebaseAdmin = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
  }
  return admin;
};

// Server-side services
export const getFirestoreAdmin = () => {
  const admin = initializeFirebaseAdmin();
  return admin.firestore();
};

export const getAuthAdmin = () => {
  const admin = initializeFirebaseAdmin();
  return admin.auth();
};

// Environment variables validation
export const validateEnvironment = () => {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}; 