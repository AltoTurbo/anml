
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
import type { Product } from "@/lib/mockData";
import { productCategories } from "@/lib/mockData";
import { useEffect } from "react";

const addProductFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre del producto debe tener al menos 2 caracteres." }),
  description: z.string().optional(),
  price: z.coerce.number().positive({ message: "El precio debe ser un número positivo." }),
  stock: z.coerce.number().int().min(0, { message: "El stock no puede ser negativo." }),
  category: z.string().optional(),
  // imageUrl: z.string().url({ message: "Por favor, ingresa una URL válida para la imagen." }).optional().or(z.literal('')),
});

export type AddProductFormValues = z.infer<typeof addProductFormSchema>;

interface AddProductFormProps {
  onSubmit: (data: AddProductFormValues) => void;
  onCancel: () => void;
  initialData?: Product;
  isEditMode?: boolean;
  isSaving?: boolean;
}

export default function AddProductForm({
    onSubmit,
    onCancel,
    initialData,
    isEditMode = false,
    isSaving = false,
}: AddProductFormProps) {

  const form = useForm<AddProductFormValues>({
    resolver: zodResolver(addProductFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price || 0,
      stock: initialData?.stock || 0,
      category: initialData?.category || "",
      // imageUrl: initialData?.imageUrl || "",
    },
  });

  useEffect(() => {
    if (initialData) {
        form.reset({
            name: initialData.name,
            description: initialData.description || "",
            price: initialData.price,
            stock: initialData.stock,
            category: initialData.category || "",
            // imageUrl: initialData.imageUrl || "",
        });
    }
  }, [initialData, form, isEditMode]);


  const handleSubmit = (data: AddProductFormValues) => {
    // If category is our special "_no_category_" value, transform it to an empty string or undefined
    // if the backend expects that for "no category".
    // For now, we'll submit it as is, assuming the backend/DB can handle it or it's purely for display.
    // If "" is strictly needed:
    // const dataToSubmit = {
    //   ...data,
    //   category: data.category === "_no_category_" ? "" : data.category,
    // };
    // onSubmit(dataToSubmit);
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Botella de Agua 500ml" {...field} disabled={isSaving} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe el producto brevemente..."
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej: 1.50" {...field} step="0.01" disabled={isSaving} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Actual</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej: 100" {...field} step="1" disabled={isSaving} />
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
              <FormLabel>Categoría (Opcional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSaving}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_no_category_">Sin Categoría</SelectItem>
                  {productCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Para imageUrl, considera usar un input de tipo file si quieres subida de imágenes,
            o mantenerlo como URL si las imágenes se alojan externamente.
            Por simplicidad, lo omito visualmente por ahora, pero la estructura está en Product.
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de la Imagen (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="https://ejemplo.com/imagen.png" {...field} disabled={isSaving} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        */}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSaving}>
            {isSaving ? (isEditMode ? "Actualizando..." : "Guardando...") : (isEditMode ? "Actualizar Producto" : "Guardar Producto")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

