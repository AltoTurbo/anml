
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
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { UserProfile } from "@/contexts/AuthContext";

const editProfileFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  bio: z.string().optional(),
});

export type EditProfileFormValues = z.infer<typeof editProfileFormSchema>;

interface EditProfileFormProps {
  onSubmit: (data: EditProfileFormValues) => void;
  onCancel: () => void;
  initialData: Partial<Pick<UserProfile, 'name' | 'phone' | 'specialty' | 'bio'>>;
  isSaving?: boolean;
  userRole?: UserProfile['role'];
}

export default function EditProfileForm({ 
  onSubmit, 
  onCancel, 
  initialData, 
  isSaving = false,
  userRole 
}: EditProfileFormProps) {
  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileFormSchema),
    defaultValues: {
      name: initialData.name || "",
      phone: initialData.phone || "",
      specialty: initialData.specialty || "",
      bio: initialData.bio || "",
    },
  });

  const handleSubmit = (data: EditProfileFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="Tu Nombre Completo" {...field} disabled={isSaving} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="Tu número de teléfono" {...field} disabled={isSaving} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {userRole === 'trainer' && (
          <>
            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Yoga y Pilates, Entrenamiento de Fuerza" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biografía Corta</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Una breve descripción sobre ti y tu enfoque como entrenador/a."
                      className="resize-none"
                      rows={3}
                      {...field}
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
