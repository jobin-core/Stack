import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Web app's Firebase configuration loaded from environment variables with fallback defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAPM0Te7XiSTjJzSEo-NFWloMQ614FO6e4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "stack-6a17c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "stack-6a17c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "stack-6a17c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "184273859749",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:184273859749:web:5816b202687137c5a1c94c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0TSRWNVBZG"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();


// Initialize Analytics conditionally
export let analytics: any = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

