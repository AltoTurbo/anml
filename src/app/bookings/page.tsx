
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBookingsForUserFromDB, cancelBookingInDB, type Booking } from "@/lib/mockData"; 
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CalendarX, ListChecks, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Timestamp } from 'firebase/firestore'; // Mantener si se usa BookingDate como Timestamp en algún punto


interface UserBookingDisplay extends Omit<Booking, 'bookingDate'> {
  bookingDate: string; 
  className: string; 
}

export default function BookingsPage() {
  // currentUser de Firebase Auth, userProfile de Firestore
  const { currentUser, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [userBookings, setUserBookings] = useState<UserBookingDisplay[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [cancellingStates, setCancellingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { // Si no está cargando y no está autenticado
      router.push('/login?redirect=/bookings');
      toast({ title: "Acceso Denegado", description: "Por favor, inicia sesión para ver tus reservas.", variant: "destructive"});
      setPageLoading(false); 
      return;
    }
    
    // Si está autenticado (currentUser existe) y el perfil de Firestore (userProfile) también existe
    if (isAuthenticated && currentUser && userProfile) {
      const fetchBookings = async () => {
        setPageLoading(true);
        // Usar currentUser.uid para obtener las reservas
        const bookingsFromDB = await getBookingsForUserFromDB(currentUser.uid);
        const displayBookings = bookingsFromDB.map(b => ({
          ...b,
          // Asegurar que bookingDate se formatea correctamente (ya debería ser string ISO desde mockData)
          bookingDate: new Date(b.bookingDate as string).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
          className: b.className || "Clase Desconocida",
        }));
        setUserBookings(displayBookings);
        setPageLoading(false);
      };
      fetchBookings();
    } else if (!authLoading && isAuthenticated && !userProfile) {
      // Autenticado pero perfil no cargado/no existe, puede ser un estado intermedio o error
      console.warn("Usuario autenticado pero perfil no disponible para cargar reservas.");
      setPageLoading(false);
    } else if (!authLoading && !isAuthenticated) {
      setPageLoading(false); // Detener si ya se determinó que no está autenticado
    }

  }, [currentUser, userProfile, isAuthenticated, authLoading, router, toast]);

  const handleCancelBooking = async (bookingId: string, classId: string) => {
    setCancellingStates(prev => ({ ...prev, [bookingId]: true }));
    const success = await cancelBookingInDB(bookingId, classId);
    
    if (success) {
      setUserBookings(prevBookings => prevBookings.filter(b => b.id !== bookingId));
      toast({
        title: "Reserva Cancelada",
        description: "Tu reserva de clase ha sido cancelada con éxito.",
      });
    } else {
      toast({
        title: "Error al Cancelar",
        description: "No se pudo cancelar la reserva. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
    setCancellingStates(prev => ({ ...prev, [bookingId]: false }));
  };
  
  if (authLoading || pageLoading) {
    return (
       <div className="space-y-6 container mx-auto py-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-lg animate-pulse">
              <CardHeader>
                <div className="h-6 w-3/4 bg-muted rounded mb-1"></div>
                <div className="h-4 w-1/2 bg-muted rounded"></div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-4 w-full bg-muted rounded"></div>
                <div className="h-4 w-2/3 bg-muted rounded"></div>
              </CardContent>
              <CardFooter>
                <div className="h-10 w-1/3 bg-muted rounded"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
    );
  }

  // Verificar si está autenticado y si el userProfile existe y tiene el rol adecuado
  if (!isAuthenticated || !userProfile || (userProfile.role !== 'client' && userProfile.role !== 'admin')) {
     return (
      <div className="flex flex-col items-center justify-center text-center py-10">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Acceso Restringido</h2>
        <p className="text-muted-foreground mb-6">
          {isAuthenticated && userProfile ? "Solo clientes y administradores pueden ver sus reservas aquí." : "Por favor, inicia sesión para ver tus reservas."}
        </p>
        <Button onClick={() => router.push('/')}>Ir a la Página Principal</Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-foreground flex items-center gap-3"><ListChecks /> Mis Reservas</h1>
      </div>

      {userBookings.length === 0 ? (
        <div className="text-center py-10">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">No tienes reservas activas.</p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/schedule">Reservar una Clase</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userBookings.map((booking) => (
            <Card key={booking.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl text-primary">{booking.className}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">Reservado el: {booking.bookingDate}</p>
                <p className="text-sm text-green-600 font-medium mt-2">Estado: {booking.status.toUpperCase() === 'CONFIRMED' ? 'CONFIRMADA' : booking.status.toUpperCase()}</p>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => handleCancelBooking(booking.id, booking.classId)}
                  disabled={cancellingStates[booking.id]}
                >
                  {cancellingStates[booking.id] ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarX className="mr-2 h-4 w-4" />
                  )}
                  {cancellingStates[booking.id] ? "Cancelando..." : "Cancelar Reserva"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
