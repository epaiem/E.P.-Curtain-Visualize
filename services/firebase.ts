import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALxRIUCDDKIjYD-IZNaIdJmSwvEw82Xkc",
  authDomain: "ep-curtain-auth.firebaseapp.com",
  projectId: "ep-curtain-auth",
  storageBucket: "ep-curtain-auth.firebasestorage.app",
  messagingSenderId: "232941057746",
  appId: "1:232941057746:web:0e3ce64e128430fe94df0b",
  measurementId: "G-1H90M2W201"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const analytics = getAnalytics(app);
