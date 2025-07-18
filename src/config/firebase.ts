import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyApPmmL0e_ewgdwqKGv9Rp796i0pdY9Pg0",
  authDomain: "catimini-256a1.firebaseapp.com",
  projectId: "catimini-256a1",
  storageBucket: "catimini-256a1.firebasestorage.app",
  messagingSenderId: "426239063773",
  appId: "1:426239063773:web:eb996e6651a50b9ef48d34"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);