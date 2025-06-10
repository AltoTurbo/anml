"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveUserProfileToDB, getUserProfileFromDB } from '@/lib/mockData';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'trainer' | 'admin';
  createdAt?: Timestamp;
  specialty?: string;
  bio?: string;
  imageUrl?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'pending';
  paymentDueDate?: string; // Formato YYYY-MM-DD
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  registerUser: (email: string, password: string, name: string) => Promise<void>;
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  updateUserProfileDetails: (details: Partial<Pick<UserProfile, 'name' | 'specialty' | 'bio'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        const profile = await getUserProfileFromDB(firebaseUser.uid);
        if (profile) {
          setUserProfile(profile);
        } else {
          setUserProfile(null);
          console.warn(`Perfil no encontrado en Firestore para el UID: ${firebaseUser.uid}`);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const registerUser = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const newUserProfileData: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        name,
        role: 'client',
        createdAt: serverTimestamp() as Timestamp,
        bio: "Dedicado/a a ayudarte a alcanzar tus metas de fitness.",
        specialty: "Entrenador/a Certificado/a",
        paymentStatus: 'pending',
        paymentDueDate: dueDate.toISOString().split('T')[0],
      };

      const profileSaved = await saveUserProfileToDB(newUserProfileData);

      if (profileSaved) {
        setUserProfile(newUserProfileData);
        toast({
          title: "Registro Exitoso",
          description: `¡Bienvenido/a, ${name}! Tu cuenta ha sido creada.`,
        });

        const searchParams = new URLSearchParams(window.location.search);
        const redirectPath = searchParams.get('redirect') || '/schedule';
        router.push(redirectPath);

      } else {
        toast({
          title: "Error de Registro",
          description: "Tu cuenta fue creada pero hubo un problema al guardar tu perfil.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      let errorMessage = "Ocurrió un error durante el registro.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este correo electrónico ya está en uso.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña es demasiado débil.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      toast({ title: "Error de Registro", description: errorMessage, variant: "destructive" });
      console.warn("Error de Firebase Auth durante el registro:", error);
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const profile = await getUserProfileFromDB(firebaseUser.uid);
      if (profile) {
        setUserProfile(profile);
        toast({
          title: "Inicio de Sesión Exitoso",
          description: `¡Bienvenido/a de nuevo, ${profile.name}!`,
        });

        const searchParams = new URLSearchParams(window.location.search);
        const redirectPath = searchParams.get('redirect') || 
          (profile.role === 'admin' || profile.role === 'trainer' ? '/trainer-dashboard' : '/schedule');
        router.push(redirectPath);

      } else {
        toast({
          title: "Error de Perfil",
          description: "No se pudo cargar tu perfil. Intenta de nuevo o contacta a soporte.",
          variant: "destructive"
        });
        console.warn(`Perfil no encontrado para UID ${firebaseUser.uid}`);
      }
    } catch (error: any) {
      let errorMessage = "Ocurrió un error al iniciar sesión.";
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/invalid-email'
      ) {
        errorMessage = "Correo electrónico o contraseña incorrectos.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      toast({ title: "Error de Inicio de Sesión", description: errorMessage, variant: "destructive" });
      console.warn("Error de Firebase Auth durante el login:", error);
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      router.push('/login');
      toast({ title: "Sesión Cerrada", description: "Has cerrado sesión exitosamente." });
    } catch (error: any) {
      console.error("Error al cerrar sesión:", error);
      toast({ title: "Error", description: "No se pudo cerrar sesión.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfileDetails = async (details: Partial<Pick<UserProfile, 'name' | 'specialty' | 'bio'>>) => {
    if (currentUser && userProfile) {
      setLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, details);
        setUserProfile(prev => prev ? { ...prev, ...details } : null);
        toast({ title: "Perfil Actualizado", description: "Tus detalles han sido actualizados." });
      } catch (error) {
        console.error("Error actualizando perfil:", error);
        toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  const isAuthenticated = !!currentUser;

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      isAuthenticated,
      registerUser,
      loginUser,
      logoutUser,
      updateUserProfileDetails
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};
