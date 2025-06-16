
import { db } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, writeBatch, getDoc, setDoc, serverTimestamp, Timestamp, limit, orderBy, runTransaction } from 'firebase/firestore';
import type { UserProfile } from '@/contexts/AuthContext';
import { format } from 'date-fns';

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
  id: string;
  name: string;
  email?: string;
  specialty: string;
  bio: string;
  imageUrl?: string;
}

export interface Booking {
  id: string;
  userId: string;
  classId: string;
  className?: string;
  bookingDate: Timestamp | string;
  status: 'confirmed' | 'cancelled';
}

export interface Product {
  id: string; // Firestore document ID
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  imageUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CashTransaction {
  id: string; // Firestore document ID
  type: 'income' | 'expense'; // Ingreso o Egreso
  amount: number;
  description: string;
  date: Timestamp; // Fecha y hora de la transacción
  recordedByUserId: string; // UID del admin/trainer que registró
  recordedByUserName?: string; // Nombre del admin/trainer
  relatedSaleId?: string; // Opcional, si es un ingreso por venta de producto
  relatedMembershipPaymentId?: string; // Opcional, si es un ingreso por pago de cuota
}

export interface MembershipPayment {
  id: string; // Firestore document ID
  userId: string; // UID del cliente que pagó
  userName?: string; // Nombre del cliente
  amountPaid: number;
  paymentDate: Timestamp; // Fecha y hora del pago
  newPaymentDueDate: string; // Nueva fecha de vencimiento en formato YYYY-MM-DD
  paymentMethod?: string; // Efectivo, Tarjeta, etc.
  notes?: string;
  recordedByUserId: string; // UID del admin/trainer que registró
  recordedByUserName?: string; // Nombre del admin/trainer que registró
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantitySold: number;
  unitPrice: number; // Precio al momento de la venta
  subtotal: number;
}

export interface Sale {
  id: string; // Firestore document ID
  items: SaleItem[];
  totalAmount: number;
  saleDate: Timestamp;
  recordedByUserId: string;
  recordedByUserName?: string;
  // customerId?: string; // Opcional, para futuras mejoras
}


export interface Attendance {
  id: string; // Firestore document ID
  userId: string; // UID del cliente
  userName: string; // Nombre del cliente
  // classId?: string; // Opcional, si es asistencia a una clase específica
  // className?: string; // Opcional
  checkInTime: Timestamp;
  date: string; // Formato YYYY-MM-DD para facilitar consultas por día
  recordedByUserId: string; // UID del admin/trainer que registró
  recordedByUserName?: string; // Nombre del admin/trainer
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
    const bookingsQuery = query(collection(db, "bookings"), where("classId", "==", classId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    
    const batch = writeBatch(db);
    bookingsSnapshot.forEach(bookingDoc => {
        batch.delete(bookingDoc.ref);
    });
    
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
      limit(1)
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

// --- Funciones para Productos (Firestore) ---

export const getProductsFromDB = async (): Promise<Product[]> => {
  try {
    const productsCol = collection(db, 'products');
    const productSnapshot = await getDocs(query(productsCol, orderBy('name', 'asc')));
    const productList = productSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(), 
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.now()
        } as Product;
    });
    return productList;
  } catch (error) {
    console.error("Error obteniendo productos de Firestore: ", error);
    return [];
  }
};

export const addProductToDB = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product | null> => {
  try {
    const timestamp = serverTimestamp();
    const newProductData = {
      ...productData,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const docRef = await addDoc(collection(db, 'products'), newProductData);
    return {
        id: docRef.id,
        ...productData,
        createdAt: Timestamp.now(), 
        updatedAt: Timestamp.now()
    };
  } catch (error) {
    console.error("Error añadiendo producto a Firestore: ", error);
    return null;
  }
};

export const updateProductInDB = async (productId: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<boolean> => {
  try {
    const productDoc = doc(db, 'products', productId);
    await updateDoc(productDoc, { ...productData, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error("Error actualizando producto en Firestore: ", error);
    return false;
  }
};

export const deleteProductFromDB = async (productId: string): Promise<boolean> => {
  try {
    const productDoc = doc(db, 'products', productId);
    await deleteDoc(productDoc);
    return true;
  } catch (error) {
    console.error("Error eliminando producto de Firestore: ", error);
    return false;
  }
};

// --- Funciones para Transacciones de Caja (Firestore) ---

export const addCashTransactionToDB = async (
  transactionData: Omit<CashTransaction, 'id' | 'date' | 'recordedByUserId' | 'recordedByUserName'>,
  recordedByUserId: string,
  recordedByUserName?: string
): Promise<CashTransaction | null> => {
  try {
    const newTransactionData: any = { 
      ...transactionData,
      date: serverTimestamp(),
      recordedByUserId,
      recordedByUserName: recordedByUserName || 'Sistema',
    };
    if (transactionData.relatedMembershipPaymentId) {
      newTransactionData.relatedMembershipPaymentId = transactionData.relatedMembershipPaymentId;
    }
    if (transactionData.relatedSaleId) {
      newTransactionData.relatedSaleId = transactionData.relatedSaleId;
    }

    const docRef = await addDoc(collection(db, 'cashTransactions'), newTransactionData);
    return {
      id: docRef.id,
      ...transactionData,
      date: Timestamp.now(), 
      recordedByUserId,
      recordedByUserName: recordedByUserName || 'Sistema',
    } as CashTransaction;
  } catch (error) {
    console.error("Error añadiendo transacción de caja a Firestore: ", error);
    return null;
  }
};

export const getCashTransactionsFromDB = async (): Promise<CashTransaction[]> => {
  try {
    const transactionsCol = collection(db, 'cashTransactions');
    const q = query(transactionsCol, orderBy('date', 'desc'));
    const transactionSnapshot = await getDocs(q);
    const transactionList = transactionSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date instanceof Timestamp ? data.date : Timestamp.now(), 
      } as CashTransaction;
    });
    return transactionList;
  } catch (error) {
    console.error("Error obteniendo transacciones de caja de Firestore: ", error);
    return [];
  }
};

// --- Funciones para Pagos de Membresía (Firestore) ---
export const addMembershipPaymentToDB = async (
  paymentData: Omit<MembershipPayment, 'id' | 'paymentDate' | 'recordedByUserId' | 'recordedByUserName'>,
  userId: string,
  userName: string,
  recordedByUserId: string,
  recordedByUserName?: string
): Promise<MembershipPayment | null> => {
  const batch = writeBatch(db);
  try {
    const newPaymentRecord: Omit<MembershipPayment, 'id'> = {
      userId,
      userName,
      amountPaid: paymentData.amountPaid,
      paymentDate: serverTimestamp() as Timestamp,
      newPaymentDueDate: paymentData.newPaymentDueDate,
      paymentMethod: paymentData.paymentMethod,
      notes: paymentData.notes,
      recordedByUserId,
      recordedByUserName: recordedByUserName || 'Sistema',
    };

    const paymentDocRef = doc(collection(db, 'membershipPayments'));
    batch.set(paymentDocRef, newPaymentRecord);

    const userDocRef = doc(db, 'users', userId);
    batch.update(userDocRef, {
      paymentStatus: 'paid',
      paymentDueDate: paymentData.newPaymentDueDate,
    });

    await batch.commit();

    return {
      id: paymentDocRef.id,
      ...newPaymentRecord,
      paymentDate: Timestamp.now(), 
    };
  } catch (error) {
    console.error("Error registrando pago de membresía en Firestore: ", error);
    return null;
  }
};

// --- Funciones para Ventas de Productos (Firestore) ---
export const recordSaleAndUpdateStock = async (
  itemsSold: SaleItem[],
  recordedByUserId: string,
  recordedByUserName?: string
): Promise<Sale | null> => {
  if (itemsSold.length === 0) {
    console.warn("No items to record in sale.");
    throw new Error("No hay productos en la venta para registrar.");
  }

  const totalAmount = itemsSold.reduce((sum, item) => sum + item.subtotal, 0);
  const saleDate = serverTimestamp() as Timestamp;

  const newSaleData: Omit<Sale, 'id'> = {
    items: itemsSold,
    totalAmount,
    saleDate,
    recordedByUserId,
    recordedByUserName: recordedByUserName || 'Sistema',
  };

  const saleDocRef = doc(collection(db, 'sales'));

  try {
    await runTransaction(db, async (transaction) => {
      const productsToUpdate: Array<{ ref: any; newStock: number; name: string }> = [];

      for (const item of itemsSold) {
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
          throw new Error(`Producto con ID ${item.productId} (${item.productName}) no encontrado.`);
        }
        const currentStock = productSnap.data().stock;
        if (currentStock < item.quantitySold) {
          throw new Error(`Stock insuficiente para ${item.productName}. Disponible: ${currentStock}, Solicitado: ${item.quantitySold}.`);
        }
        productsToUpdate.push({
          ref: productRef,
          newStock: currentStock - item.quantitySold,
          name: item.productName,
        });
      }

      transaction.set(saleDocRef, newSaleData);

      for (const prodUpdate of productsToUpdate) {
        transaction.update(prodUpdate.ref, { stock: prodUpdate.newStock, updatedAt: serverTimestamp() });
      }
    });

    return { id: saleDocRef.id, ...newSaleData, saleDate: Timestamp.now() };
  } catch (error: any) {
    console.error("Error grabando venta y actualizando stock en Firestore: ", error);
    throw error; 
  }
};

// --- Funciones para Asistencias (Firestore) ---
export const addAttendanceToDB = async (
  attendanceData: Omit<Attendance, 'id' | 'checkInTime' | 'date'>,
  recordedByUserId: string,
  recordedByUserName?: string
): Promise<Attendance | null> => {
  try {
    const now = new Date();
    const newAttendanceData: Omit<Attendance, 'id'> = {
      ...attendanceData,
      checkInTime: serverTimestamp() as Timestamp,
      date: format(now, 'yyyy-MM-dd'),
      recordedByUserId,
      recordedByUserName: recordedByUserName || 'Sistema',
    };
    const docRef = await addDoc(collection(db, 'attendances'), newAttendanceData);
    return {
      id: docRef.id,
      ...newAttendanceData,
      checkInTime: Timestamp.now(), // Para la respuesta inmediata
    };
  } catch (error) {
    console.error("Error añadiendo asistencia a Firestore: ", error);
    return null;
  }
};

export const getDailyAttendancesFromDB = async (dateString: string): Promise<Attendance[]> => {
  try {
    const attendancesCol = collection(db, 'attendances');
    const q = query(attendancesCol, where('date', '==', dateString), orderBy('checkInTime', 'desc'));
    const attendanceSnapshot = await getDocs(q);
    const attendanceList = attendanceSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        checkInTime: data.checkInTime instanceof Timestamp ? data.checkInTime : Timestamp.now(),
      } as Attendance;
    });
    return attendanceList;
  } catch (error) {
    console.error("Error obteniendo asistencias diarias de Firestore: ", error);
    return [];
  }
};


// --- Tipos de clases para el generador de IA y el formulario de clases ---
export const availableClassTypesForAI = ["Yoga", "HIIT", "Fuerza", "Pilates", "Bootcamp", "Cardio", "Danza", "Boxeo"];
export const productCategories = ["Bebidas", "Suplementos", "Ropa", "Accesorios", "Otros"];
export const paymentMethods = ["Efectivo", "Tarjeta de Crédito", "Tarjeta de Débito", "Transferencia", "Otro"];


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

    if (!dataToSave.createdAt) {
      dataToSave.createdAt = serverTimestamp();
    } else if (typeof dataToSave.createdAt === 'string') {
      dataToSave.createdAt = Timestamp.fromDate(new Date(dataToSave.createdAt));
    }
    
    if (!dataToSave.paymentStatus) {
      dataToSave.paymentStatus = 'pending';
    }
    if (!dataToSave.paymentDueDate) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); 
      dataToSave.paymentDueDate = dueDate.toISOString().split('T')[0];
    }

    if (dataToSave.specialty === undefined) delete dataToSave.specialty;
    if (dataToSave.bio === undefined) delete dataToSave.bio;
    if (dataToSave.imageUrl === undefined) delete dataToSave.imageUrl;
    
    await setDoc(userDocRef, dataToSave , { merge: true });
    return true;
  } catch (error) {
    console.error("Error guardando perfil de usuario en Firestore: ", error);
    return false;
  }
};

    
