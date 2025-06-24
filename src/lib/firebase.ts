import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuración de Firebase para el proyecto anmlgym-e7c12
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, // Usa variable de entorno
  authDomain: "anmlgym-e7c12.firebaseapp.com",
  projectId: "anmlgym-e7c12",
  storageBucket: "anmlgym-e7c12.appspot.com", // Corregido a .appspot.com
  messagingSenderId: "764168606728",
  appId: "1:764168606728:web:be7ef15b41d797ff892dbd",
  measurementId: "G-S9THCYRLSX"
};

// Initialize Firebase
let app;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };