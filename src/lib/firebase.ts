// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAca9lZqKvoaU6jZYmJKKdaU099xAi3MXE",
  authDomain: "textiles-d3173.firebaseapp.com",
  projectId: "textiles-d3173",
  storageBucket: "textiles-d3173.firebasestorage.app",
  messagingSenderId: "886790672479",
  appId: "1:886790672479:web:0a915cc1e12d0beff84bea",
  measurementId: "G-6L5XCEH7SW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export default app;