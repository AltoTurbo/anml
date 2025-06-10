
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc as firestoreDoc, Timestamp } from 'firebase/firestore'; // Asegúrate de importar doc como firestoreDoc si 'doc' ya está usado
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
} from '@/lib/mockData';
import AddClassForm, { type AddClassFormValues } from '@/components/forms/AddClassForm';
import { PlusCircle, Edit3, Trash2, UserCog, ListOrdered, ArrowDownUp, Loader2, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';


export default function TrainerDashboardPage() {
  const { currentUser, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [trainerClasses, setTrainerClasses] = useState<ClassOffering[]>([]);
  const [allUsersForAdminState, setAllUsersForAdminState] = useState<UserProfile[]>([]);
  const [availableTrainers, setAvailableTrainers] = useState<Trainer[]>([]);
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [isEditClassDialogOpen, setIsEditClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassOffering | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassOffering | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isUpdatingRole, setIsUpdatingRole] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  // Estado local para los detalles de pago que se están editando
  const [localPaymentDetails, setLocalPaymentDetails] = useState<Record<string, { status: UserProfile['paymentStatus'], dueDate: string }>>({});
  const [updatingPaymentStates, setUpdatingPaymentStates] = useState<Record<string, boolean>>({});


  const fetchClassesForDashboard = useCallback(async () => {
    if (!currentUser || !userProfile) return;
    let classesFromDB = await getClassOfferingsFromDB();
    if (userProfile.role === 'trainer') {
      classesFromDB = classesFromDB.filter(c => c.trainerId === currentUser.uid);
    }
    setTrainerClasses(classesFromDB.sort((a,b) => a.name.localeCompare(b.name)));
  }, [currentUser, userProfile]);

  const fetchAllUsersForAdmin = useCallback(async () => {
    if (!currentUser || userProfile?.role !== 'admin') {
      setAllUsersForAdminState([]);
      setAvailableTrainers([]);
      return;
    }
    console.log("fetchAllUsersForAdmin: Iniciando carga de usuarios y entrenadores desde Firestore...");
    let fetchedUsers: UserProfile[] = [];
    try {
        const usersCollectionRef = collection(db, "users");
        const querySnapshot = await getDocs(usersCollectionRef);
        querySnapshot.forEach((doc) => {
            const data = doc.data() as UserProfile;
            console.log(`fetchAllUsersForAdmin: Documento crudo de Firestore (ID: ${doc.id}):`, JSON.parse(JSON.stringify(data)));
            if (data.name && data.email && data.role) {
                 fetchedUsers.push({ id: doc.id, ...data });
            } else {
                console.warn(`fetchAllUsersForAdmin: Documento de usuario con ID ${doc.id} no tiene todos los campos esperados (name, email, role). Será omitido.`);
            }
        });
        
        const filteredUsersForDisplay = fetchedUsers
          .filter(u => u.id !== currentUser.uid) 
          .sort((a,b) => a.name.localeCompare(b.name)); 
        
        setAllUsersForAdminState(filteredUsersForDisplay);
        console.log("fetchAllUsersForAdmin: Usuarios para gestión (filtrados y ordenados) seteados en estado:", JSON.parse(JSON.stringify(filteredUsersForDisplay)));

        const trainersFromFirestore = fetchedUsers
            .filter(u => u.role === 'trainer')
            .map(u => ({ 
                id: u.id, 
                name: u.name, 
                email: u.email,
                specialty: u.specialty || 'Entrenador/a', 
                bio: u.bio || 'Biografía pendiente.', 
                imageUrl: u.imageUrl || `https://placehold.co/100x100.png?text=${u.name.split(' ').map(n=>n[0]).join('')}`
            } as Trainer));
        setAvailableTrainers(trainersFromFirestore);
        console.log("fetchAllUsersForAdmin: Entrenadores disponibles cargados:", trainersFromFirestore);

    } catch (error) {
        console.error("Error obteniendo usuarios de Firestore para el panel de admin:", error);
        toast({ title: "Error al Cargar Usuarios", description: "No se pudieron cargar los usuarios desde la base de datos.", variant: "destructive" });
        setAllUsersForAdminState([]); 
        setAvailableTrainers([]);
    }
  }, [currentUser, userProfile, toast]);


  useEffect(() => {
    if (authLoading) {
      setPageLoading(true);
      return;
    }

    if (!isAuthenticated || !userProfile) {
      router.push('/');
      setPageLoading(false);
      return;
    }

    if (userProfile.role !== 'trainer' && userProfile.role !== 'admin') {
      router.push('/');
      setPageLoading(false);
      return;
    }
    
    const TABS_CONFIG_LOCAL = [
        { value: "manage-classes", label: "Gestionar Clases", icon: ListOrdered, roles: ['admin', 'trainer'] },
        { value: "manage-users", label: "Gestionar Usuarios y Pagos", icon: UserCog, roles: ['admin'] },
    ];
    const availableTabsLocal = TABS_CONFIG_LOCAL.filter(tab => userProfile && tab.roles.includes(userProfile.role));
    const currentActiveTab = activeTab || (availableTabsLocal.length > 0 ? availableTabsLocal[0].value : "");
     if (!activeTab && currentActiveTab) { // Establecer activeTab si aún no está definido
        setActiveTab(currentActiveTab);
    }


    const loadDashboardData = async () => {
      if (!currentActiveTab) return; // No cargar si no hay pestaña activa

      setPageLoading(true);
      console.log("loadDashboardData: Cargando datos para la pestaña:", currentActiveTab);
      
      if (currentActiveTab === "manage-classes") {
        await fetchClassesForDashboard();
        if (userProfile.role === 'admin') { 
            await fetchAllUsersForAdmin(); // Esto es para el selector de entrenadores en el form de clases
        }
      } else if (currentActiveTab === "manage-users") {
        if (userProfile.role === 'admin') {
          await fetchAllUsersForAdmin(); // Esto carga allUsersForAdminState Y availableTrainers
        }
      }
      setPageLoading(false);
      console.log("loadDashboardData: Carga completada.");
    };

    if (currentActiveTab) {
      loadDashboardData();
    }

  }, [currentUser, userProfile, isAuthenticated, authLoading, router, fetchClassesForDashboard, fetchAllUsersForAdmin, activeTab]);


  const handleOpenAddClassDialog = () => setIsAddClassDialogOpen(true);
  const handleCloseAddClassDialog = async (reloadData = false) => {
    setIsAddClassDialogOpen(false);
    if (reloadData) {
      setPageLoading(true);
      await fetchClassesForDashboard();
      if (userProfile?.role === 'admin') { // Si es admin, los entrenadores se recargan con fetchAllUsersForAdmin
        await fetchAllUsersForAdmin();
      }
      setPageLoading(false);
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
      toast({ title: "Clase Añadida", description: `La clase "${addedClass.name}" ha sido añadida con éxito.` });
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
      setPageLoading(true);
      await fetchClassesForDashboard();
      if (userProfile?.role === 'admin') {
        await fetchAllUsersForAdmin();
      }
      setPageLoading(false);
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
        booked: editingClass.booked, 
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
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    const success = await deleteClassFromDB(classToDelete.id);
    if (success) {
      toast({ title: "Clase Eliminada", description: `La clase "${classToDelete.name}" ha sido eliminada.`});
    } else {
      toast({ title: "Error", description: "No se pudo eliminar la clase.", variant: "destructive" });
    }
    setIsDeleteConfirmOpen(false);
    setClassToDelete(null);
    setPageLoading(true);
    await fetchClassesForDashboard();
    setPageLoading(false);
  };

  const handleChangeUserRole = async (userIdToChange: string, newRole: 'client' | 'trainer') => {
    if (!currentUser || !userProfile || userProfile.role !== 'admin') {
      toast({ title: "Error de Permiso", description: "Solo los administradores pueden cambiar roles.", variant: "destructive" });
      return;
    }
    if (currentUser.uid === userIdToChange) {
        toast({ title: "Acción no permitida", description: "Los administradores no pueden cambiar su propio rol desde esta interfaz.", variant: "destructive" });
        return;
    }

    setIsUpdatingRole(prev => ({ ...prev, [userIdToChange]: true }));
    
    const userToUpdate = await getUserProfileFromDB(userIdToChange);
    if (!userToUpdate) {
      toast({ title: "Error", description: "Usuario no encontrado en Firestore.", variant: "destructive" });
      setIsUpdatingRole(prev => ({ ...prev, [userIdToChange]: false }));
      return;
    }

    const updatedProfileData: UserProfile = { ...userToUpdate, role: newRole };
    const success = await saveUserProfileToDB(updatedProfileData);

    if (success) {
      toast({
        title: "Rol Actualizado",
        description: `${userToUpdate.name} ahora es ${newRole === 'trainer' ? 'Entrenador/a' : 'Cliente'}.`,
      });
      // Actualizar el estado local para reflejar el cambio en la UI
      setAllUsersForAdminState(prevUsers => 
        prevUsers.map(u => 
          u.id === userIdToChange ? { ...u, role: newRole } : u
        )
      );
      // Actualizar la lista de entrenadores disponibles
      if (newRole === 'trainer') {
        // Añadir o actualizar en availableTrainers
        const existingTrainerIndex = availableTrainers.findIndex(t => t.id === userIdToChange);
        const newTrainerData = { 
            id: userToUpdate.id, 
            name: userToUpdate.name, 
            email: userToUpdate.email,
            specialty: userToUpdate.specialty || 'Entrenador/a', 
            bio: userToUpdate.bio || 'Biografía pendiente.',
            imageUrl: userToUpdate.imageUrl || `https://placehold.co/100x100.png?text=${userToUpdate.name.split(' ').map(n=>n[0]).join('')}`
        };
        if (existingTrainerIndex > -1) {
            setAvailableTrainers(prev => prev.map((t, i) => i === existingTrainerIndex ? newTrainerData : t));
        } else {
            setAvailableTrainers(prev => [...prev, newTrainerData]);
        }
      } else { 
        setAvailableTrainers(prev => prev.filter(t => t.id !== userIdToChange));
      }
    } else {
      toast({
        title: "Error al Actualizar Rol",
        description: `No se pudo cambiar el rol de ${userToUpdate.name}.`,
        variant: "destructive",
      });
    }
    setIsUpdatingRole(prev => ({ ...prev, [userIdToChange]: false }));
  };

  const handleUpdatePaymentDetails = async (userIdToUpdate: string) => {
    if (!userProfile || userProfile.role !== 'admin') return;
    if (!localPaymentDetails[userIdToUpdate]) {
      toast({ title: "Sin cambios", description: "No hay cambios en los detalles de pago para guardar.", variant: "default" });
      return;
    }

    setUpdatingPaymentStates(prev => ({ ...prev, [userIdToUpdate]: true }));

    const { status, dueDate } = localPaymentDetails[userIdToUpdate];
    const userDocRef = firestoreDoc(db, 'users', userIdToUpdate);

    try {
      await updateDoc(userDocRef, {
        paymentStatus: status,
        paymentDueDate: dueDate,
      });
      toast({ title: "Pago Actualizado", description: "Los detalles de pago del usuario han sido actualizados." });
      // Actualizar el estado local para reflejar el cambio en la UI
      setAllUsersForAdminState(prevUsers =>
        prevUsers.map(u =>
          u.id === userIdToUpdate ? { ...u, paymentStatus: status, paymentDueDate: dueDate } : u
        )
      );
      // Limpiar los detalles locales para este usuario después de guardar
      setLocalPaymentDetails(prev => {
        const newState = { ...prev };
        delete newState[userIdToUpdate];
        return newState;
      });
    } catch (error) {
      console.error("Error actualizando detalles de pago:", error);
      toast({ title: "Error al Actualizar Pago", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    } finally {
      setUpdatingPaymentStates(prev => ({ ...prev, [userIdToUpdate]: false }));
    }
  };

  // Handler para cambios en los inputs de pago
  const handlePaymentDetailChange = (userId: string, field: 'status' | 'dueDate', value: string | UserProfile['paymentStatus']) => {
    setLocalPaymentDetails(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        status: field === 'status' ? (value as UserProfile['paymentStatus']) : (prev[userId]?.status || allUsersForAdminState.find(u => u.id === userId)?.paymentStatus || 'pending'),
        dueDate: field === 'dueDate' ? (value as string) : (prev[userId]?.dueDate || allUsersForAdminState.find(u => u.id === userId)?.paymentDueDate || ''),
      }
    }));
  };
  
  const getPaymentStatusBadge = (status?: UserProfile['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500 text-white"><CheckCircle className="mr-1 h-3 w-3" /> Pagado</Badge>;
      case 'unpaid':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> No Pagado</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="bg-yellow-500 text-black"><AlertCircle className="mr-1 h-3 w-3" /> Pendiente</Badge>;
    }
  };


  if (authLoading || pageLoading) {
     return (
      <div className="container mx-auto py-8 animate-pulse">
        <div className="flex justify-between items-center mb-8">
          <div className="h-10 w-1/3 bg-muted rounded"></div>
          <div className="h-10 w-36 bg-muted rounded"></div>
        </div>
        <div className="h-10 w-1/2 bg-muted rounded mb-6"></div>
        <Card className="shadow-lg">
          <CardHeader>
            <div className="h-8 w-1/4 bg-muted rounded mb-2"></div>
            <div className="h-5 w-1/2 bg-muted rounded"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="h-6 w-40 bg-muted rounded mb-1"></div>
                  <div className="h-4 w-60 bg-muted rounded"></div>
                </div>
                <div className="space-x-2">
                  <div className="h-8 w-8 bg-muted rounded-md inline-block"></div>
                  <div className="h-8 w-8 bg-muted rounded-md inline-block"></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
     );
  }

  if (!userProfile) {
    return <div className="text-center py-10"><p>Cargando perfil o acceso no autorizado...</p></div>;
  }

  const pageTitle = userProfile.role === 'admin' ? "Panel de Administrador" : "Panel de Entrenador/a";

  const TABS_CONFIG = [
    { value: "manage-classes", label: "Gestionar Clases", icon: ListOrdered, roles: ['admin', 'trainer'] },
    { value: "manage-users", label: "Gestionar Usuarios y Pagos", icon: UserCog, roles: ['admin'] },
  ];

  const availableTabs = TABS_CONFIG.filter(tab => userProfile && tab.roles.includes(userProfile.role));
  const defaultTabValue = activeTab || (availableTabs.length > 0 ? availableTabs[0].value : "");


  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-foreground">{pageTitle}</h1>
        { (activeTab === "manage-classes" && (userProfile.role === 'admin' || userProfile.role === 'trainer')) && (
            <Button onClick={handleOpenAddClassDialog} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Clase
            </Button>
        )}
      </div>

      <Tabs value={defaultTabValue} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${availableTabs.length > 1 ? `md:grid-cols-${availableTabs.length}` : 'md:grid-cols-1'} md:w-auto`}>
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="mr-2 h-4 w-4" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {availableTabs.find(t => t.value === "manage-classes") && (
            <TabsContent value="manage-classes" className="mt-6">
                <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>{userProfile.role === 'admin' ? "Todas las Clases" : "Tus Clases"}</CardTitle>
                    <CardDescription>{userProfile.role === 'admin' ? "Ve, añade, edita o elimina todas las clases programadas." : "Ve, añade, edita o elimina tus clases programadas."}</CardDescription>
                </CardHeader>
                <CardContent>
                    {trainerClasses.length > 0 ? (
                    <div className="space-y-4">
                        {trainerClasses.map(cls => (
                        <div key={cls.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/20 transition-colors">
                            <div>
                            <h3 className="font-semibold text-lg text-primary">{cls.name}</h3>
                            <p className="text-sm text-muted-foreground">{cls.day} a las {cls.time} - {cls.booked}/{cls.capacity} plazas</p>
                            {userProfile?.role === 'admin' && <p className="text-xs text-muted-foreground">Entrenador/a: {cls.trainerName}</p>}
                            </div>
                            <div className="space-x-2">
                            <Button variant="outline" size="icon" onClick={() => handleOpenEditClassDialog(cls)}>
                                <Edit3 className="h-4 w-4" />
                                <span className="sr-only">Editar Clase</span>
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDeleteClass(cls)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar Clase</span>
                            </Button>
                            </div>
                        </div>
                        ))}
                    </div>
                    ) : (
                    <p className="text-muted-foreground">{pageLoading ? "Cargando clases..." : "No hay clases programadas. ¡Añade una para empezar!"}</p>
                    )}
                </CardContent>
                </Card>
            </TabsContent>
        )}

        {availableTabs.find(t => t.value === "manage-users") && userProfile?.role === 'admin' && (
            <TabsContent value="manage-users" className="mt-6">
                <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Gestionar Usuarios y Pagos</CardTitle>
                    <CardDescription>Ve y gestiona los roles y el estado de pago de los usuarios del sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    {allUsersForAdminState.length > 0 ? (
                    <div className="space-y-4">
                        {allUsersForAdminState.map(u => {
                          console.log('Renderizando usuario en Gestionar Usuarios:', JSON.parse(JSON.stringify(u)));
                          return (
                            <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-secondary/20 transition-colors">
                                <div className="flex-grow mb-4 sm:mb-0">
                                <h3 className="font-semibold text-lg text-foreground">{u.name}</h3>
                                <p className="text-sm text-muted-foreground">{u.email} - Rol: <span className="font-medium capitalize">{u.role}</span></p>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                {u.id !== currentUser?.uid && ( 
                                    <> 
                                    {u.role === 'client' && (
                                        <Button
                                        size="sm"
                                        onClick={() => handleChangeUserRole(u.id, 'trainer')}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        disabled={isUpdatingRole[u.id]}
                                        >
                                        {isUpdatingRole[u.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownUp className="mr-2 h-4 w-4 transform rotate-180" />}
                                        Promover a Entrenador/a
                                        </Button>
                                    )}
                                    {u.role === 'trainer' && (
                                        <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleChangeUserRole(u.id, 'client')}
                                        disabled={isUpdatingRole[u.id]}
                                        >
                                        {isUpdatingRole[u.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownUp className="mr-2 h-4 w-4" />}
                                        Degradar a Cliente
                                        </Button>
                                    )}
                                    </>
                                )}
                                {u.id === currentUser?.uid && ( 
                                    <Button size="sm" variant="outline" disabled>Rol de Administrador (Actual)</Button>
                                )}
                                </div>

                                {u.role === 'client' && (
                                <div className="mt-4 sm:mt-0 sm:ml-6 p-4 border rounded-md bg-muted/20 space-y-3 w-full sm:w-auto flex-shrink-0">
                                    <p className="text-sm font-medium text-foreground mb-1">Estado del Pago:</p>
                                    <div className="mb-3">{getPaymentStatusBadge(u.paymentStatus)}</div>
                                    
                                    <div className="space-y-1">
                                    <Label htmlFor={`payment-status-${u.id}`} className="text-xs">Cambiar Estado</Label>
                                    <Select
                                        value={localPaymentDetails[u.id]?.status || u.paymentStatus || 'pending'}
                                        onValueChange={(value) => handlePaymentDetailChange(u.id, 'status', value as UserProfile['paymentStatus'])}
                                    >
                                        <SelectTrigger id={`payment-status-${u.id}`} className="h-9">
                                        <SelectValue placeholder="Seleccionar estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                        <SelectItem value="pending">Pendiente</SelectItem>
                                        <SelectItem value="paid">Pagado</SelectItem>
                                        <SelectItem value="unpaid">No Pagado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    </div>

                                    <div className="space-y-1">
                                    <Label htmlFor={`payment-due-${u.id}`} className="text-xs">Próximo Vencimiento</Label>
                                    <Input
                                        id={`payment-due-${u.id}`}
                                        type="date"
                                        className="h-9"
                                        value={localPaymentDetails[u.id]?.dueDate || u.paymentDueDate || ''}
                                        onChange={(e) => handlePaymentDetailChange(u.id, 'dueDate', e.target.value)}
                                    />
                                    </div>
                                    <Button 
                                        size="sm" 
                                        className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
                                        onClick={() => handleUpdatePaymentDetails(u.id)}
                                        disabled={updatingPaymentStates[u.id] || !localPaymentDetails[u.id]}
                                    >
                                        {updatingPaymentStates[u.id] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Actualizar Pago
                                    </Button>
                                </div>
                                )}
                            </div>
                          )
                        })}
                    </div>
                    ) : (
                    <p className="text-muted-foreground">{pageLoading ? "Cargando usuarios..." : "No hay otros usuarios para mostrar o no se han podido cargar."}</p>
                    )}
                </CardContent>
                </Card>
            </TabsContent>
        )}
      </Tabs>

      {currentUser && userProfile && (
        <Dialog open={isAddClassDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                handleCloseAddClassDialog(false); 
            } else {
                setIsAddClassDialogOpen(true);
            }
        }}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                <DialogTitle>Añadir Nueva Clase</DialogTitle>
                <DialogDescription>
                    Completa los detalles para crear una nueva clase.
                </DialogDescription>
                </DialogHeader>
                <AddClassForm
                    onSubmit={handleSaveNewClass}
                    onCancel={() => handleCloseAddClassDialog(false)}
                    currentUserProfile={userProfile} 
                    allTrainers={userProfile.role === 'admin' ? availableTrainers : []}
                />
            </DialogContent>
        </Dialog>
      )}

      {currentUser && userProfile && editingClass && (
        <Dialog open={isEditClassDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                handleCloseEditClassDialog(false); 
            } else {
                setIsEditClassDialogOpen(true);
            }
        }}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                <DialogTitle>Editar Clase</DialogTitle>
                <DialogDescription>
                    Modifica los detalles de la clase.
                </DialogDescription>
                </DialogHeader>
                <AddClassForm
                    onSubmit={handleSaveEditedClass}
                    onCancel={() => handleCloseEditClassDialog(false)}
                    currentUserProfile={userProfile} 
                    allTrainers={userProfile.role === 'admin' ? availableTrainers : []}
                    initialData={editingClass}
                    isEditMode={true}
                />
            </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={(isOpen) => {
          setIsDeleteConfirmOpen(isOpen);
          if (!isOpen) setClassToDelete(null); 
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la clase: "{classToDelete?.name}" y cancelará todas sus reservas confirmadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setIsDeleteConfirmOpen(false); setClassToDelete(null);}}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
