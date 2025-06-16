
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Trash2, ShoppingCart } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import type { Product, SaleItem } from "@/lib/mockData";
import { getProductsFromDB } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

const saleItemSchema = z.object({
  productId: z.string().min(1, "Debes seleccionar un producto."),
  productName: z.string(), // Se llenará al seleccionar
  quantitySold: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.coerce.number(), // Se llenará al seleccionar
  stockAvailable: z.coerce.number(), // Para validación
  subtotal: z.coerce.number(),
});

const recordSaleFormSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Debes añadir al menos un producto a la venta."),
});

export type RecordSaleFormValues = z.infer<typeof recordSaleFormSchema>;

interface RecordSaleFormProps {
  onSubmit: (data: SaleItem[]) => Promise<void>; // Solo pasamos los items procesados
  onCancel: () => void;
  isSaving?: boolean;
}

export default function RecordSaleForm({
  onSubmit,
  onCancel,
  isSaving = false,
}: RecordSaleFormProps) {
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductForAdding, setSelectedProductForAdding] = useState<Product | null>(null);
  const [quantityForAdding, setQuantityForAdding] = useState<number>(1);
  const { toast } = useToast();

  const form = useForm<RecordSaleFormValues>({
    resolver: zodResolver(recordSaleFormSchema),
    defaultValues: {
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const fetchProducts = useCallback(async () => {
    const productsFromDB = await getProductsFromDB();
    setAvailableProducts(productsFromDB.filter(p => p.stock > 0)); // Solo productos con stock
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddProductToSale = () => {
    if (!selectedProductForAdding) {
      toast({ title: "Error", description: "Por favor, selecciona un producto.", variant: "destructive" });
      return;
    }
    if (quantityForAdding <= 0) {
      toast({ title: "Error", description: "La cantidad debe ser mayor a cero.", variant: "destructive" });
      return;
    }
    if (quantityForAdding > selectedProductForAdding.stock) {
      toast({ title: "Error", description: `Stock insuficiente para ${selectedProductForAdding.name}. Disponible: ${selectedProductForAdding.stock}.`, variant: "destructive" });
      return;
    }

    const existingItemIndex = fields.findIndex(item => item.productId === selectedProductForAdding.id);

    if (existingItemIndex !== -1) {
      const existingItem = fields[existingItemIndex];
      const newQuantity = existingItem.quantitySold + quantityForAdding;
      if (newQuantity > selectedProductForAdding.stock) {
        toast({ title: "Error", description: `Stock insuficiente para ${selectedProductForAdding.name} si añades ${quantityForAdding} más. Ya en venta: ${existingItem.quantitySold}, Disponible total: ${selectedProductForAdding.stock}.`, variant: "destructive" });
        return;
      }
      update(existingItemIndex, {
        ...existingItem,
        quantitySold: newQuantity,
        subtotal: newQuantity * existingItem.unitPrice,
      });
    } else {
      append({
        productId: selectedProductForAdding.id,
        productName: selectedProductForAdding.name,
        quantitySold: quantityForAdding,
        unitPrice: selectedProductForAdding.price,
        stockAvailable: selectedProductForAdding.stock,
        subtotal: quantityForAdding * selectedProductForAdding.price,
      });
    }

    // Reset selection
    setSelectedProductForAdding(null);
    setQuantityForAdding(1);
    // Considerar refrescar availableProducts si el stock llega a 0 tras añadir al carrito
  };

  const totalVenta = fields.reduce((sum, item) => sum + item.subtotal, 0);

  const handleFormSubmit = async (data: RecordSaleFormValues) => {
    // Transform items to SaleItem[] for the backend
    const saleItems: SaleItem[] = data.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantitySold: item.quantitySold,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
    }));
    await onSubmit(saleItems);
    // form.reset(); // No resetear aquí, el diálogo se cierra
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-4 items-end border p-4 rounded-md">
          <FormItem>
            <FormLabel>Producto</FormLabel>
            <Select
              onValueChange={(productId) => {
                const product = availableProducts.find(p => p.id === productId);
                setSelectedProductForAdding(product || null);
              }}
              value={selectedProductForAdding?.id || ""}
              disabled={isSaving || availableProducts.length === 0}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={availableProducts.length > 0 ? "Selecciona un producto" : "No hay productos con stock"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {availableProducts.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (Stock: {product.stock}, Precio: ${product.price.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
          <FormItem>
            <FormLabel>Cantidad</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="1"
                value={quantityForAdding}
                onChange={(e) => setQuantityForAdding(Number(e.target.value))}
                disabled={isSaving || !selectedProductForAdding}
              />
            </FormControl>
          </FormItem>
          <Button
            type="button"
            onClick={handleAddProductToSale}
            disabled={isSaving || !selectedProductForAdding || quantityForAdding <= 0}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir
          </Button>
        </div>
        
        {form.formState.errors.items && !fields.length && (
             <FormMessage>{form.formState.errors.items.message}</FormMessage>
        )}


        {fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Productos en esta Venta</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">{item.quantitySold}</TableCell>
                      <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${item.subtotal.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={isSaving}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {fields.length > 0 && (
          <div className="text-right text-xl font-semibold mt-4">
            Total de la Venta: <span className="text-primary">${totalVenta.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSaving || fields.length === 0}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando Venta...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Registrar Venta
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
