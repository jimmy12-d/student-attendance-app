// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // If you need authentication for admins

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlUIZfsrgVvfw4fL2poyITh0bfM9Iumag",
  authDomain: "rodwell-attendance.firebaseapp.com",
  projectId: "rodwell-attendance",
  storageBucket: "rodwell-attendance.firebasestorage.app",
  messagingSenderId: "50079853705",
  appId: "1:50079853705:web:5e9d3dcb42b4d0d874aa58"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firestore
const db = getFirestore(app);
// Initialize Firebase Authentication (optional, but recommended for admin)
const auth = getAuth(app);

export { db, auth }; // Export db and auth