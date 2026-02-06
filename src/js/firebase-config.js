/**
 * Firebase Configuration
 * Initializes Firebase app and services for Moodeng Tech
 */

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvABerx0w5JK6BAPb9fxi2rIlhprO_DY4",
  authDomain: "moodengtech-572db.firebaseapp.com",
  projectId: "moodengtech-572db",
  storageBucket: "moodengtech-572db.firebasestorage.app",
  messagingSenderId: "76250738376",
  appId: "1:76250738376:web:a6f87104a4b0052207fffd",
  measurementId: "G-Z2144GQR29"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Analytics
const analytics = firebase.analytics();

// Make Firebase services available globally
window.firebaseApp = firebase.app();
window.firebaseAnalytics = analytics;

console.log('Firebase initialized successfully');
