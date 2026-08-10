import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmMDEiz19xrERkTlpzIlmgqyvFGx2_wXU",
  authDomain: "thcom-19588.firebaseapp.com",
  projectId: "thcom-19588",
  storageBucket: "thcom-19588.firebasestorage.app",
  messagingSenderId: "449792294690",
  appId: "1:449792294690:web:440c21509d56d70b35af7b",
  measurementId: "G-XNZY02WM7Z",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { app, auth, db, googleProvider };
