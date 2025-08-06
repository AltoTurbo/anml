"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Dumbbell, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { userProfile, isAuthenticated, loading: authLoading } = useAuth();

  let ctaLink = "/register";
  let ctaText = "Regístrate Ahora";
  
  if (authLoading) {
    // No hacer nada
  } else if (isAuthenticated && userProfile) {
    if (userProfile.role === 'trainer' || userProfile.role === 'admin') {
      ctaLink = "/trainer-dashboard";
    } else if (userProfile.role === 'client') {
      ctaLink = "/bookings";
    } else {
      ctaLink = "/schedule"; 
    }
    ctaText = "Ir a Mi Panel";
  } else if (isAuthenticated && !userProfile && !authLoading) {
    ctaLink = "/schedule";
    ctaText = "Ver Horario";
  }


  const features = [
    {
      icon: <Dumbbell className="h-10 w-10 text-primary" />,
      title: "Horario de Clases Variado",
      description: "Explora una amplia variedad de clases, desde Yoga hasta HIIT, todas dirigidas por entrenadores expertos."
    },
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: "Entrenadores Expertos",
      description: "Aprende de los mejores. Nuestros entrenadores son profesionales certificados dedicados a tu éxito."
    },
    {
      icon: <CheckCircle className="h-10 w-10 text-primary" />,
      title: "Gestión de Reservas Fácil",
      description: "Reserva y gestiona tus clases sin complicaciones desde tu panel personal, manteniendo tu rutina organizada."
    }
  ];

  if (authLoading) {
    return (
      <div className="flex flex-col items-center animate-pulse">
        <section className="w-full bg-muted text-primary-foreground py-20 rounded-lg shadow-xl">
          <div className="container mx-auto text-center px-4">
            <div className="h-12 w-3/4 bg-muted-foreground/30 rounded mx-auto mb-6"></div>
            <div className="h-8 w-1/2 bg-muted-foreground/30 rounded mx-auto mb-8"></div>
            <div className="space-x-4">
              <div className="inline-block h-12 w-32 bg-muted-foreground/30 rounded"></div>
              <div className="inline-block h-12 w-32 bg-muted-foreground/30 rounded"></div>
            </div>
          </div>
        </section>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full bg-gradient-to-r from-blue-400 to-blue-600 text-primary-foreground py-20 rounded-lg shadow-xl">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-5xl font-bold mb-4">Bienvenido/a a Animal GYM</h1>
          <p className="text-lg italic text-primary-foreground/90 mb-6">
            🔥 ¡Desata tu animal interior! | 💪🏻 Disciplinas & Musculación | ⚠️ ¡Unite al #teamanimal!
          </p>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Tu guía definitiva para descubrir clases de fitness, conectar con entrenadores expertos y alcanzar tus objetivos de salud.
          </p>
          <div className="space-x-4">
            <Button size="lg" asChild className="bg-background text-foreground hover:bg-background/90">
              <Link href={ctaLink}>{ctaText}</Link>
            </Button>
            <Button size="lg" asChild className="bg-background text-foreground hover:bg-background/90">
              <Link href="/schedule">Ver Clases</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 w-full">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold text-center mb-12 text-foreground">¿Por Qué Elegir Animal GYM?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Placeholder for Image/Illustration */}
      <section className="py-16 w-full bg-secondary/30 rounded-lg">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/2">
            <Image
              src="https://i.postimg.cc/52vqrNWB/aniM.jpg"
              alt="Imagen promocional de Animal GYM"
              width={600}
              height={400}
              className="rounded-lg shadow-md"
              data-ai-hint="gimnasio moderno"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-3xl font-semibold mb-4 text-foreground">Navega Tu Viaje de Fitness</h3>
            <p className="text-lg text-muted-foreground mb-6">
              Animal GYM te proporciona todas las herramientas que necesitas en un solo lugar. Reserva clases fácilmente, sigue tu progreso y consulta perfiles de entrenadores.
            </p>
            <ul className="space-y-2">
              {["Sistema de Reserva Fácil", "Entrenadores Certificados", "Progreso Medible", "Comunidad de Apoyo"].map(item => (
                <li key={item} className="flex items-center text-foreground">
                  <CheckCircle className="h-5 w-5 text-accent mr-2" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 w-full">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl font-semibold mb-6 text-foreground">¿Listo/a para Empezar Tu Aventura de Fitness?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Únete a Animal GYM hoy y da el primer paso hacia un tú más saludable y fuerte.
          </p>
          <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href={ctaLink}>{ctaText}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}