
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc as firestoreDoc, Timestamp, query as firestoreQuery, where } from 'firebase/firestore'; // Added query and where
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  type ClassOffering,
  addClassToDB,
  getClassOfferingsFromDB,
  updateClassInDB,
  deleteClassFromDB,
  saveUserProfileToDB,
  getUserProfileFromDB,
  type Trainer,
  type Product,
  getProductsFromDB,
  addProductToDB,
  updateProductInDB,
  deleteProductFromDB,
  type CashTransaction,
  addCashTransactionToDB,
  getCashTransactionsFromDB,
  type MembershipPayment,
  addMembershipPaymentToDB,
  recordSaleAndUpdateStock,
  type SaleItem,
  type Attendance,
  addAttendanceToDB,
  getDailyAttendancesFromDB,
  getMonthlyAttendanceCounts,
  getAttendancesForUserFromDB, // Importar nueva función
} from '@/lib/firestore';
import AddClassForm, { type AddClassFormValues } from '@/components/forms/AddClassForm';
import AddProductForm, { type AddProductFormValues } from '@/components/forms/AddProductForm';
import AddCashTransactionForm, { type AddCashTransactionFormValues } from '@/components/forms/AddCashTransactionForm';
import AddMembershipPaymentForm, { type AddMembershipPaymentFormValues } from '@/components/forms/AddMembershipPaymentForm';
import RecordSaleForm from '@/components/forms/RecordSaleForm';
import { PlusCircle, Edit3, Trash2, UserCog, ListOrdered, ArrowDownUp, Loader2, CreditCard, CheckCircle, XCircle, AlertCircle, ShoppingBag, Landmark, ShoppingCart, Eye, EyeOff, UserCheck, LogIn as LogInIcon, BarChart2, Medal, History, Users, UserX, CalendarClock, Send, Mail, MessageSquare, BadgeInfo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format as formatDateFns } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReportsTab from '@/components/admin/ReportsTab';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const TABS_CONFIG = [
  { value: "manage-classes", label: "Gestionar Clases", icon: ListOrdered, roles: ['admin', 'trainer'] },
  { value: "manage-products", label: "Gestionar Productos", icon: ShoppingBag, roles: ['admin'] },
  { value: "manage-cash-flow", label: "Ventas y Caja", icon: Landmark, roles: ['admin', 'trainer'] },
  { value: "manage-users", label: "Usuarios y Pagos", icon: UserCog, roles: ['admin'] },
  { value: "manage-attendance", label: "Registro de Asistencias", icon: UserCheck, roles: ['admin', 'trainer'] },
  { value: "attendance-ranking", label: "Ranking Asistencias", icon: Medal, roles: ['admin', 'trainer'] },
  { value: "reports", label: "Reportes", icon: BarChart2, roles: ['admin'] },
];

export default function TrainerDashboardPage() {
  const { currentUser, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [trainerClasses, setTrainerClasses] = useState<ClassOffering[]>([]);
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [isEditClassDialogOpen, setIsEditClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassOffering | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassOffering | null>(null);
  const [isDeleteClassConfirmOpen, setIsDeleteClassConfirmOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] useState(false);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteProductConfirmOpen, setIsDeleteProductConfirmOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [isAddCashTransactionDialogOpen, setIsAddCashTransactionDialogOpen] = useState(false);
  const [isSavingCashTransaction, setIsSavingCashTransaction] = useState(false);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [isBalanceVisible, setIsBalanceVisible] = useState<boolean>(false);


  const [allUsersForAdminState, setAllUsersForAdminState] = useState<UserProfile[]>([]);
  const [availableTrainers, setAvailableTrainers] = useState<Trainer[]>([]);
  const [isUpdatingRole, setIsUpdatingRole] = useState<Record<string, boolean>>({});

  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [selectedUserForPayment, setSelectedUserForPayment] = useState<UserProfile | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const [isRecordSaleDialogOpen, setIsRecordSaleDialogOpen] = useState(false);
  const [isSavingSale, setIsSavingSale] = useState(false);

  const [allClientsForAttendance, setAllClientsForAttendance] = useState<UserProfile[]>([]);
  const [dailyAttendances, setDailyAttendances] = useState<Attendance[]>([]);
  const [dniInputForAttendance, setDniInputForAttendance] = useState<string>('');
  const [isRegisteringAttendance, setIsRegisteringAttendance] = useState(false);
  
  const [monthlyAttendances, setMonthlyAttendances] = useState<Record<string, { userName: string; count: number }>>({});

  const [isAttendanceHistoryDialogOpen, setIsAttendanceHistoryDialogOpen] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<UserProfile | null>(null);
  const [userAttendanceHistory, setUserAttendanceHistory] = useState<Attendance[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [userStats, setUserStats] = useState({ totalUsers: 0, pendingPayments: 0 });

  const [bulkMessage, setBulkMessage] = useState("");


  const [dashboardPageLoading, setDashboardPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const cleanDescription = (description: string) => {
    return description.replace(/\s\(ID Venta: .*\)$/, '');
  };

  // Effect to clean up history dialog state when it closes
  useEffect(() => {
    if (!isAttendanceHistoryDialogOpen) {
      setSelectedUserForHistory(null);
      setUserAttendanceHistory([]);
    }
  }, [isAttendanceHistoryDialogOpen]);
  
  const handleSendBulkEmail = () => {
    if (!bulkMessage.trim()) {
      toast({ title: "Mensaje Vacío", description: "Por favor, escribe un mensaje para enviar.", variant: "destructive" });
      return;
    }
    const clientEmails = allUsersForAdminState
      .filter(u => u.role === 'client' && u.email)
      .map(u => u.email);

    if (clientEmails.length === 0) {
      toast({ title: "Sin Clientes", description: "No hay clientes a quienes enviar el mensaje." });
      return;
    }

    const bccString = clientEmails.join(',');
    const mailtoLink = `mailto:?bcc=${encodeURIComponent(bccString)}&subject=${encodeURIComponent("Novedades de Animal GYM")}&body=${encodeURIComponent(bulkMessage)}`;
    
    window.location.href = mailtoLink;
  };
  
  const handleSendBulkWhatsApp = () => {
    if (!bulkMessage.trim()) {
      toast({ title: "Mensaje Vacío", description: "Por favor, escribe un mensaje para enviar.", variant: "destructive" });
      return;
    }
    const clientsWithPhone = allUsersForAdminState
      .filter(u => u.role === 'client' && u.phone);

    if (clientsWithPhone.length === 0) {
      toast({ title: "Sin Clientes con Teléfono", description: "No hay clientes con números de teléfono registrados." });
      return;
    }

    const message = encodeURIComponent(bulkMessage);
    const htmlContent = `
      <html>
        <head>
          <title>Enviar WhatsApp a Clientes</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { color: #3F51B5; }
            ul { list-style: none; padding: 0; }
            li { margin-bottom: 10px; }
            a { 
              display: inline-block;
              padding: 10px 15px;
              background-color: #25D366;
              color: white;
              text-decoration: none;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <h1>Enviar Novedades por WhatsApp</h1>
          <p>Haz clic en cada enlace para enviar el mensaje a tus clientes:</p>
          <ul>
            ${clientsWithPhone.map(client => `
              <li>
                <strong>${client.name}:</strong> 
                <a href="https://wa.me/${client.phone?.replace(/\D/g, '')}?text=${message}" target="_blank" rel="noopener noreferrer">
                  Enviar a ${client.name}
                </a>
              </li>
            `).join('')}
          </ul>
        </body>
      </html>
    `;
    
    const newWindow = window.open();
    newWindow?.document.write(htmlContent);
    newWindow?.document.close();
  };


  const attendanceRanking = useMemo(() => {
    return Object.entries(monthlyAttendances)
        .map(([userId, data]) => ({
            userId,
            userName: data.userName,
            count: data.count,
        }))
        .sort((a, b) => b.count - a.count);
  }, [monthlyAttendances]);

  const availableTabs = useMemo(() => {
    if (!userProfile || !userProfile.role) {
      return [];
    }
    return TABS_CONFIG.filter(tab => tab.roles.includes(userProfile.role));
  }, [userProfile]);

  const fetchClassesForDashboard = useCallback(async () => {
    if (!currentUser || !userProfile) return;
    let classesFromDB = await getClassOfferingsFromDB();
    if (userProfile.role === 'trainer') {
      classesFromDB = classesFromDB.filter(c => c.trainerId === currentUser.uid);
    }
    setTrainerClasses(classesFromDB.sort((a, b) => a.name.localeCompare(b.name)));
  }, [currentUser, userProfile]);

  const fetchProductsForDashboard = useCallback(async () => {
    if (userProfile?.role !== 'admin') return;
    const productsFromDB = await getProductsFromDB();
    setProducts(productsFromDB);
  }, [userProfile]);

  const calculateCashBalance = (transactions: CashTransaction[]): number => {
    return transactions.reduce((acc, transaction) => {
      if (transaction.type === 'income') {
        return acc + transaction.amount;
      } else if (transaction.type === 'expense') {
        return acc - transaction.amount;
      }
      return acc;
    }, 0);
  };

  const fetchCashTransactionsForDashboard = useCallback(async () => {
    if (!userProfile || !['admin', 'trainer'].includes(userProfile.role)) return;

    if (userProfile.role === 'admin') {
      const transactionsFromDB = await getCashTransactionsFromDB();
      const sortedTransactions = transactionsFromDB.sort((a, b) => b.date.toMillis() - a.date.toMillis());
      setCashTransactions(sortedTransactions);
    }
    // Trainers no cargan transacciones, solo tienen acceso a los botones de registro
  }, [userProfile]);

  const fetchMonthlyAttendanceData = useCallback(async () => {
      if (!userProfile || !['admin', 'trainer'].includes(userProfile.role)) return;
      const counts = await getMonthlyAttendanceCounts();
      setMonthlyAttendances(counts);
  }, [userProfile]);

  useEffect(() => {
    if (activeTab === "manage-cash-flow" && userProfile?.role === 'admin') {
      const balance = calculateCashBalance(cashTransactions);
      setCashBalance(balance);
    }
  }, [cashTransactions, activeTab, userProfile?.role]);


  const fetchAllUsersForAdmin = useCallback(async () => {
    if (!currentUser || userProfile?.role !== 'admin') {
      setAllUsersForAdminState([]);
      setAvailableTrainers([]);
      setAllClientsForAttendance([]);
      return;
    }
    let fetchedUsers: UserProfile[] = [];
    try {
      const usersCollectionRef = collection(db, "users");
      const querySnapshot = await getDocs(usersCollectionRef);
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        if (data.name && data.email && data.role) {
          fetchedUsers.push({ id: doc.id, ...data });
        }
      });
      
      const otherUsers = fetchedUsers.filter(u => u.id !== currentUser.uid);
      const today = new Date();
      today.setHours(0,0,0,0);

      const stats = {
          totalUsers: otherUsers.filter(u => u.role !== 'admin').length,
          pendingPayments: otherUsers.filter(u => 
            u.role === 'client' && u.paymentDueDate && new Date(u.paymentDueDate + 'T00:00:00') < today
          ).length
      };
      setUserStats(stats);


      const filteredUsersForDisplay = otherUsers
        .sort((a, b) => a.name.localeCompare(b.name));

      setAllUsersForAdminState(filteredUsersForDisplay);
      
      const clients = fetchedUsers.filter(u => u.role === 'client').sort((a,b) => a.name.localeCompare(b.name));
      setAllClientsForAttendance(clients);


      const trainersFromFirestore = fetchedUsers
        .filter(u => u.role === 'trainer')
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          specialty: u.specialty || 'Entrenador/a',
          bio: u.bio || 'Biografía pendiente.',
          imageUrl: u.imageUrl || `https://placehold.co/100x100.png?text=${u.name.split(' ').map(n => n[0]).join('')}`
        } as Trainer));
      setAvailableTrainers(trainersFromFirestore);
    } catch (error) {
      console.error("[TrainerDashboard] fetchAllUsersForAdmin: Error fetching users:", error);
      setAllUsersForAdminState([]);
      setAvailableTrainers([]);
      setAllClientsForAttendance([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userProfile?.role]);

  const fetchDailyAttendances = useCallback(async () => {
    if (!userProfile || !['admin', 'trainer'].includes(userProfile.role)) return;
    const todayString = formatDateFns(new Date(), 'yyyy-MM-dd');
    const attendancesFromDB = await getDailyAttendancesFromDB(todayString);
    setDailyAttendances(attendancesFromDB);
  }, [userProfile]);


  useEffect(() => {
    if (authLoading) {
      setDashboardPageLoading(true);
      return;
    }
    if (!isAuthenticated || !userProfile) {
      router.push('/');
      return;
    }
    if (userProfile.role !== 'trainer' && userProfile.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [authLoading, isAuthenticated, userProfile, router]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userProfile) return;

    if (availableTabs.length > 0) {
      const currentActiveTabIsValid = activeTab && availableTabs.some(t => t.value === activeTab);
      if (!currentActiveTabIsValid) {
        setActiveTab(availableTabs[0].value);
      }
    } else {
      if (activeTab !== undefined) {
        setActiveTab(undefined);
      }
      setDashboardPageLoading(false);
    }
  }, [availableTabs, authLoading, userProfile, activeTab]);

  useEffect(() => {
    if (authLoading || !userProfile || !activeTab) {
        if (!authLoading && userProfile && availableTabs.length > 0 && !activeTab) {
            setDashboardPageLoading(true);
        } else if (!authLoading && userProfile && availableTabs.length === 0) {
            setDashboardPageLoading(false);
        }
        return;
    }

    const loadDashboardData = async () => {
        setDashboardPageLoading(true);
        try {
            if (activeTab === "manage-classes") {
                await fetchClassesForDashboard();
                if (userProfile.role === 'admin') {
                    await fetchAllUsersForAdmin();
                }
            } else if (activeTab === "manage-products" && userProfile.role === 'admin') {
                await fetchProductsForDashboard();
            } else if (activeTab === "manage-cash-flow") {
                await fetchCashTransactionsForDashboard();
            } else if (activeTab === "manage-users" && userProfile.role === 'admin') {
                await fetchAllUsersForAdmin();
                await fetchMonthlyAttendanceData();
            } else if (activeTab === "manage-attendance") {
                if (userProfile.role === 'admin') {
                    await fetchAllUsersForAdmin();
                } else if (userProfile.role === 'trainer' && allClientsForAttendance.length === 0) {
                    const usersCollectionRef = collection(db, "users");
                    const q = firestoreQuery(usersCollectionRef, where("role", "==", "client"));
                    const querySnapshot = await getDocs(q);
                    const clientList: UserProfile[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
                    setAllClientsForAttendance(clientList.sort((a, b) => a.name.localeCompare(b.name)));
                }
                await fetchDailyAttendances();
                await fetchMonthlyAttendanceData();
            } else if (activeTab === 'attendance-ranking') {
                await fetchMonthlyAttendanceData();
            } else if (activeTab === "reports" && userProfile.role === 'admin') {
                // The ReportsTab component handles its own data fetching
            }
        } catch (error: any) {
            console.error(`[TrainerDashboard] Error loading data for tab ${activeTab}:`, error.message, error.stack);
            toast({ title: "Error al Cargar Datos", description: `No se pudieron cargar datos para ${activeTab}.`, variant: "destructive" });
        } finally {
            setDashboardPageLoading(false);
        }
    };

    loadDashboardData();
  }, [
      activeTab,
      userProfile,
      authLoading,
      toast,
      allClientsForAttendance.length,
      fetchClassesForDashboard,
      fetchAllUsersForAdmin,
      fetchProductsForDashboard,
      fetchCashTransactionsForDashboard,
      fetchDailyAttendances,
      fetchMonthlyAttendanceData,
  ]);


  const handleOpenAddClassDialog = () => setIsAddClassDialogOpen(true);
  const handleCloseAddClassDialog = async (reloadData = false) => {
    setIsAddClassDialogOpen(false);
    if (reloadData) {
      await fetchClassesForDashboard();
      if (userProfile?.role === 'admin') {
        await fetchAllUsersForAdmin(); // Re-fetch users to update trainer list if necessary
      }
    }
  };

  const handleSaveNewClass = async (data: AddClassFormValues, trainerName: string) => {
    if (!currentUser || !userProfile) return;
    const newClassData = {
      ...data,
      trainerId: userProfile.role === 'admin' ? data.trainerId : currentUser.uid,
      trainerName: trainerName,
    };
    const addedClass = await addClassToDB(newClassData);
    if (addedClass) {
      toast({ title: "Clase Añadida", description: `La clase "${addedClass.name}" ha sido añadida.` });
      await handleCloseAddClassDialog(true);
    } else {
      toast({ title: "Error", description: "No se pudo añadir la clase.", variant: "destructive" });
      await handleCloseAddClassDialog(false);
    }
  };

  const handleOpenEditClassDialog = (classItem: ClassOffering) => {
    setEditingClass(classItem);
    setIsEditClassDialogOpen(true);
  };
  const handleCloseEditClassDialog = async (reloadData = false) => {
    setIsEditClassDialogOpen(false);
    setEditingClass(null);
    if (reloadData) {
      await fetchClassesForDashboard();
      if (userProfile?.role === 'admin') {
        await fetchAllUsersForAdmin(); // Re-fetch users to update trainer list if necessary
      }
    }
  };

  const handleSaveEditedClass = async (data: AddClassFormValues, trainerName: string) => {
    if (!editingClass || !currentUser || !userProfile) return;
    const updatedClassData = {
      ...data,
      trainerId: userProfile.role === 'admin' ? data.trainerId : editingClass.trainerId,
      trainerName,
    };
    const payload: Omit<ClassOffering, 'id'> = {
      name: updatedClassData.name,
      trainerId: updatedClassData.trainerId,
      trainerName: updatedClassData.trainerName,
      day: updatedClassData.day,
      time: updatedClassData.time,
      duration: updatedClassData.duration,
      capacity: updatedClassData.capacity,
      booked: editingClass.booked, // Keep current booked count
      description: updatedClassData.description,
      category: updatedClassData.category,
    };
    const success = await updateClassInDB(editingClass.id, payload);
    if (success) {
      toast({ title: "Clase Actualizada", description: `La clase "${payload.name}" ha sido actualizada.` });
      await handleCloseEditClassDialog(true);
    } else {
      toast({ title: "Error", description: "No se pudo actualizar la clase.", variant: "destructive" });
      await handleCloseEditClassDialog(false);
    }
  };

  const handleDeleteClass = (classItem: ClassOffering) => {
    setClassToDelete(classItem);
    setIsDeleteClassConfirmOpen(true);
  };
  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    const success = await deleteClassFromDB(classToDelete.id);
    if (success) {
      toast({ title: "Clase Eliminada", description: `La clase "${classToDelete.name}" ha sido eliminada.` });
    } else {
      toast({ title: "Error", description: "No se pudo eliminar la clase.", variant: "destructive" });
    }
    setIsDeleteClassConfirmOpen(false);
    setClassToDelete(null);
    await fetchClassesForDashboard();
  };

  const handleOpenAddProductDialog = () => setIsAddProductDialogOpen(true);
  const handleCloseAddProductDialog = async (reloadData = false) => {
    setIsAddProductDialogOpen(false);
    if (reloadData && userProfile?.role === 'admin') {
      await fetchProductsForDashboard();
    }
  };

  const handleSaveNewProduct = async (data: AddProductFormValues) => {
    if (userProfile?.role !== 'admin') return;
    setIsSavingProduct(true);
    const addedProduct = await addProductToDB(data);
    if (addedProduct) {
      toast({ title: "Producto Añadido", description: `El producto "${addedProduct.name}" ha sido añadido.` });
      await handleCloseAddProductDialog(true);
    } else {
      toast({ title: "Error", description: "No se pudo añadir el producto.", variant: "destructive" });
      await handleCloseAddProductDialog(false);
    }
    setIsSavingProduct(false);
  };

  const handleOpenEditProductDialog = (productItem: Product) => {
    setEditingProduct(productItem);
    setIsEditProductDialogOpen(true);
  };
  const handleCloseEditProductDialog = async (reloadData = false) => {
    setIsEditProductDialogOpen(false);
    setEditingProduct(null);
    if (reloadData && userProfile?.role === 'admin') {
      await fetchProductsForDashboard();
    }
  };

  const handleSaveEditedProduct = async (data: AddProductFormValues) => {
    if (!editingProduct || userProfile?.role !== 'admin') return;
    setIsSavingProduct(true);
    const success = await updateProductInDB(editingProduct.id, data);
    if (success) {
      toast({ title: "Producto Actualizado", description: `El producto "${data.name}" ha sido actualizado.` });
      await handleCloseEditProductDialog(true);
    } else {
      toast({ title: "Error", description: "No se pudo actualizar el producto.", variant: "destructive" });
      await handleCloseEditProductDialog(false);
    }
    setIsSavingProduct(false);
  };

  const handleDeleteProduct = (productItem: Product) => {
    setProductToDelete(productItem);
    setIsDeleteProductConfirmOpen(true);
  };
  const confirmDeleteProduct = async () => {
    if (!productToDelete || userProfile?.role !== 'admin') return;
    const success = await deleteProductFromDB(productToDelete.id);
    if (success) {
      toast({ title: "Producto Eliminado", description: `El producto "${productToDelete.name}" ha sido eliminada.` });
    } else {
      toast({ title: "Error", description: "No se pudo eliminar el producto.", variant: "destructive" });
    }
    setIsDeleteProductConfirmOpen(false);
    setProductToDelete(null);
    await fetchProductsForDashboard();
  };

  const handleOpenAddCashTransactionDialog = () => setIsAddCashTransactionDialogOpen(true);
  const handleCloseAddCashTransactionDialog = async (reloadData = false) => {
    setIsAddCashTransactionDialogOpen(false);
    if (reloadData && userProfile?.role === 'admin') {
      await fetchCashTransactionsForDashboard();
    }
  };

  const handleSaveNewCashTransaction = async (data: AddCashTransactionFormValues) => {
    if (!currentUser || !userProfile || !['admin', 'trainer'].includes(userProfile.role)) {
      toast({ title: "Error de Permiso", description: "No tienes permiso para registrar esta transacción.", variant: "destructive" });
      return;
    }
  
    setIsSavingCashTransaction(true);
  
    const transactionPayload: Omit<CashTransaction, 'id' | 'date' | 'recordedByUserId' | 'recordedByUserName'> = {
      type: data.type,
      amount: data.amount,
      description: data.description,
    };
    
    const addedTransaction = await addCashTransactionToDB(transactionPayload, currentUser.uid, userProfile.name);
    
    if (addedTransaction) {
      toast({ title: "Transacción Registrada", description: `Se ha registrado un ${transactionPayload.type === 'income' ? 'ingreso' : 'egreso'} de $${data.amount.toFixed(2)}.` });
      await handleCloseAddCashTransactionDialog(true);
    } else {
      toast({ title: "Error", description: "No se pudo registrar la transacción. Por favor, intenta de nuevo.", variant: "destructive" });
      await handleCloseAddCashTransactionDialog(false);
    }
    setIsSavingCashTransaction(false);
  };

  const handleChangeUserRole = async (userIdToChange: string, newRole: 'client' | 'trainer') => {
    if (!currentUser || !userProfile || userProfile.role !== 'admin') {
      toast({ title: "Error de Permiso", description: "Solo los administradores pueden cambiar roles.", variant: "destructive" });
      return;
    }
    if (currentUser.uid === userIdToChange) {
      toast({ title: "Acción no permitida", description: "Los administradores no pueden cambiar su propio rol.", variant: "destructive" });
      return;
    }
    setIsUpdatingRole(prev => ({ ...prev, [userIdToChange]: true }));
    const userToUpdate = await getUserProfileFromDB(userIdToChange);
    if (!userToUpdate) {
      toast({ title: "Error", description: "Usuario no encontrado.", variant: "destructive" });
      setIsUpdatingRole(prev => ({ ...prev, [userIdToChange]: false }));
      return;
    }
    const updatedProfileData: UserProfile = { ...userToUpdate, role: newRole };
    const success = await saveUserProfileToDB(updatedProfileData);
    if (success) {
      toast({ title: "Rol Actualizado", description: `${userToUpdate.name} ahora es ${newRole}.` });
      // Optimistically update local state or re-fetch
      await fetchAllUsersForAdmin(); 
    } else {
      toast({ title: "Error al Actualizar Rol", description: `No se pudo cambiar el rol de ${userToUpdate.name}.`, variant: "destructive" });
    }
    setIsUpdatingRole(prev => ({ ...prev, [userIdToChange]: false }));
  };

  const getPaymentStatusBadge = (user: UserProfile) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = user.paymentDueDate ? new Date(user.paymentDueDate + 'T00:00:00') : null;
    
    if (dueDate && dueDate < today) {
        return <Badge variant="secondary" className="bg-yellow-500 text-black"><AlertCircle className="mr-1 h-3 w-3" /> Pendiente</Badge>;
    }
    
    switch (user.paymentStatus) {
      case 'paid': return <Badge variant="default" className="bg-green-500 text-white"><CheckCircle className="mr-1 h-3 w-3" /> Pagado</Badge>;
      case 'unpaid': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> No Pagado</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="bg-yellow-500 text-black"><AlertCircle className="mr-1 h-3 w-3" /> Pendiente</Badge>;
    }
  };

  const handleOpenAddPaymentDialog = (user: UserProfile) => {
    setSelectedUserForPayment(user);
    setIsAddPaymentDialogOpen(true);
  };

  const handleCloseAddPaymentDialog = () => {
    setIsAddPaymentDialogOpen(false);
    setSelectedUserForPayment(null);
  };

  const handleSaveNewPayment = async (data: AddMembershipPaymentFormValues) => {
    if (!currentUser || !userProfile || userProfile.role !== 'admin' || !selectedUserForPayment) return;
    setIsSavingPayment(true);

    const paymentPayload: Omit<MembershipPayment, 'id' | 'paymentDate' | 'recordedByUserId' | 'recordedByUserName'> = {
      userId: selectedUserForPayment.id,
      userName: selectedUserForPayment.name,
      amountPaid: data.amountPaid,
      newPaymentDueDate: formatDateFns(data.newPaymentDueDate, 'yyyy-MM-dd'),
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    };

    const recordedPayment = await addMembershipPaymentToDB(
      paymentPayload,
      selectedUserForPayment.id,
      selectedUserForPayment.name,
      currentUser.uid,
      userProfile.name
    );

    if (recordedPayment) {
      toast({ title: "Pago Registrado", description: `Pago de ${selectedUserForPayment.name} guardado.` });
      
      // Re-fetch all users to update payment status in the table
      await fetchAllUsersForAdmin(); 

      const cashTransactionPayload: Omit<CashTransaction, 'id' | 'date' | 'recordedByUserId' | 'recordedByUserName'> = {
        type: 'income',
        amount: recordedPayment.amountPaid,
        description: `Pago de cuota - ${selectedUserForPayment.name}`,
        relatedMembershipPaymentId: recordedPayment.id,
      };
      await addCashTransactionToDB(cashTransactionPayload, currentUser.uid, userProfile.name);

      if (activeTab === 'manage-cash-flow') {
        await fetchCashTransactionsForDashboard(); // Also re-fetch cash if on that tab
      }

      handleCloseAddPaymentDialog();
    } else {
      toast({ title: "Error", description: "No se pudo registrar el pago.", variant: "destructive" });
    }
    setIsSavingPayment(false);
  };

  const handleOpenRecordSaleDialog = () => setIsRecordSaleDialogOpen(true);
  const handleCloseRecordSaleDialog = async (reloadData = false) => {
    setIsRecordSaleDialogOpen(false);
    if (reloadData) {
      if (userProfile?.role === 'admin' && activeTab === "manage-products") await fetchProductsForDashboard();
      if (activeTab === "manage-cash-flow") await fetchCashTransactionsForDashboard();
    }
  };

  const handleSaveNewSale = async (itemsSold: SaleItem[]) => {
    if (!currentUser || !userProfile || !['admin', 'trainer'].includes(userProfile.role)) {
      toast({ title: "Error de Permiso", description: "No tienes permiso para registrar ventas.", variant: "destructive" });
      return;
    }
    setIsSavingSale(true);
    try {
      const recordedSale = await recordSaleAndUpdateStock(itemsSold, currentUser.uid, userProfile.name);
      if (recordedSale) {
        toast({ title: "Venta Registrada", description: `Venta por $${recordedSale.totalAmount.toFixed(2)} registrada con éxito.` });

        const saleItemsDetails = recordedSale.items
          .map(item => `${item.quantitySold}x ${item.productName}`)
          .join(', ');
        const MAX_SALE_DETAILS_LENGTH = 70; 
        const truncatedSaleDetails = saleItemsDetails.length > MAX_SALE_DETAILS_LENGTH
                                      ? saleItemsDetails.substring(0, MAX_SALE_DETAILS_LENGTH - 3) + '...'
                                      : saleItemsDetails;

        const cashTransactionPayload: Omit<CashTransaction, 'id' | 'date' | 'recordedByUserId' | 'recordedByUserName'> = {
          type: 'income',
          amount: recordedSale.totalAmount,
          description: `Venta: ${truncatedSaleDetails} (ID Venta: ${recordedSale.id})`,
          relatedSaleId: recordedSale.id,
          relatedSaleTotalCost: recordedSale.totalCost,
        };
        await addCashTransactionToDB(cashTransactionPayload, currentUser.uid, userProfile.name);

        await handleCloseRecordSaleDialog(true);
      }
    } catch (error: any) {
      toast({ title: "Error en la Venta", description: error.message || "Ocurrió un error desconocido.", variant: "destructive" });
    } finally {
      setIsSavingSale(false);
    }
  };

  const handleRegisterAttendance = async () => {
    if (!currentUser || !userProfile || !dniInputForAttendance.trim()) {
      toast({ title: "Error", description: "Por favor, ingresa un número de DNI.", variant: "destructive" });
      return;
    }
    setIsRegisteringAttendance(true);
    const client = allClientsForAttendance.find(c => c.dni === dniInputForAttendance.trim());
    if (!client) {
      toast({ title: "Cliente no Encontrado", description: "No se encontró ningún cliente con ese DNI.", variant: "destructive" });
      setIsRegisteringAttendance(false);
      return;
    }

    const attendancePayload: Omit<Attendance, 'id' | 'checkInTime' | 'date'> = {
      userId: client.id,
      userName: client.name,
      recordedByUserId: currentUser.uid,
      recordedByUserName: userProfile.name,
    };

    const recordedAttendance = await addAttendanceToDB(attendancePayload, currentUser.uid, userProfile.name);

    if (recordedAttendance) {
      toast({ title: "Asistencia Registrada", description: `Entrada de ${client.name} registrada.` });
      // Optimistically add to local state or re-fetch
      await fetchDailyAttendances();
      await fetchMonthlyAttendanceData(); // Re-fetch monthly counts
      setDniInputForAttendance(''); 
    } else {
      toast({ title: "Error", description: "No se pudo registrar la asistencia.", variant: "destructive" });
    }
    setIsRegisteringAttendance(false);
  };
  
  const handleOpenAttendanceHistory = async (user: UserProfile) => {
    setSelectedUserForHistory(user);
    setIsAttendanceHistoryDialogOpen(true);
    setIsLoadingHistory(true);
    try {
      const history = await getAttendancesForUserFromDB(user.id);
      setUserAttendanceHistory(history);
    } catch (error) {
      toast({
        title: "Error al Cargar Historial",
        description: "No se pudo cargar el historial de asistencias.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };


  if (authLoading || (!isAuthenticated && !authLoading && !userProfile)) {
    return (
      <div className="container mx-auto py-8 animate-pulse">
        <div className="flex justify-between items-center mb-8"><div className="h-10 w-1/3 bg-muted rounded"></div><div className="h-10 w-36 bg-muted rounded"></div></div>
        <div className="h-10 w-1/2 bg-muted rounded mb-6"></div>
        <Card className="shadow-lg"><CardHeader><div className="h-8 w-1/4 bg-muted rounded mb-2"></div><div className="h-5 w-1/2 bg-muted rounded"></div></CardHeader>
          <CardContent className="space-y-4">{[...Array(2)].map((_, i) => (<div key={i} className="flex items-center justify-between p-4 border rounded-lg"><div><div className="h-6 w-40 bg-muted rounded mb-1"></div><div className="h-4 w-60 bg-muted rounded"></div></div><div className="space-x-2"><div className="h-8 w-8 bg-muted rounded-md inline-block"></div><div className="h-8 w-8 bg-muted rounded-md inline-block"></div></div></div>))}</CardContent>
        </Card>
      </div>
    );
  }

  if (userProfile && userProfile.role !== 'trainer' && userProfile.role !== 'admin') {
    return <div className="text-center py-10"><p>Cargando o acceso no permitido...</p></div>;
  }

  const pageTitle = userProfile?.role === 'admin' ? "Panel de Administrador" : "Panel de Entrenador/a";
  const currentTabForTabsComponent = activeTab || (availableTabs.length > 0 ? availableTabs[0].value : undefined);

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-4xl font-bold text-foreground">{pageTitle}</h1>
        {userProfile?.role === 'admin' && activeTab === "manage-products" && (
          <Button onClick={handleOpenAddProductDialog} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Producto
          </Button>
        )}
        {(userProfile?.role === 'admin' || userProfile?.role === 'trainer') && activeTab === "manage-classes" && (
          <Button onClick={handleOpenAddClassDialog} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Clase
          </Button>
        )}
      </div>

      {authLoading && <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}

      {!authLoading && userProfile && availableTabs.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No hay secciones disponibles para tu rol ({userProfile.role}).</p>
      )}

      {!authLoading && userProfile && availableTabs.length > 0 && !currentTabForTabsComponent && !dashboardPageLoading && (
        <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-2">Cargando pestañas...</p></div>
      )}

      {!authLoading && userProfile && availableTabs.length > 0 && currentTabForTabsComponent && (
        <Tabs value={currentTabForTabsComponent} onValueChange={setActiveTab}>
          <TabsList className="grid w-full h-auto grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 p-1 rounded-md bg-muted">
            {availableTabs.map(tab => (<TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><tab.icon className="mr-2 h-4 w-4" />{tab.label}</TabsTrigger>))}
          </TabsList>

          {dashboardPageLoading && activeTab && !['reports'].includes(activeTab) && <div className="flex justify-center items-center min-h-[200px] py-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="ml-3">Cargando contenido de {availableTabs.find(t => t.value === activeTab)?.label || 'pestaña'}...</p></div>}

          {!dashboardPageLoading || (dashboardPageLoading && activeTab === 'reports') ? (
            <>
              {availableTabs.find(t => t.value === "manage-classes") && (
                <TabsContent value="manage-classes" className="mt-0">
                  <Card className="shadow-lg">
                    <CardHeader><CardTitle>{userProfile.role === 'admin' ? "Todas las Clases" : "Tus Clases"}</CardTitle><CardDescription>{userProfile.role === 'admin' ? "Ve, añade, edita o elimina todas las clases." : "Ve, añade, edita o elimina tus clases."}</CardDescription></CardHeader>
                    <CardContent>
                      {trainerClasses.length > 0 ? (<div className="space-y-4">{trainerClasses.map(cls => (<div key={cls.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/20 transition-colors"><div><h3 className="font-semibold text-lg text-primary">{cls.name}</h3><p className="text-sm text-muted-foreground">{cls.day} a las {cls.time} - {cls.booked}/{cls.capacity} plazas</p>{userProfile?.role === 'admin' && <p className="text-xs text-muted-foreground">Entrenador/a: {cls.trainerName}</p>}</div><div className="space-x-2 flex-shrink-0"><Button variant="outline" size="icon" onClick={() => handleOpenEditClassDialog(cls)}><Edit3 className="h-4 w-4" /><span className="sr-only">Editar</span></Button><Button variant="destructive" size="icon" onClick={() => handleDeleteClass(cls)}><Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar</span></Button></div></div>))}</div>)
                        : (<p className="text-muted-foreground">No hay clases programadas.</p>)}
                    </CardContent></Card>
                </TabsContent>
              )}

              {availableTabs.find(t => t.value === "manage-products") && userProfile?.role === 'admin' && (
                <TabsContent value="manage-products" className="mt-0">
                  <Card className="shadow-lg">
                    <CardHeader><CardTitle>Productos del Gimnasio</CardTitle><CardDescription>Gestiona el inventario de productos disponibles para la venta.</CardDescription></CardHeader>
                    <CardContent>
                      {products.length > 0 ? (
                        <Table>
                          <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Precio</TableHead><TableHead className="text-right">Stock</TableHead><TableHead>Categoría</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {products.map(product => (
                              <TableRow key={product.id}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{product.description || '-'}</TableCell>
                                <TableCell className="text-right">${(product.cost || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                                <TableCell className={`text-right ${product.stock < 5 ? 'text-destructive font-semibold' : (product.stock < 20 ? 'text-yellow-600' : '')}`}>{product.stock}</TableCell>
                                <TableCell>{product.category === "_no_category_" ? "Sin Categoría" : product.category || '-'}</TableCell>
                                <TableCell className="text-right space-x-2 flex-shrink-0"><Button variant="outline" size="icon" onClick={() => handleOpenEditProductDialog(product)}><Edit3 className="h-4 w-4" /><span className="sr-only">Editar</span></Button><Button variant="destructive" size="icon" onClick={() => handleDeleteProduct(product)}><Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar</span></Button></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (<p className="text-muted-foreground">No hay productos añadidos.</p>)}
                    </CardContent></Card>
                </TabsContent>
              )}

              {availableTabs.find(t => t.value === "manage-cash-flow") && (
                <TabsContent value="manage-cash-flow" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Acciones Rápidas</CardTitle>
                      <CardDescription>Utiliza los botones para registrar la venta de productos o el cobro de servicios y clases.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                      <Button onClick={handleOpenRecordSaleDialog} className="bg-green-600 hover:bg-green-700 text-white">
                        <ShoppingCart className="mr-2 h-4 w-4" /> Registrar Venta de Producto
                      </Button>
                      <Button onClick={handleOpenAddCashTransactionDialog} className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <PlusCircle className="mr-2 h-4 w-4" /> Registrar {userProfile?.role === 'trainer' ? 'Otro Ingreso' : 'Transacción'}
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {userProfile?.role === 'admin' && (
                    <>
                      <Card className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-lg font-medium text-primary">Saldo Actual en Caja</CardTitle>
                          <Button variant="ghost" size="icon" onClick={() => setIsBalanceVisible(!isBalanceVisible)} aria-label={isBalanceVisible ? "Ocultar saldo" : "Mostrar saldo"}>
                            {isBalanceVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <div className={cn("text-3xl font-bold transition-all duration-300 ease-in-out", !isBalanceVisible && 'filter blur-md select-none')}>
                            {isBalanceVisible ? `$${cashBalance.toFixed(2)}` : '$∗∗∗∗∗∗∗'}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Saldo calculado de todas las transacciones registradas.
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="shadow-lg">
                        <CardHeader><CardTitle>Movimientos de Caja</CardTitle><CardDescription>Visualiza los ingresos y egresos.</CardDescription></CardHeader>
                        <CardContent>
                          {cashTransactions.length > 0 ? (
                            <Table>
                              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead><TableHead>Registrado por</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                              <TableBody>
                                {cashTransactions.map(transaction => (
                                  <TableRow key={transaction.id}>
                                    <TableCell className="text-sm text-muted-foreground">{transaction.date.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                                    <TableCell>
                                      <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'} className={cn(transaction.type === 'income' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600', "text-white")}>
                                        {transaction.type === 'income' ? 'Ingreso' : 'Egreso'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{cleanDescription(transaction.description)}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{transaction.recordedByUserName || transaction.recordedByUserId}</TableCell>
                                    <TableCell className={`text-right font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (<p className="text-muted-foreground">No hay transacciones registradas.</p>)}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>
              )}

              {availableTabs.find(t => t.value === "manage-users") && userProfile?.role === 'admin' && (
                <TabsContent value="manage-users" className="mt-0 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{userStats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Clientes y entrenadores activos.</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{userStats.pendingPayments}</div>
                        <p className="text-xs text-muted-foreground">Clientes con cuota vencida.</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-primary"/>
                        Comunicación Masiva
                      </CardTitle>
                      <CardDescription>Envía un mensaje a todos los clientes por correo electrónico o WhatsApp.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <Textarea
                          placeholder="Escribe tu mensaje aquí..."
                          className="resize-y"
                          rows={4}
                          value={bulkMessage}
                          onChange={(e) => setBulkMessage(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-2">
                           <Button onClick={handleSendBulkEmail} disabled={!bulkMessage}>
                            <Mail className="mr-2 h-4 w-4" /> Enviar por Correo
                          </Button>
                          <Button onClick={handleSendBulkWhatsApp} disabled={!bulkMessage} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700">
                             <MessageSquare className="mr-2 h-4 w-4" /> Enviar por WhatsApp
                          </Button>
                        </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>Gestionar Usuarios y Pagos</CardTitle>
                      <CardDescription>Administra roles y estado de pago de los usuarios.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {allUsersForAdminState.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>DNI</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Estado Pago</TableHead>
                                <TableHead>Último Pago</TableHead>
                                <TableHead>Próx. Vencimiento</TableHead>
                                <TableHead className="text-center">Asistencias (Mes)</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allUsersForAdminState.map(u => (
                                <TableRow key={u.id}>
                                  <TableCell className="font-medium whitespace-nowrap">{u.name}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    <div>{u.email}</div>
                                    <div>{u.phone || "Sin teléfono"}</div>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {u.dni || "No especificado"}
                                  </TableCell>
                                  <TableCell className="capitalize">{u.role}</TableCell>
                                  <TableCell>{getPaymentStatusBadge(u)}</TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {u.lastPaymentDate ? formatDateFns(new Date(u.lastPaymentDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {u.paymentDueDate ? formatDateFns(new Date(u.paymentDueDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-center font-semibold text-lg">{monthlyAttendances[u.id]?.count || 0}</TableCell>
                                  <TableCell className="text-right space-x-1 whitespace-nowrap">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenAttendanceHistory(u)} className="text-xs">
                                        <History className="mr-1 h-3 w-3" /> Historial
                                    </Button>
                                    {u.role === 'client' && (
                                      <Button variant="outline" size="sm" onClick={() => handleOpenAddPaymentDialog(u)} className="text-xs" disabled={isSavingPayment}>
                                        <CreditCard className="mr-1 h-3 w-3" /> Registrar Pago
                                      </Button>
                                    )}
                                    {u.id !== currentUser?.uid && (
                                      <>
                                        {u.role === 'client' && (
                                          <Button size="sm" onClick={() => handleChangeUserRole(u.id, 'trainer')} className="bg-green-600 hover:bg-green-700 text-white text-xs" disabled={isUpdatingRole[u.id]}>
                                            {isUpdatingRole[u.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowDownUp className="h-3 w-3 transform rotate-180" />} Promover
                                          </Button>
                                        )}
                                        {u.role === 'trainer' && (
                                          <Button size="sm" variant="destructive" onClick={() => handleChangeUserRole(u.id, 'client')} className="text-xs" disabled={isUpdatingRole[u.id]}>
                                            {isUpdatingRole[u.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowDownUp className="h-3 w-3" />} Degradar
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    {u.id === currentUser?.uid && (<Badge variant="secondary">Admin (Tú)</Badge>)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No hay otros usuarios para mostrar.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
              
              {availableTabs.find(t => t.value === "manage-attendance") && (
                <TabsContent value="manage-attendance" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 shadow-lg">
                      <CardHeader>
                        <CardTitle>Registrar Entrada por DNI</CardTitle>
                        <CardDescription>Ingresa el DNI de un cliente para marcar su asistencia.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2">
                           <Input
                              type="text"
                              placeholder="Número de DNI del cliente"
                              value={dniInputForAttendance}
                              onChange={(e) => setDniInputForAttendance(e.target.value)}
                              disabled={isRegisteringAttendance}
                            />
                            <Button 
                              onClick={handleRegisterAttendance} 
                              disabled={isRegisteringAttendance || !dniInputForAttendance.trim()}
                              className="bg-accent text-accent-foreground hover:bg-accent/90"
                            >
                              {isRegisteringAttendance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogInIcon className="mr-2 h-4 w-4" />}
                              {isRegisteringAttendance ? "" : "Presente"}
                            </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 shadow-lg">
                      <CardHeader>
                        <CardTitle>Asistencias del Día ({formatDateFns(new Date(), 'dd/MM/yyyy')})</CardTitle>
                        <CardDescription>Entradas registradas hoy.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {dailyAttendances.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Hora Entrada</TableHead>
                                <TableHead>Registrado por</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dailyAttendances.map(att => (
                                <TableRow key={att.id}>
                                  <TableCell className="font-medium">{att.userName}</TableCell>
                                  <TableCell>{att.checkInTime instanceof Timestamp ? formatDateFns(att.checkInTime.toDate(), 'HH:mm:ss') : 'Hora inválida'}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{att.recordedByUserName}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground">No hay asistencias registradas hoy.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )}

              {availableTabs.find(t => t.value === "attendance-ranking") && (
                <TabsContent value="attendance-ranking" className="mt-0">
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>Ranking de Asistencia Mensual</CardTitle>
                      <CardDescription>Clientes con más asistencias en el mes actual ({formatDateFns(new Date(), 'MMMM yyyy', { locale: es })}).</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {attendanceRanking.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[80px]">Puesto</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead className="text-right">Asistencias</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendanceRanking.map((rankingItem, index) => (
                              <TableRow key={rankingItem.userId}>
                                <TableCell className="font-bold text-lg text-center">
                                  {index === 0 ? (
                                    <Medal className="h-7 w-7 text-yellow-400 inline-block" />
                                  ) : index === 1 ? (
                                    <Medal className="h-7 w-7 text-slate-400 inline-block" />
                                  ) : index === 2 ? (
                                    <Medal className="h-7 w-7 text-orange-400 inline-block" />
                                  ) : (
                                    <span className="text-primary">{index + 1}</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{rankingItem.userName}</TableCell>
                                <TableCell className="text-right font-semibold text-lg">{rankingItem.count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-center py-6">No hay registros de asistencia para el mes actual.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {availableTabs.find(t => t.value === 'reports') && userProfile?.role === 'admin' && (
                <TabsContent value="reports" className="mt-0">
                  <ReportsTab />
                </TabsContent>
              )}
            </>
          ) : (
            <div className="flex justify-center items-center min-h-[200px] py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="ml-3">Cargando...</p>
            </div>
          )}
        </Tabs>
      )}

      {currentUser && userProfile && (<Dialog open={isAddClassDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseAddClassDialog(false); else setIsAddClassDialogOpen(true); }}><DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle>Añadir Nueva Clase</DialogTitle><DialogDescription>Completa los detalles para crear una nueva clase.</DialogDescription></DialogHeader><AddClassForm onSubmit={handleSaveNewClass} onCancel={() => handleCloseAddClassDialog(false)} currentUserProfile={userProfile} allTrainers={userProfile.role === 'admin' ? availableTrainers : []} /></DialogContent></Dialog>)}
      {currentUser && userProfile && editingClass && (<Dialog open={isEditClassDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseEditClassDialog(false); else setIsEditClassDialogOpen(true); }}><DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle>Editar Clase</DialogTitle><DialogDescription>Modifica los detalles de la clase.</DialogDescription></DialogHeader><AddClassForm onSubmit={handleSaveEditedClass} onCancel={() => handleCloseEditClassDialog(false)} currentUserProfile={userProfile} allTrainers={userProfile.role === 'admin' ? availableTrainers : []} initialData={editingClass} isEditMode={true} /></DialogContent></Dialog>)}
      <AlertDialog open={isDeleteClassConfirmOpen} onOpenChange={(isOpen) => { setIsDeleteClassConfirmOpen(isOpen); if (!isOpen) setClassToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción eliminará permanentemente la clase: "{classToDelete?.name}" y sus reservas.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => { setIsDeleteClassConfirmOpen(false); setClassToDelete(null); }}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      {userProfile?.role === 'admin' && (<Dialog open={isAddProductDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseAddProductDialog(false); else setIsAddProductDialogOpen(true); }}><DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle>Añadir Nuevo Producto</DialogTitle><DialogDescription>Completa los detalles para añadir un nuevo producto al inventario.</DialogDescription></DialogHeader><AddProductForm onSubmit={handleSaveNewProduct} onCancel={() => handleCloseAddProductDialog(false)} isSaving={isSavingProduct} /></DialogContent></Dialog>)}
      {userProfile?.role === 'admin' && editingProduct && (<Dialog open={isEditProductDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseEditProductDialog(false); else setIsEditProductDialogOpen(true); }}><DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle>Editar Producto</DialogTitle><DialogDescription>Modifica los detalles del producto.</DialogDescription></DialogHeader><AddProductForm onSubmit={handleSaveEditedProduct} onCancel={() => handleCloseEditProductDialog(false)} initialData={editingProduct} isEditMode={true} isSaving={isSavingProduct} /></DialogContent></Dialog>)}
      {userProfile?.role === 'admin' && (<AlertDialog open={isDeleteProductConfirmOpen} onOpenChange={(isOpen) => { setIsDeleteProductConfirmOpen(isOpen); if (!isOpen) setProductToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción eliminará permanentemente el producto: "{productToDelete?.name}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => { setIsDeleteProductConfirmOpen(false); setProductToDelete(null); }}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}

      {userProfile && ['admin', 'trainer'].includes(userProfile.role) && (
        <Dialog open={isAddCashTransactionDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseAddCashTransactionDialog(false); else setIsAddCashTransactionDialogOpen(true); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar {userProfile?.role === 'trainer' ? 'Ingreso en Caja' : 'Transacción de Caja'}</DialogTitle>
              <DialogDescription>
                {userProfile?.role === 'trainer' ? 'Añade un nuevo ingreso por cobro de clases o servicios.' : 'Añade un nuevo ingreso o egreso.'}
              </DialogDescription>
            </DialogHeader>
            <AddCashTransactionForm
              onSubmit={handleSaveNewCashTransaction}
              onCancel={() => handleCloseAddCashTransactionDialog(false)}
              isSaving={isSavingCashTransaction}
              userRole={userProfile.role}
            />
          </DialogContent>
        </Dialog>
      )}

      {userProfile?.role === 'admin' && selectedUserForPayment && (
        <Dialog open={isAddPaymentDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseAddPaymentDialog(); else setIsAddPaymentDialogOpen(true); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar Pago de Cuota</DialogTitle>
              <DialogDescription>Completa los detalles del pago de membresía para {selectedUserForPayment.name}.</DialogDescription>
            </DialogHeader>
            <AddMembershipPaymentForm
              onSubmit={handleSaveNewPayment}
              onCancel={handleCloseAddPaymentDialog}
              isSaving={isSavingPayment}
              clientName={selectedUserForPayment.name}
              currentDueDate={selectedUserForPayment.paymentDueDate}
            />
          </DialogContent>
        </Dialog>
      )}

      {userProfile && ['admin', 'trainer'].includes(userProfile.role) && (
        <Dialog open={isRecordSaleDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseRecordSaleDialog(false); else setIsRecordSaleDialogOpen(true); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Venta</DialogTitle>
              <DialogDescription>Selecciona productos y cantidades para registrar una venta.</DialogDescription>
            </DialogHeader>
            <RecordSaleForm
              onSubmit={handleSaveNewSale}
              onCancel={() => handleCloseRecordSaleDialog(false)}
              isSaving={isSavingSale}
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedUserForHistory && (
        <Dialog open={isAttendanceHistoryDialogOpen} onOpenChange={setIsAttendanceHistoryDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Historial de Asistencia</DialogTitle>
              <DialogDescription>
                Mostrando todas las entradas registradas para {selectedUserForHistory.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-4">
              {isLoadingHistory ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : userAttendanceHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Hora Entrada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userAttendanceHistory.map(att => (
                      <TableRow key={att.id}>
                        <TableCell>
                          {att.checkInTime instanceof Timestamp 
                            ? formatDateFns(att.checkInTime.toDate(), 'PPP', { locale: es }) 
                            : 'Fecha inválida'}
                        </TableCell>
                        <TableCell className="text-right">
                          {att.checkInTime instanceof Timestamp 
                            ? formatDateFns(att.checkInTime.toDate(), 'p', { locale: es }) 
                            : 'Hora inválida'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay asistencias registradas para este usuario.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

    