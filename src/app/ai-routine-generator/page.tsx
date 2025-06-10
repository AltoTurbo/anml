
"use client";

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input"; // No se usa, pero se mantiene por si acaso
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { generateWorkoutRoutine, type GenerateWorkoutRoutineInput, type GenerateWorkoutRoutineOutput } from "@/ai/flows/generate-workout-routine";
// Se usa getBookingsForUserFromDB para obtener el historial si el usuario lo desea
import { availableClassTypesForAI, getBookingsForUserFromDB } from "@/lib/mockData"; 
import { Bot, Sparkles, Loader2 } from "lucide-react";
// Se usa currentUser (Firebase Auth) y userProfile (Firestore)
import { useAuth } from '@/contexts/AuthContext'; 
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const routineGeneratorFormSchema = z.object({
  userGoals: z.string().min(10, { message: "Por favor, describe tus objetivos en al menos 10 caracteres." }),
  availableClasses: z.array(z.string()).min(1, { message: "Selecciona al menos un tipo de clase disponible." }),
  useHistoricalSignups: z.boolean().default(false).optional(),
});

type RoutineGeneratorFormValues = z.infer<typeof routineGeneratorFormSchema>;

export default function AiRoutineGeneratorPage() {
  const [generatedRoutine, setGeneratedRoutine] = useState<GenerateWorkoutRoutineOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // currentUser de Firebase Auth, userProfile de Firestore
  const { currentUser, userProfile, isAuthenticated, loading: authLoading } = useAuth(); 
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { // Si no está cargando y no está autenticado
      router.push('/login?redirect=/ai-routine-generator');
      toast({ title: "Acceso Denegado", description: "Por favor, inicia sesión para usar el Generador de Rutinas con IA.", variant: "destructive"});
    }
  }, [isAuthenticated, authLoading, router, toast]);

  const form = useForm<RoutineGeneratorFormValues>({
    resolver: zodResolver(routineGeneratorFormSchema),
    defaultValues: {
      userGoals: "",
      availableClasses: [],
      useHistoricalSignups: false,
    },
  });

  async function onSubmit(data: RoutineGeneratorFormValues) {
    setIsGenerating(true);
    setGeneratedRoutine(null);

    let historicalSignups: string[] = [];
    // Usar currentUser.uid para obtener el historial
    if (data.useHistoricalSignups && currentUser) { 
      const userBookingsFromDB = await getBookingsForUserFromDB(currentUser.uid);
      historicalSignups = userBookingsFromDB
        .filter(booking => booking.status === 'confirmed')
        .map(booking => booking.className || 'Clase Desconocida');
    }
    
    const input: GenerateWorkoutRoutineInput = {
      userGoals: data.userGoals,
      availableClasses: data.availableClasses,
      ...(historicalSignups.length > 0 && { historicalSignups }),
    };

    try {
      const result = await generateWorkoutRoutine(input);
      setGeneratedRoutine(result);
      toast({
        title: "¡Rutina Generada!",
        description: "Tu rutina de entrenamiento personalizada está lista.",
      });
    } catch (error) {
      console.error("Error generando rutina:", error);
      setGeneratedRoutine({ workoutRoutine: "Lo siento, no pude generar una rutina en este momento. Por favor, inténtalo más tarde."});
      toast({
        title: "Falló la Generación",
        description: "Hubo un error generando tu rutina. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }
  
  // Estado de carga mejorado
  if (authLoading || (!isAuthenticated && !authLoading)) {
     return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
          <Card className="w-full max-w-2xl shadow-xl animate-pulse">
            <CardHeader className="text-center">
              <div className="mx-auto bg-muted p-3 rounded-full w-fit mb-4">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <div className="h-8 w-3/4 bg-muted rounded mx-auto mb-2"></div>
              <div className="h-5 w-1/2 bg-muted rounded mx-auto"></div>
            </CardHeader>
            <CardContent className="space-y-6">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 w-full bg-muted rounded"></div>)}
              <div className="h-12 w-full bg-muted rounded"></div>
            </CardContent>
          </Card>
        </div>
     );
  }

  // Si el usuario está autenticado pero el perfil de Firestore (userProfile) no está listo aún, mostrar carga
  if (isAuthenticated && !userProfile && !authLoading) {
     return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-4">Cargando...</p></div>;
  }

  // Si después de la carga no está autenticado, el useEffect ya debería haber redirigido.
  // Pero como una doble verificación, no renderizar el formulario.
  if (!isAuthenticated && !authLoading) {
    return <div className="text-center py-10"><p>Inicia sesión para acceder a esta función.</p></div>;
  }


  return (
    <div className="flex flex-col items-center py-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <Bot className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl">Generador de Rutinas de IA</CardTitle>
          <CardDescription>Dinos tus preferencias y crearemos una rutina personalizada para ti.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="userGoals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg">Tus Objetivos de Fitness</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej: Quiero perder peso y ganar músculo magro, enfocándome en mi core y tren superior."
                        className="resize-none"
                        rows={4}
                        {...field}
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="availableClasses"
                control={form.control}
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-lg">Tipos de Clases Disponibles que te Interesan</FormLabel>
                      <p className="text-sm text-muted-foreground">Selecciona tipos de clases que te gustaría incorporar.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {availableClassTypesForAI.map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="availableClasses"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), item])
                                      : field.onChange(
                                          (field.value || []).filter(
                                            (value) => value !== item
                                          )
                                        )
                                  }}
                                  disabled={isGenerating}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="useHistoricalSignups"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        ¿Considerar mis inscripciones pasadas a clases?
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Permitir que la IA use tu historial de clases para mejores recomendaciones.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90" disabled={isGenerating || authLoading}>
                {isGenerating || authLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {authLoading ? "Cargando..." : "Generando Rutina..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generar Mi Rutina
                  </>
                )}
              </Button>
            </form>
          </Form>

          {generatedRoutine && (
            <Card className="mt-10 bg-secondary/30">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">Tu Idea de Rutina Personalizada</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                {/* Renderizar el string de la rutina, si contiene saltos de línea se respetarán */}
                {generatedRoutine.workoutRoutine.split('\n').map((line, index) => (
                  <p key={index} className="mb-2 last:mb-0">{line}</p>
                ))}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
