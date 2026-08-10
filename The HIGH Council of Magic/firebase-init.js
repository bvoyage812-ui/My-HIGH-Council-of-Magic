// Import the functions you need from the SDKs you need
// Import from CDN URLs directly so the browser can resolve them
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFQffgGNgBWBEKQjyIz785RyZkmaeU02A",
  authDomain: "the-high-council-of-magic.firebaseapp.com",
  projectId: "the-high-council-of-magic",
  storageBucket: "the-high-council-of-magic.firebasestorage.app",
  messagingSenderId: "424950697983",
  appId: "1:424950697983:web:ca63a19d88a53dffab61ca",
  measurementId: "G-M7C7Z4XMFF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize and export the services your app expects
export const db = getFirestore(app);
export const messaging = getMessaging(app);

// Add your Web Push VAPID key here if you use push notifications
export const VAPID_KEY = "BCvjdsAGOjTsTLx2ejFrRSOlpk5b2CKLYyn50n94Go4X_ss3dpaTgDWbkDJQxuPuAu9zzjuZq7wQleHBOepJSHw";