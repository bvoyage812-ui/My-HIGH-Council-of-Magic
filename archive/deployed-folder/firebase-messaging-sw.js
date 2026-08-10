// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker using your project config
firebase.initializeApp({
  apiKey: "AIzaSyDFQffgGNgBWBEKQjyIz785RyZkmaeU02A",
  authDomain: "the-high-council-of-magic.firebaseapp.com",
  projectId: "the-high-council-of-magic",
  storageBucket: "the-high-council-of-magic.firebasestorage.app",
  messagingSenderId: "424950697983",
  appId: "1:424950697983:web:ca63a19d88a53dffab61ca",
  measurementId: "G-M7C7Z4XMFF"
});

// Retrieve an instance of Firebase Messaging for background messages
const messaging = firebase.messaging();