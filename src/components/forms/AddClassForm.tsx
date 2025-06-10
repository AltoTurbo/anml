
"use client";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassOffering, Trainer as TrainerMock } from "@/lib/mockData"; // TrainerMock es la interfaz de los datos simulados
import { availableClassTypesForAI } from "@/lib/mockData";
import type { UserProfile } from "@/contexts/AuthContext"; // UserProfile del contexto
import { useEffect } from "react";

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const addClassFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre de la clase debe tener al menos 3 caracteres." }),
  trainerId: z.string().min(1, { message: "Debes seleccionar un entrenador (si eres admin)." }),
  day: z.string().min(1, { message: "Debes seleccionar un día." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  duration: z.string().min(3, { message: "La duración es requerida (ej: 60 minutos)." }),
  capacity: z.coerce.number().min(1, { message: "La capacidad debe ser al menos 1." }),
  description: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres." }),
  category: z.string().min(1, { message: "Debes seleccionar o ingresar una categoría." }),
});

export type AddClassFormValues = z.infer<typeof addClassFormSchema>;

interface AddClassFormProps {
  onSubmit: (data: AddClassFormValues, trainerName: string) => void;
  onCancel: () => void;
  currentUserProfile: UserProfile;
  allTrainers: TrainerMock[];
  initialData?: ClassOffering;
  isEditMode?: boolean;
}

export default function AddClassForm({
    onSubmit,
    onCancel,
    currentUserProfile,
    allTrainers,
    initialData,
    isEditMode = false
}: AddClassFormProps) {

  const form = useForm<AddClassFormValues>({
    resolver: zodResolver(addClassFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      trainerId: initialData?.trainerId || (currentUserProfile.role === 'trainer' ? currentUserProfile.id : ""),
      day: initialData?.day || "",
      time: initialData?.time || "09:00",
      duration: initialData?.duration || "60 minutos",
      capacity: initialData?.capacity || 10,
      description: initialData?.description || "",
      category: initialData?.category || "",
    },
  });

  useEffect(() => {
    if (isEditMode && initialData) {
        form.reset({
            name: initialData.name,
            trainerId: initialData.trainerId,
            day: initialData.day,
            time: initialData.time,
            duration: initialData.duration,
            capacity: initialData.capacity,
            description: initialData.description,
            category: initialData.category,
        });
    } else if (!isEditMode && currentUserProfile.role === 'trainer') {
      form.setValue('trainerId', currentUserProfile.id);
    } else if (!isEditMode && currentUserProfile.role === 'admin') {
      form.setValue('trainerId', '');
    }
  }, [currentUserProfile, form, initialData, isEditMode]);


  const handleSubmit = (data: AddClassFormValues) => {
    let determinedTrainerName = 'Desconocido';
    if (currentUserProfile.role === 'trainer') {
      determinedTrainerName = currentUserProfile.name;
    } else if (currentUserProfile.role === 'admin') {
      const selectedTrainer = allTrainers.find(t => t.id === data.trainerId);
      if (selectedTrainer) {
        determinedTrainerName = selectedTrainer.name;
      } else if (isEditMode && initialData && initialData.trainerId === data.trainerId) {
        determinedTrainerName = initialData.trainerName;
      }
    }

    onSubmit(data, determinedTrainerName);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Clase</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Yoga Matutino" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {currentUserProfile.role === 'admin' ? (
          <FormField
            control={form.control}
            name="trainerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entrenador/a</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un entrenador/a" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allTrainers.map(trainer => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
           <FormItem>
             <FormLabel>Entrenador/a</FormLabel>
             <FormControl>
                <Input value={currentUserProfile.name} disabled />
              </FormControl>
              <input type="hidden" {...form.register("trainerId")} value={currentUserProfile.id} />
           </FormItem>
        )}


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Día</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un día" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {daysOfWeek.map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora (HH:MM)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: 60 minutos" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacidad</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej: 15" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
               <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableClassTypesForAI.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                    {/* Muestra la categoría personalizada actual si no es una predefinida Y NO es "Otra" */}
                    {field.value && !availableClassTypesForAI.includes(field.value) && field.value !== 'Otra' && (
                      <SelectItem key={`custom-cat-${field.value}`} value={field.value}>
                        {field.value} (Personalizada)
                      </SelectItem>
                    )}
                    {/* Opción para especificar una nueva categoría, con una clave única */}
                    <SelectItem key="specify-new-category-option" value="Otra">
                      Otra (especificar nueva)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.watch("category") === "Otra" && (
                   <FormControl>
                     <Input
                        placeholder="Especifica la categoría"
                        onChange={(e) => field.onChange(e.target.value)}
                        // defaultValue limpia para una nueva categoría, o podría ser el valor actual si 'Otra' es el valor del campo
                        defaultValue={isEditMode && initialData && !availableClassTypesForAI.includes(initialData.category) && initialData.category !== 'Otra' ? initialData.category : ""}
                        className="mt-2"
                      />
                   </FormControl>
                )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe la clase brevemente..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isEditMode ? "Actualizar Clase" : "Guardar Clase"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
