
import { db } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, writeBatch, getDoc, setDoc, serverTimestamp, Timestamp, limit, orderBy, runTransaction, increment } from 'firebase/firestore';
import type { UserProfile } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';

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
  cost: number;
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
  relatedSaleTotalCost?: number;
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
  unitCost?: number;
  costSubtotal?: number;
}

export interface Sale {
  id: string; // Firestore document ID
  items: SaleItem[];
  totalAmount: number;
  totalCost?: number;
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
  try {
    const bookingDocRef = doc(collection(db, 'bookings'));
    const classDocRef = doc(db, 'classes', classItem.id);
    
    await runTransaction(db, async (transaction) => {
      const existingBookingQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userId),
        where('classId', '==', classItem.id),
        where('status', '==', 'confirmed'),
        limit(1)
      );
      
      const existingBookingSnapshot = await getDocs(existingBookingQuery);
      if (!existingBookingSnapshot.empty) {
        throw new Error("El usuario ya tiene una reserva confirmada para esta clase.");
      }

      const classSnap = await transaction.get(classDocRef);
      if (!classSnap.exists()) {
        throw new Error("La clase que intentas reservar ya no existe.");
      }

      const classData = classSnap.data();
      const newBookedCount = (classData.booked || 0) + 1;

      if (newBookedCount > classData.capacity) {
        throw new Error("La clase ya está llena.");
      }
      
      transaction.update(classDocRef, { booked: newBookedCount });

      const newBookingData = {
        userId: userId,
        classId: classItem.id,
        className: classItem.name,
        bookingDate: serverTimestamp(),
        status: 'confirmed' as const
      };
      transaction.set(bookingDocRef, newBookingData);
    });

    const optimisticBooking: Booking = {
      id: bookingDocRef.id,
      userId: userId,
      classId: classItem.id,
      className: classItem.name,
      bookingDate: new Date().toISOString(),
      status: 'confirmed',
    };
    return optimisticBooking;

  } catch (error: any) {
    console.error("Error añadiendo reserva a Firestore: ", error.message);
    // No relanzar para no crashear la app, el toast se encargará de notificar
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
  try {
    await runTransaction(db, async (transaction) => {
      const bookingDocRef = doc(db, 'bookings', bookingId);
      const classDocRef = doc(db, 'classes', classId);

      const bookingSnap = await transaction.get(bookingDocRef);
      if (!bookingSnap.exists() || bookingSnap.data().status !== 'confirmed') {
        throw new Error("La reserva no existe o ya está cancelada.");
      }
      
      transaction.update(bookingDocRef, { status: 'cancelled' });

      const classSnap = await transaction.get(classDocRef);
      if (classSnap.exists()) {
        const currentBooked = classSnap.data().booked || 0;
        if (currentBooked > 0) {
            transaction.update(classDocRef, { booked: currentBooked - 1 });
        }
      }
    });
    return true;
  } catch (error: any) {
    console.error("Error cancelando reserva en Firestore: ", error.message);
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
    if (transactionData.relatedSaleTotalCost) {
      newTransactionData.relatedSaleTotalCost = transactionData.relatedSaleTotalCost;
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
    const q = query(transactionsCol, orderBy('date', 'desc')); // Ya no hay límite
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

export const getTransactionsByDateRange = async (startDate: Date, endDate: Date): Promise<CashTransaction[]> => {
  try {
    const transactionsCol = collection(db, 'cashTransactions');
    const q = query(
      transactionsCol,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
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
    console.error("Error fetching transactions by date range:", error);
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
    const paymentTimestamp = serverTimestamp();
    const paymentDateString = format(new Date(), 'yyyy-MM-dd');

    const newPaymentRecord: Omit<MembershipPayment, 'id'> = {
      userId,
      userName,
      amountPaid: paymentData.amountPaid,
      paymentDate: paymentTimestamp as Timestamp,
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
      lastPaymentDate: paymentDateString,
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
  
  const saleDocRef = doc(collection(db, 'sales'));

  try {
    const saleData = await runTransaction(db, async (transaction) => {
      const productRefsAndData: { ref: any; item: SaleItem }[] = itemsSold.map(item => ({
          ref: doc(db, 'products', item.productId),
          item: item
      }));

      const productSnaps = await Promise.all(
          productRefsAndData.map(pd => transaction.get(pd.ref))
      );
      
      const enrichedItems: SaleItem[] = [];
      let totalAmount = 0;
      let totalCost = 0;

      for (let i = 0; i < productSnaps.length; i++) {
        const productSnap = productSnaps[i];
        const item = itemsSold[i];

        if (!productSnap.exists()) {
          throw new Error(`Producto con ID ${item.productId} (${item.productName}) no encontrado.`);
        }
        
        const productData = productSnap.data();
        const currentStock = productData.stock;

        if (currentStock < item.quantitySold) {
          throw new Error(`Stock insuficiente para ${item.productName}. Disponible: ${currentStock}, Solicitado: ${item.quantitySold}.`);
        }
        
        const unitCost = productData.cost || 0;
        const enrichedItem: SaleItem = {
            ...item,
            unitCost: unitCost,
            costSubtotal: item.quantitySold * unitCost,
        };

        enrichedItems.push(enrichedItem);
        totalAmount += enrichedItem.subtotal;
        totalCost += enrichedItem.costSubtotal || 0;
        
        const newStock = currentStock - item.quantitySold;
        transaction.update(productRefsAndData[i].ref, { 
          stock: newStock,
          updatedAt: serverTimestamp() 
        });
      }

      const newSaleData: Omit<Sale, 'id'> = {
        items: enrichedItems,
        totalAmount,
        totalCost,
        saleDate: serverTimestamp() as Timestamp,
        recordedByUserId,
        recordedByUserName: recordedByUserName || 'Sistema',
      };

      transaction.set(saleDocRef, newSaleData);
      return newSaleData;
    });

    return {
        id: saleDocRef.id,
        ...saleData,
        saleDate: Timestamp.now(), // Use client-side timestamp for immediate response
    };

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
    // ESTA CONSULTA REQUIERE UN ÍNDICE COMPUESTO EN FIRESTORE:
    // Colección: attendances, Campos: date (ascendente), checkInTime (descendente)
    // Firestore normalmente provee un enlace en la consola para crearlo si falla.
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

export const getMonthlyAttendanceCounts = async (): Promise<Record<string, { userName: string, count: number }>> => {
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  try {
    const attendancesCol = collection(db, 'attendances');
    const q = query(
      attendancesCol,
      where('checkInTime', '>=', startDate),
      where('checkInTime', '<=', endDate)
    );

    const attendanceSnapshot = await getDocs(q);
    const counts: Record<string, { userName: string, count: number }> = {};

    attendanceSnapshot.docs.forEach(doc => {
      const data = doc.data() as Omit<Attendance, 'id'>;
      if (counts[data.userId]) {
        counts[data.userId].count++;
      } else {
        if (data.userName) {
          counts[data.userId] = { userName: data.userName, count: 1 };
        }
      }
    });
    
    return counts;

  } catch (error) {
    console.error("Error getting monthly attendance counts from Firestore: ", error);
    return {};
  }
};

export const getAttendancesForUserFromDB = async (userId: string): Promise<Attendance[]> => {
  try {
    const attendancesCol = collection(db, 'attendances');
    const q = query(
      attendancesCol, 
      where('userId', '==', userId), 
      orderBy('checkInTime', 'desc')
    );
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
    console.error(`Error obteniendo asistencias para el usuario ${userId} de Firestore: `, error);
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
      dataToSave.paymentStatus = 'unpaid';
    }
    if (!dataToSave.paymentDueDate) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); 
      dataToSave.paymentDueDate = dueDate.toISOString().split('T')[0];
    }
    if (dataToSave.lastPaymentDate === undefined) delete dataToSave.lastPaymentDate;

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

    