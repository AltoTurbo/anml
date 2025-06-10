
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Asegúrate de que getAuth esté importado

// Configuración de Firebase proporcionada por el usuario
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAHGd_pSr0E1_CBz9n0J4cG0qZsKFWEom4",
  authDomain: "anmlgym-e7c12.firebaseapp.com",
  projectId: "anmlgym-e7c12",
  storageBucket: "anmlgym-e7c12.firebasestorage.app",
  messagingSenderId: "764168606728",
  appId: "1:764168606728:web:be7ef15b41d797ff892dbd",
  measurementId: "G-S9THCYRLSX"
};

let app;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app); // Inicializa y exporta auth

export { app, db, auth };
