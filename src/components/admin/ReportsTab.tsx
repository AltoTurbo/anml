
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getTransactionsByDateRange, type CashTransaction } from "@/lib/firestore";
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Download, Loader2, TrendingUp, TrendingDown, Wallet, ShoppingBasket, DollarSign, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import * as Papa from 'papaparse';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ReportsTab: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [areBalancesVisible, setAreBalancesVisible] = useState(false);
  const { toast } = useToast();

  const cleanDescription = (description: string) => {
    return description.replace(/\s\(ID Venta: .*\)$/, '');
  };

  const fetchTransactions = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Rango de fechas inválido",
        description: "Por favor, selecciona una fecha de inicio y fin.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const fetchedTransactions = await getTransactionsByDateRange(dateRange.from, dateRange.to);
      setTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error al cargar transacciones",
        description: "No se pudieron obtener los datos para el rango seleccionado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const setPresetDateRange = (preset: 'today' | 'this_week' | 'this_month' | 'last_month') => {
    const today = new Date();
    let from: Date, to: Date;

    switch (preset) {
      case 'today':
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case 'this_week':
        from = startOfWeek(today, { locale: es });
        to = endOfWeek(today, { locale: es });
        break;
      case 'this_month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'last_month':
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
    }
    setDateRange({ from, to });
  };
  
  const handleExportToCSV = () => {
    if (transactions.length === 0) {
      toast({ title: "No hay datos para exportar", description: "Selecciona un rango de fechas con transacciones." });
      return;
    }

    const dataToExport = transactions.map(t => {
      return {
        'Fecha': format(t.date.toDate(), 'yyyy-MM-dd HH:mm:ss'),
        'Tipo': t.type === 'income' ? 'Ingreso' : 'Egreso',
        'Descripción': cleanDescription(t.description),
        'Monto': t.amount.toFixed(2),
        'Costo de Venta': t.relatedSaleTotalCost ? t.relatedSaleTotalCost.toFixed(2) : '0.00',
        'Registrado Por': t.recordedByUserName || t.recordedByUserId,
      };
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'inicio';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 'fin';
    link.setAttribute('download', `reporte_financiero_${fromDate}_a_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const summary = transactions.reduce((acc, t) => {
    if (t.type === 'income') {
      acc.ingresosTotales += t.amount;
      if (t.relatedSaleId) {
        acc.ingresosPorVentas += t.amount;
        if (t.relatedSaleTotalCost) {
            acc.costoVentas += t.relatedSaleTotalCost;
        }
      }
    } else if (t.type === 'expense') {
      acc.egresos += t.amount;
    }
    return acc;
  }, { 
    ingresosTotales: 0,
    ingresosPorVentas: 0,
    costoVentas: 0,
    egresos: 0 
  });

  const gananciaBruta = summary.ingresosPorVentas - summary.costoVentas;
  const resultadoNeto = summary.ingresosTotales - summary.costoVentas - summary.egresos;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generador de Reportes Financieros</CardTitle>
          <CardDescription>Selecciona un rango de fechas para ver y exportar las transacciones financieras.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                        {format(dateRange.to, "LLL dd, y", { locale: es })}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y", { locale: es })
                    )
                  ) : (
                    <span>Selecciona un rango</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPresetDateRange('today')}>Hoy</Button>
                <Button variant="ghost" size="sm" onClick={() => setPresetDateRange('this_week')}>Esta Semana</Button>
                <Button variant="ghost" size="sm" onClick={() => setPresetDateRange('this_month')}>Este Mes</Button>
                <Button variant="ghost" size="sm" onClick={() => setPresetDateRange('last_month')}>Mes Pasado</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
                <Button variant="ghost" size="icon" onClick={() => setAreBalancesVisible(!areBalancesVisible)} aria-label={areBalancesVisible ? "Ocultar saldos" : "Mostrar saldos"}>
                    {areBalancesVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
                <Button onClick={handleExportToCSV} disabled={transactions.length === 0 || loading}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar a CSV
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold text-green-600 transition-all duration-300", !areBalancesVisible && 'filter blur-md select-none')}>
              {areBalancesVisible ? `$${summary.ingresosTotales.toFixed(2)}` : '$∗∗∗∗∗∗∗'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo de Ventas</CardTitle>
            <ShoppingBasket className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold text-orange-600 transition-all duration-300", !areBalancesVisible && 'filter blur-md select-none')}>
              {areBalancesVisible ? `$${summary.costoVentas.toFixed(2)}` : '$∗∗∗∗∗∗∗'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Bruta</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={cn(`text-2xl font-bold transition-all duration-300 ${gananciaBruta >= 0 ? 'text-blue-600' : 'text-red-600'}`, !areBalancesVisible && 'filter blur-md select-none')}>
              {areBalancesVisible ? `$${gananciaBruta.toFixed(2)}` : '$∗∗∗∗∗∗∗'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Egresos (Gastos)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold text-red-600 transition-all duration-300", !areBalancesVisible && 'filter blur-md select-none')}>
              {areBalancesVisible ? `$${summary.egresos.toFixed(2)}` : '$∗∗∗∗∗∗∗'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado Neto</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(`text-2xl font-bold transition-all duration-300 ${resultadoNeto >= 0 ? 'text-primary' : 'text-destructive'}`, !areBalancesVisible && 'filter blur-md select-none')}>
              {areBalancesVisible ? `$${resultadoNeto.toFixed(2)}` : '$∗∗∗∗∗∗∗'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Transacciones</CardTitle>
          <CardDescription>
            Mostrando {transactions.length} transacciones para el período seleccionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Cargando transacciones...</p>
            </div>
          ) : transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Costo Venta</TableHead>
                  <TableHead>Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm text-muted-foreground">{format(transaction.date.toDate(), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'} className={cn(transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800', "border-none")}>
                        {transaction.type === 'income' ? 'Ingreso' : 'Egreso'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{cleanDescription(transaction.description)}</TableCell>
                    <TableCell className={`text-right font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-semibold">
                      {transaction.relatedSaleTotalCost ? `$${transaction.relatedSaleTotalCost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{transaction.recordedByUserName || transaction.recordedByUserId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-10">No se encontraron transacciones para el rango de fechas seleccionado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsTab;
