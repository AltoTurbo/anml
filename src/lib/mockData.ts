
import { db } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, writeBatch, getDoc, setDoc, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import type { UserProfile } from '@/contexts/AuthContext'; // Importa UserProfile desde AuthContext

export interface ClassOffering {
  id: string; // Firestore document ID
  name: string;
  trainerId: string;
  trainerName: string;
  day: string;
  time: string;
  duration: string;
  capacity: number;
  booked: number;
  description: string;
  category: string;
}

export interface Trainer {
  id: string; // Debería coincidir con el UID de Firebase Auth del usuario entrenador
  name: string;
  email?: string; 
  specialty: string;
  bio: string;
  imageUrl?: string;
}

export interface Booking {
  id: string; // Firestore document ID
  userId: string; // UID del usuario de Firebase Auth
  classId: string;
  className?: string; 
  bookingDate: Timestamp | string; 
  status: 'confirmed' | 'cancelled';
}


// --- Funciones para Clases (Firestore) ---

export const getClassOfferingsFromDB = async (): Promise<ClassOffering[]> => {
  try {
    const classesCol = collection(db, 'classes');
    const classSnapshot = await getDocs(classesCol);
    const classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassOffering));
    return classList;
  } catch (error) {
    console.error("Error obteniendo clases de Firestore: ", error);
    return [];
  }
};

export const addClassToDB = async (classData: Omit<ClassOffering, 'id' | 'booked'>): Promise<ClassOffering | null> => {
  try {
    const newClassData = { ...classData, booked: 0 };
    const docRef = await addDoc(collection(db, 'classes'), newClassData);
    return { id: docRef.id, ...newClassData };
  } catch (error) {
    console.error("Error añadiendo clase a Firestore: ", error);
    return null;
  }
};

export const updateClassInDB = async (classId: string, classData: Partial<Omit<ClassOffering, 'id'>>): Promise<boolean> => {
  try {
    const classDoc = doc(db, 'classes', classId);
    await updateDoc(classDoc, classData);
    return true;
  } catch (error) {
    console.error("Error actualizando clase en Firestore: ", error);
    return false;
  }
};

export const deleteClassFromDB = async (classId: string): Promise<boolean> => {
  try {
    // Buscar todas las reservas asociadas a esta clase, independientemente de su estado.
    const bookingsQuery = query(collection(db, "bookings"), where("classId", "==", classId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    
    const batch = writeBatch(db);

    // Añadir operación de borrado para cada reserva encontrada
    bookingsSnapshot.forEach(bookingDoc => {
        batch.delete(bookingDoc.ref);
    });
    
    // Añadir operación de borrado para la clase misma
    const classDocRef = doc(db, 'classes', classId);
    batch.delete(classDocRef);
    
    await batch.commit();
    console.log(`Clase ${classId} y sus ${bookingsSnapshot.size} reservas asociadas han sido eliminadas.`);
    return true;
  } catch (error) {
    console.error("Error eliminando clase y sus reservas de Firestore: ", error);
    return false;
  }
};


// --- Funciones para Reservas (Firestore) ---

export const addBookingToDB = async (userId: string, classItem: ClassOffering): Promise<Booking | null> => {
  const batch = writeBatch(db);
  try {
    const newBookingData = {
      userId: userId, 
      classId: classItem.id,
      className: classItem.name,
      bookingDate: serverTimestamp(),
      status: 'confirmed' as const
    };

    const existingBookingQuery = query(
      collection(db, 'bookings'),
      where('userId', '==', userId),
      where('classId', '==', classItem.id),
      where('status', '==', 'confirmed'),
      limit(1) // Solo necesitamos saber si existe al menos una
    );
    const existingBookingSnapshot = await getDocs(existingBookingQuery);
    if (!existingBookingSnapshot.empty) {
      console.warn("El usuario ya tiene una reserva confirmada para esta clase.");
      return null; 
    }

    const bookingDocRef = doc(collection(db, 'bookings'));
    batch.set(bookingDocRef, newBookingData);

    const classDocRef = doc(db, 'classes', classItem.id);
    batch.update(classDocRef, { booked: classItem.booked + 1 });

    await batch.commit();
    
    // Para la respuesta, simulamos el timestamp como string ISO, ya que serverTimestamp() aún no se ha resuelto en el cliente.
    const bookingDateForResponse = new Date().toISOString();
    return { id: bookingDocRef.id, ...newBookingData, bookingDate: bookingDateForResponse } as Booking;

  } catch (error) {
    console.error("Error añadiendo reserva a Firestore: ", error);
    return null;
  }
};

export const getBookingsForUserFromDB = async (userId: string): Promise<Booking[]> => {
  try {
    const bookingsCol = collection(db, 'bookings');
    // Obtener solo las reservas confirmadas para mostrar al usuario
    const q = query(bookingsCol, where('userId', '==', userId), where('status', '==', 'confirmed'));
    const bookingSnapshot = await getDocs(q);
    const bookingList = bookingSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        bookingDate: data.bookingDate instanceof Timestamp ? data.bookingDate.toDate().toISOString() : data.bookingDate
      } as Booking;
    });
    // Ordenar por fecha de reserva, las más recientes primero
    return bookingList.sort((a, b) =>
      new Date(b.bookingDate as string).getTime() - new Date(a.bookingDate as string).getTime()
    );
  } catch (error) {
    console.error("Error obteniendo reservas de Firestore para el usuario: ", error);
    return [];
  }
};

export const cancelBookingInDB = async (bookingId: string, classId: string): Promise<boolean> => {
  const batch = writeBatch(db);
  try {
    const bookingDocRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingDocRef); 

    if (bookingSnap.exists() && bookingSnap.data().status === 'confirmed') {
        batch.update(bookingDocRef, { status: 'cancelled' });

        const classDocRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classDocRef);
        if (classSnap.exists()) {
          const currentBooked = classSnap.data().booked || 0;
          if (currentBooked > 0) {
            batch.update(classDocRef, { booked: currentBooked - 1 });
          }
        }
        await batch.commit();
        return true;
    } else {
        console.warn("La reserva no existe o ya está cancelada.");
        return false;
    }
  } catch (error) {
    console.error("Error cancelando reserva en Firestore: ", error);
    return false;
  }
};

// --- Tipos de clases para el generador de IA y el formulario de clases ---
export const availableClassTypesForAI = ["Yoga", "HIIT", "Fuerza", "Pilates", "Bootcamp", "Cardio", "Danza", "Boxeo"];


// --- Funciones para perfiles de usuario (se usan en AuthContext y TrainerDashboard) ---
export const getUserProfileFromDB = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo perfil de usuario de Firestore: ", error);
    return null;
  }
};

export const saveUserProfileToDB = async (userData: UserProfile): Promise<boolean> => {
  try {
    const userDocRef = doc(db, 'users', userData.id);
    const dataToSave: any = { ...userData };

    // Manejar createdAt
    if (!dataToSave.createdAt) {
      dataToSave.createdAt = serverTimestamp();
    } else if (typeof dataToSave.createdAt === 'string') {
      dataToSave.createdAt = Timestamp.fromDate(new Date(dataToSave.createdAt));
    } // Si ya es Timestamp, se queda como está

    // Asegurar que los campos opcionales que podrían ser undefined no se guarden si no tienen valor
    // Firestore los omite automáticamente si el valor es undefined
    if (dataToSave.specialty === undefined) delete dataToSave.specialty;
    if (dataToSave.bio === undefined) delete dataToSave.bio;
    if (dataToSave.imageUrl === undefined) delete dataToSave.imageUrl;
    if (dataToSave.paymentStatus === undefined) delete dataToSave.paymentStatus;
    if (dataToSave.paymentDueDate === undefined) delete dataToSave.paymentDueDate;
    
    await setDoc(userDocRef, dataToSave , { merge: true });
    return true;
  } catch (error) {
    console.error("Error guardando perfil de usuario en Firestore: ", error);
    return false;
  }
};
