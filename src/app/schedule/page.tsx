
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClassOfferingsFromDB, addBookingToDB, type ClassOffering } from "@/lib/mockData"; 
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock, Users, User, Tag, Info, PlusCircle, Loader2 } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Importar useRouter

// Helper para agrupar clases por día
const groupClassesByDay = (classes: ClassOffering[]) => {
  const daysOrder = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const grouped = classes.reduce((acc, cls) => {
    (acc[cls.day] = acc[cls.day] || []).push(cls);
    return acc;
  }, {} as Record<string, ClassOffering[]>);

  return Object.entries(grouped).sort(([dayA], [dayB]) => {
    return daysOrder.indexOf(dayA) - daysOrder.indexOf(dayB);
  });
};


export default function SchedulePage() {
  // userProfile contiene id, name, email, role
  // currentUser es el objeto de Firebase Auth
  const { currentUser, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter(); // Usar useRouter
  const [classesByDay, setClassesByDay] = useState<[string, ClassOffering[]][]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [bookingStates, setBookingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchClasses = async () => {
      setPageLoading(true);
      const offerings = await getClassOfferingsFromDB();
      setClassesByDay(groupClassesByDay(offerings));
      setPageLoading(false);
    };
    fetchClasses();
  }, []);

  const handleBookClass = async (classItem: ClassOffering) => {
    if (!isAuthenticated || !currentUser) { // Verificar currentUser de Firebase Auth
      toast({
        title: "Inicio de Sesión Requerido",
        description: "Por favor, inicia sesión para reservar una clase.",
        variant: "destructive",
      });
      router.push('/login?redirect=/schedule'); // Redirigir a login
      return;
    }
    if (classItem.booked >= classItem.capacity) {
        toast({
            title: "Clase Llena",
            description: "Esta clase ya no tiene plazas disponibles.",
            variant: "destructive",
        });
        return;
    }
    if (userProfile?.role === 'trainer') { // Usar userProfile para el rol
        toast({
            title: "Acción no permitida",
            description: "Los entrenadores no pueden reservar clases.",
            variant: "destructive",
        });
        return;
    }

    setBookingStates(prev => ({ ...prev, [classItem.id]: true }));
    
    // addBookingToDB ahora toma userId y classItem
    const newBooking = await addBookingToDB(currentUser.uid, classItem);

    if (newBooking) {
      setClassesByDay(prevClassesByDay => {
        return prevClassesByDay.map(([day, classes]) => {
          return [
            day,
            classes.map(c => 
              c.id === classItem.id ? { ...c, booked: c.booked + 1 } : c // Actualizar contador localmente
            ),
          ] as [string, ClassOffering[]];
        });
      });
      toast({
        title: "¡Clase Reservada!",
        description: `Has reservado ${classItem.name} con éxito. Se te enviará un recordatorio por correo electrónico un día antes.`,
      });
    } else {
      toast({
        title: "Error en la Reserva",
        description: "No se pudo completar la reserva. Puede que ya estés inscrito o haya ocurrido un error.",
        variant: "destructive",
      });
    }
    setBookingStates(prev => ({ ...prev, [classItem.id]: false }));
  };
  
  // authLoading es del contexto, pageLoading es para las clases
  if (authLoading || pageLoading) {
    return (
      <div className="space-y-8 container mx-auto py-8">
        {[...Array(2)].map((_, dayIndex) => (
          <div key={dayIndex}>
            <div className="h-8 w-1/3 bg-muted rounded mb-4 animate-pulse"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, classIndex) => (
                <Card key={classIndex} className="shadow-lg">
                  <CardHeader>
                    <div className="h-6 w-3/4 bg-muted rounded mb-1 animate-pulse"></div>
                    <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-4 w-full bg-muted rounded animate-pulse"></div>
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                  </CardContent>
                  <CardFooter>
                    <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-foreground">Horario de Clases</h1>
      </div>

      {classesByDay.length === 0 && !pageLoading && (
        <p className="text-center text-muted-foreground text-lg py-10">No hay clases disponibles en este momento. El administrador puede añadir clases desde su panel.</p>
      )}

      <div className="space-y-10">
        {classesByDay.map(([day, classes]) => (
          <section key={day}>
            <h2 className="text-3xl font-semibold text-primary mb-6 border-b-2 border-primary pb-2">{day}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((classItem) => (
                <Card key={classItem.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="text-2xl text-primary">{classItem.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1">
                      <Tag className="h-4 w-4 text-accent" /> {classItem.category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-5 w-5 text-foreground" /> 
                      Entrenador/a: <Link href={`/trainers/${classItem.trainerId}`} className="text-primary hover:underline">{classItem.trainerName}</Link>
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <CalendarClock className="h-5 w-5 text-foreground" /> {classItem.time} ({classItem.duration})
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-5 w-5 text-foreground" /> {classItem.booked} / {classItem.capacity} plazas ocupadas
                    </p>
                     <p className="flex items-start gap-2 text-sm text-muted-foreground pt-2">
                      <Info className="h-5 w-5 text-foreground shrink-0 mt-0.5" /> {classItem.description}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => handleBookClass(classItem)}
                      disabled={
                        bookingStates[classItem.id] ||
                        classItem.booked >= classItem.capacity || 
                        !isAuthenticated || // Si no está autenticado, no puede reservar
                        (userProfile?.role === 'trainer') // Si es entrenador, no puede reservar
                      }
                    >
                      {bookingStates[classItem.id] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      {bookingStates[classItem.id]
                        ? "Reservando..."
                        : !isAuthenticated
                        ? "Inicia Sesión para Reservar"
                        : classItem.booked >= classItem.capacity 
                        ? "Completo" 
                        : (userProfile?.role === 'trainer' ? "Entrenadores no pueden reservar" : "Reservar Clase")}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
