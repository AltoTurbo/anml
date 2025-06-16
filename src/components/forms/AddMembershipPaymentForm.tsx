
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
import { paymentMethods } from "@/lib/mockData";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale"; // Import Spanish locale for date formatting
import { useEffect } from "react";


const addMembershipPaymentFormSchema = z.object({
  amountPaid: z.coerce.number().positive({ message: "El monto debe ser un número positivo." }).min(0.01, {message: "El monto debe ser mayor a cero."}),
  newPaymentDueDate: z.date({ required_error: "La nueva fecha de vencimiento es requerida."}),
  paymentMethod: z.string().min(1, { message: "Debes seleccionar un método de pago." }),
  notes: z.string().optional(),
});

export type AddMembershipPaymentFormValues = z.infer<typeof addMembershipPaymentFormSchema>;

interface AddMembershipPaymentFormProps {
  onSubmit: (data: AddMembershipPaymentFormValues) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  clientName: string;
  currentDueDate?: string; // YYYY-MM-DD
}

export default function AddMembershipPaymentForm({
  onSubmit,
  onCancel,
  isSaving = false,
  clientName,
  currentDueDate,
}: AddMembershipPaymentFormProps) {

  const getDefaultNewDueDate = () => {
    const date = currentDueDate ? new Date(currentDueDate) : new Date();
    if (currentDueDate && new Date(currentDueDate) > new Date()) {
         // If current due date is in the future, add 30 days to it
        date.setDate(date.getDate() + 30);
    } else {
        // If current due date is in the past or not set, add 30 days to today
        const today = new Date();
        today.setDate(today.getDate() + 30);
        return today;
    }
    return date;
  };
  
  const form = useForm<AddMembershipPaymentFormValues>({
    resolver: zodResolver(addMembershipPaymentFormSchema),
    defaultValues: {
      amountPaid: 0,
      newPaymentDueDate: getDefaultNewDueDate(),
      paymentMethod: "",
      notes: "",
    },
  });
  
  useEffect(() => {
    form.reset({
        amountPaid: 0,
        newPaymentDueDate: getDefaultNewDueDate(),
        paymentMethod: "",
        notes: "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName, currentDueDate, form.reset]);


  const handleSubmit = async (data: AddMembershipPaymentFormValues) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <p className="text-sm text-muted-foreground">Registrando pago para: <span className="font-semibold text-primary">{clientName}</span></p>
        
        <FormField
          control={form.control}
          name="amountPaid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto Pagado</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ej: 30.00" {...field} step="0.01" disabled={isSaving} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPaymentDueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Nueva Fecha de Vencimiento</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isSaving}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: es })
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || isSaving } // Disable past dates
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Método de Pago</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un método" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ej: Pago adelantado, Descuento aplicado..."
                  className="resize-none"
                  rows={2}
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
              "Registrar Pago"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}


    