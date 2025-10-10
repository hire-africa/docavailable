// React Native Firebase configuration
// This file is specifically for React Native Firebase SDK
import { firebase } from '@react-native-firebase/app';

// React Native Firebase automatically reads from google-services.json
// No manual configuration needed - it uses the google-services.json file

// Export Firebase instance
export default firebase;

// Export specific services
export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const storage = firebase.storage();
export const messaging = firebase.messaging();
