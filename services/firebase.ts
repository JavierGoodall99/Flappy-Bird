
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCx86-MYNXCogPgSwwKU12_1O4SYDr6k-E",
  authDomain: "fliply-dba75.firebaseapp.com",
  projectId: "fliply-dba75",
  storageBucket: "fliply-dba75.firebasestorage.app",
  messagingSenderId: "159256066060",
  appId: "1:159256066060:web:44e16618fbf7e7a1d89629",
  measurementId: "G-GGSVTZNBKV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
