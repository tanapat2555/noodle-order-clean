// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Config จาก Firebase Console ของคุณ
const firebaseConfig = {
  apiKey: "AIzaSyBHQWllWxdqZ5PHoCLpmd1TH7YQs1I4E50",
  authDomain: "noodle-order-fd44a.firebaseapp.com",
  projectId: "noodle-order-fd44a",
  storageBucket: "noodle-order-fd44a.firebasestorage.app",
  messagingSenderId: "96969347849",
  appId: "1:96969347849:web:0a3fd70a8a5f80f54679d8",
  measurementId: "G-10T4VE6KKG"
};

// เริ่มต้น Firebase
const app = initializeApp(firebaseConfig);

// Export service ที่จะใช้
export const db = getFirestore(app);     // Firestore Database
export const auth = getAuth(app);        // Authentication (ถ้าจะทำ login)
export const storage = getStorage(app);  // Storage (เก็บรูปเมนู)

export default app;
