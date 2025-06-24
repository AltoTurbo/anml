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
import { saveUserProfileToDB, getUserProfileFromDB } from '@/lib/firestore';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'trainer' | 'admin';
  createdAt?: Timestamp;
  specialty?: string;
  bio?: string;
  imageUrl?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'pending';
  paymentDueDate?: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  registerUser: (
    email: string,
    password: string,
    name: string,
    phone: string,
    redirectPath?: string
  ) => Promise<void>;
  loginUser: (
    email: string,
    password: string,
    redirectPath?: string
  ) => Promise<void>;
  logoutUser: () => Promise<void>;
  updateUserProfileDetails: (
    details: Partial<Pick<UserProfile, 'name' | 'specialty' | 'bio' | 'phone'>>
  ) => Promise<void>;
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
        setUserProfile(profile || null);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const registerUser = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    redirectPath?: string
  ) => {
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
        phone,
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
        toast({ title: "Registro Exitoso", description: `¡Bienvenido/a, ${name}!` });
        router.push(redirectPath ?? '/schedule');
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
        errorMessage = "Este correo ya está en uso.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      toast({ title: "Error de Registro", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (
    email: string,
    password: string,
    redirectPath?: string
  ) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const profile = await getUserProfileFromDB(firebaseUser.uid);
      if (profile) {
        setUserProfile(profile);
        toast({ title: "Inicio de Sesión Exitoso", description: `¡Bienvenido/a de nuevo, ${profile.name}!` });
        const defaultPath = profile.role === 'admin' || profile.role === 'trainer'
          ? '/trainer-dashboard'
          : '/schedule';
        router.push(redirectPath ?? defaultPath);
      } else {
        toast({
          title: "Error de Perfil",
          description: "No se pudo cargar tu perfil. Intenta de nuevo.",
          variant: "destructive"
        });
        setCurrentUser(firebaseUser);
      }
    } catch (error: any) {
      let errorMessage = "Ocurrió un error al iniciar sesión.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Correo o contraseña incorrectos.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      toast({ title: "Error de Inicio de Sesión", description: errorMessage, variant: "destructive" });
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

  const updateUserProfileDetails = async (
    details: Partial<Pick<UserProfile, 'name' | 'specialty' | 'bio' | 'phone'>>
  ) => {
    if (currentUser && userProfile) {
      setLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, details);
        setUserProfile(prev => prev ? { ...prev, ...details } : null);
        toast({ title: "Perfil Actualizado", description: "Tus detalles han sido actualizados." });
      } catch (error) {
        console.error("Error actualizando perfil:", error);
        toast({ title: "Error", description: "No se pudo actualizar tu perfil.", variant: "destructive" });
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
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
