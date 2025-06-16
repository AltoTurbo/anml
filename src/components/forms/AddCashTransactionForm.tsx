
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
import { Loader2 } from "lucide-react";

const addCashTransactionFormSchema = z.object({
  type: z.enum(["income", "expense"], { required_error: "Debes seleccionar un tipo de transacción." }),
  amount: z.coerce.number().positive({ message: "El monto debe ser un número positivo." }).min(0.01, {message: "El monto debe ser mayor a cero."}),
  description: z.string().min(3, { message: "La descripción debe tener al menos 3 caracteres." }),
});

export type AddCashTransactionFormValues = z.infer<typeof addCashTransactionFormSchema>;

interface AddCashTransactionFormProps {
  onSubmit: (data: AddCashTransactionFormValues) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function AddCashTransactionForm({
  onSubmit,
  onCancel,
  isSaving = false,
}: AddCashTransactionFormProps) {
  const form = useForm<AddCashTransactionFormValues>({
    resolver: zodResolver(addCashTransactionFormSchema),
    defaultValues: {
      type: undefined, 
      amount: 0,
      description: "",
    },
  });

  const handleSubmit = async (data: AddCashTransactionFormValues) => {
    await onSubmit(data);
    form.reset(); 
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Transacción</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona Ingreso o Egreso" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Egreso</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ej: 50.00" {...field} step="0.01" disabled={isSaving} />
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
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ej: Venta de agua, Pago de servicio eléctrico"
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

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Transacción"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
