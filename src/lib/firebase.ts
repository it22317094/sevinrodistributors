// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBzTDTD2YN19kyE_BM-and62V2heGZbK5k",
  authDomain: "sevinro-distributors.firebaseapp.com",
  projectId: "sevinro-distributors",
  storageBucket: "sevinro-distributors.firebasestorage.app",
  messagingSenderId: "16376436724",
  appId: "1:16376436724:web:deb83d6182bd0db2778ba1",
  measurementId: "G-BYCTGFEY9V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;