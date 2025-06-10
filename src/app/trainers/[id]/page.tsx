
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { getClassOfferingsFromDB, type Trainer, type ClassOffering } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // CardDescription no se usa aquí
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays, Sparkles, UserCircle, Dumbbell, Loader2 } from "lucide-react";
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/contexts/AuthContext';

export default function TrainerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [trainerClasses, setTrainerClasses] = useState<ClassOffering[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const fetchTrainerData = async () => {
      if (authLoading) return; 

      if (!isAuthenticated) {
        router.push(`/login?redirect=/trainers/${params.id}`);
        setPageLoading(false);
        return;
      }
      
      setPageLoading(true);
      if (params.id) {
        try {
          const trainerDocRef = doc(db, "users", params.id as string);
          const docSnap = await getDoc(trainerDocRef);

          if (docSnap.exists() && docSnap.data().role === 'trainer') {
            const data = docSnap.data() as UserProfile;
            const foundTrainer: Trainer = {
              id: docSnap.id,
              name: data.name,
              email: data.email,
              specialty: data.specialty || 'Entrenador/a Certificado/a', // Valor por defecto
              bio: data.bio || 'Dedicado/a a ayudarte a alcanzar tus metas de fitness.', // Valor por defecto
              imageUrl: data.imageUrl || `https://placehold.co/200x200.png?text=${data.name.split(' ').map(n => n[0]).join('')}`, // Placeholder
            };
            setTrainer(foundTrainer);

            const allClasses = await getClassOfferingsFromDB();
            const classesForTrainer = allClasses.filter(c => c.trainerId === foundTrainer.id);
            setTrainerClasses(classesForTrainer);
          } else {
            // No encontrado o no es un entrenador
            console.warn("Entrenador no encontrado o el ID no corresponde a un entrenador:", params.id);
            router.push('/trainers'); 
          }
        } catch (error) {
          console.error("Error obteniendo datos del entrenador de Firestore:", error);
          router.push('/trainers');
        }
      }
      setPageLoading(false);
    };

    fetchTrainerData();
  }, [params.id, router, authLoading, isAuthenticated]);

  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 animate-pulse">
        <Button variant="outline" className="mb-6 h-10 w-48 bg-muted"></Button>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Card className="shadow-lg">
              <CardContent className="pt-6 flex flex-col items-center">
                <div className="w-40 h-40 rounded-full bg-muted mb-4"></div>
                <div className="h-8 w-3/4 bg-muted rounded mb-2"></div>
                <div className="h-6 w-1/2 bg-muted rounded"></div>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2 space-y-6">
            <Card className="shadow-lg">
              <CardHeader><div className="h-7 w-1/3 bg-muted rounded"></div></CardHeader>
              <CardContent>
                <div className="h-20 w-full bg-muted rounded"></div>
              </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardHeader><div className="h-7 w-1/3 bg-muted rounded"></div></CardHeader>
              <CardContent>
                <div className="h-16 w-full bg-muted rounded"></div>
                <div className="h-16 w-full bg-muted rounded mt-4"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!trainer) {
    // Esto puede mostrarse brevemente si el redirect aún no ha ocurrido o si hubo un error no capturado.
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-xl text-muted-foreground">Cargando datos del entrenador o entrenador no encontrado...</p>
        <Button onClick={() => router.push('/trainers')} className="mt-4">Volver a Entrenadores</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
      </Button>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Trainer Info Card */}
        <div className="md:col-span-1">
          <Card className="shadow-xl sticky top-24">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Image
                src={trainer.imageUrl || `https://placehold.co/200x200.png`}
                alt={trainer.name}
                width={160}
                height={160}
                className="rounded-full mb-4 border-4 border-primary shadow-md"
                data-ai-hint="retrato entrenador"
              />
              <h1 className="text-3xl font-bold text-primary mb-1">{trainer.name}</h1>
              <p className="text-accent font-semibold flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5" /> {trainer.specialty}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trainer Details and Classes */}
        <div className="md:col-span-2 space-y-8">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2 text-foreground">
                <UserCircle className="h-6 w-6 text-primary" /> Sobre {trainer.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{trainer.bio}</p>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2 text-foreground">
                <Dumbbell className="h-6 w-6 text-primary" /> Clases Impartidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trainerClasses.length > 0 ? (
                <ul className="space-y-4">
                  {trainerClasses.map(cls => (
                    <li key={cls.id} className="p-4 border rounded-lg hover:bg-secondary/30 transition-colors">
                      <h3 className="font-semibold text-lg text-primary">{cls.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" /> {cls.day} a las {cls.time}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{cls.description.substring(0,100)}...</p>
                       <Button variant="link" asChild className="p-0 h-auto mt-1 text-accent">
                         <Link href="/schedule">Ver en Horario</Link>
                       </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Este/a entrenador/a no tiene clases programadas actualmente.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
