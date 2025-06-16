
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Asegúrate de que getAuth esté importado

// Configuración de Firebase para el proyecto anmlgym-e7c12
// !! IMPORTANTE !!
// El usuario ha indicado que el projectId correcto es 'anmlgym-e7c12'.
// Asegúrate de que TODOS estos valores coincidan EXACTAMENTE con la configuración de tu
// aplicación web en la Consola de Firebase para el proyecto 'anmlgym-e7c12'.
// Puedes encontrar esta configuración en:
// Consola de Firebase -> Proyecto 'anmlgym-e7c12' -> Configuración del proyecto (ícono de engranaje) -> Tus apps -> SDK de Firebase (selecciona CDN o Config).
//
// El error "auth/configuration-not-found" generalmente significa que:
// 1. Firebase Authentication NO ESTÁ HABILITADO en la consola para este proyecto ('anmlgym-e7c12').
//    Ve a Authentication -> Comenzar y habilítalo.
// 2. NINGÚN PROVEEDOR DE INICIO DE SESIÓN (ej. Email/Contraseña) está habilitado para 'anmlgym-e7c12'.
//    Ve a Authentication -> Sign-in method y habilita "Email/Contraseña".
// 3. Los valores de apiKey, messagingSenderId, appId, etc., no son los correctos para este proyecto.

const firebaseConfig: FirebaseOptions = {
  apiKey: [REDACTED_API_KEY]" ", // VERIFICA que esta API Key sea la correcta para 'anmlgym-e7c12'
  authDomain: "anmlgym-e7c12.firebaseapp.com", // Derivado del projectId 'anmlgym-e7c12'
  projectId: "anmlgym-e7c12", // Este es el projectId que indicaste es el correcto
  storageBucket: "anmlgym-e7c12.appspot.com", // Corregido a .appspot.com. VERIFICA
  messagingSenderId: "764168606728", // VERIFICA este valor desde la consola de Firebase para 'anmlgym-e7c12'
  appId: "1:764168606728:web:be7ef15b41d797ff892dbd", // VERIFICA este valor desde la consola de Firebase para 'anmlgym-e7c12'
  measurementId: "G-S9THCYRLSX" // VERIFICA este valor (opcional) desde la consola de Firebase para 'anmlgym-e7c12'
};

// Initialize Firebase
let app;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app); // Inicializa y exporta auth

export { app, db, auth };
