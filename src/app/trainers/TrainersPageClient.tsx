'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Trainer } from "@/lib/mockData"; // Se mantiene la interfaz Trainer
import { Users, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/contexts/AuthContext';

export default function TrainersPageClient() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const fetchTrainers = async () => {
      if (authLoading) return; // Esperar a que termine la carga de autenticación

      if (!isAuthenticated) {
        router.push('/login?redirect=/trainers');
        setPageLoading(false);
        return;
      }

      setPageLoading(true);
      try {
        const trainersQuery = query(collection(db, "users"), where("role", "==", "trainer"));
        const querySnapshot = await getDocs(trainersQuery);
        const trainersList = querySnapshot.docs.map(doc => {
          const data = doc.data() as UserProfile;
          // Mapear UserProfile a la interfaz Trainer
          return {
            id: doc.id,
            name: data.name,
            email: data.email,
            specialty: data.specialty || 'Entrenador/a Certificado/a',
            bio: data.bio || 'Dedicado/a a ayudarte a alcanzar tus metas de fitness.',
            imageUrl: data.imageUrl || `https://placehold.co/150x150.png?text=${data.name.split(' ').map(n => n[0]).join('')}`,
          } as Trainer;
        });
        setTrainers(trainersList);
      } catch (error) {
        console.error("Error obteniendo entrenadores de Firestore:", error);
      } finally {
        setPageLoading(false);
      }
    };

    fetchTrainers();
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || pageLoading) {
    return (
      <div className="container mx-auto py-8 animate-pulse">
        <div className="h-10 w-1/2 bg-muted rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-lg">
              <CardHeader className="items-center">
                <div className="w-24 h-24 rounded-full bg-muted mb-4"></div>
                <div className="h-6 w-3/4 bg-muted rounded mb-1"></div>
                <div className="h-4 w-1/2 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-12 w-full bg-muted rounded"></div>
              </CardContent>
              <CardFooter>
                <div className="h-10 w-full bg-muted rounded"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold text-foreground flex items-center gap-3"><Users /> Nuestros Entrenadores</h1>
      </div>

      {trainers.length === 0 && !pageLoading && (
        <p className="text-center text-muted-foreground text-lg">No hay entrenadores disponibles en este momento. El administrador puede promover usuarios a entrenadores.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {trainers.map((trainer) => (
          <Card key={trainer.id} className="flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="items-center">
              <Image
                src={trainer.imageUrl || `https://placehold.co/150x150.png`}
                alt={trainer.name}
                width={120}
                height={120}
                className="rounded-full mb-4 border-4 border-primary/20"
                data-ai-hint="retrato entrenador"
              />
              <CardTitle className="text-2xl text-primary">{trainer.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-accent font-medium">
                <Sparkles className="h-4 w-4" /> {trainer.specialty}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground text-sm line-clamp-3">{trainer.bio}</p>
            </CardContent>
            <CardFooter className="w-full">
              <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href={`/trainers/${trainer.id}`}>
                  Ver Perfil <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
