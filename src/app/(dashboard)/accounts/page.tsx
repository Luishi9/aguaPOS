"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CreditCard, Droplets, DollarSign, ArrowUpCircle, ArrowDownCircle, AlertCircle } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  currentBalance: number;
  containersOwed: number;
  branch: { name: string };
}

interface Movement {
  id: string;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
  user: { name: string };
}

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentMethod: "CASH", description: "" });

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["clients-accounts", search],
    queryFn: async () => {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}&hasBalance=true&limit=50`);
      return res.json();
    },
  });

  const { data: movementsData } = useQuery({
    queryKey: ["movements", selectedClient?.id],
    queryFn: async () => {
      const res = await fetch(`/api/payments?clientId=${selectedClient!.id}`);
      return res.json();
    },
    enabled: !!selectedClient,
  });

  const movements: Movement[] = movementsData?.movements ?? [];

  const paymentMutation = useMutation({
    mutationFn: async (data: { clientId: string; amount: number; paymentMethod: string; description: string }) => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al registrar el pago");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["movements", selectedClient?.id] });
      // Actualizar el cliente seleccionado
      fetch(`/api/clients/${selectedClient!.id}`).then((r) => r.json()).then(setSelectedClient);
      setPaymentForm({ amount: "", paymentMethod: "CASH", description: "" });
      toast({ title: "Pago registrado correctamente" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  function movementLabel(type: string) {
    const map: Record<string, string> = {
      SALE: "Venta",
      PAYMENT: "Pago",
      ADJUSTMENT: "Ajuste",
    };
    return map[type] ?? type;
  }

  function movementVariant(type: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
    if (type === "PAYMENT") return "success";
    if (type === "SALE") return "warning";
    return "secondary";
  }

  const totalDebt = clientsData?.clients?.reduce(
    (sum: number, c: Client) => sum + (Number(c.currentBalance) > 0 ? Number(c.currentBalance) : 0),
    0
  ) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Cuenta Corriente</h1>
        <p className="text-sm text-muted-foreground">Gestión de saldos y cobros a clientes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Lista de clientes */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {totalDebt > 0 && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Deuda total pendiente
                  </span>
                  <span className="font-bold text-orange-600">{formatCurrency(totalDebt)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))
              : clientsData?.clients?.map((client: Client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedClient?.id === client.id
                        ? "border-agua-400 bg-agua-50 ring-1 ring-agua-300"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{client.name}</p>
                      <span
                        className={`text-xs font-semibold ${
                          Number(client.currentBalance) > 0 ? "text-orange-600" : "text-green-600"
                        }`}
                      >
                        {formatCurrency(client.currentBalance)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{client.branch.name}</span>
                      <span className="text-xs text-agua-600">
                        <Droplets className="w-3 h-3 inline mr-0.5" />
                        {client.containersOwed} envases
                      </span>
                    </div>
                  </button>
                ))}
          </div>
        </div>

        {/* Panel de cliente seleccionado */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center h-full py-24 text-muted-foreground">
              <CreditCard className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Selecciona un cliente para ver su cuenta</p>
            </div>
          ) : (
            <>
              {/* Resumen del cliente */}
              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold">{selectedClient.name}</h2>
                      <p className="text-sm text-muted-foreground">{selectedClient.address}</p>
                      <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>
                    </div>
                    <Badge variant="outline">{selectedClient.branch.name}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className={`p-3 rounded-lg ${Number(selectedClient.currentBalance) > 0 ? "bg-orange-50" : "bg-green-50"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs text-muted-foreground">Saldo pendiente</span>
                      </div>
                      <p className={`text-xl font-bold ${Number(selectedClient.currentBalance) > 0 ? "text-orange-600" : "text-green-600"}`}>
                        {formatCurrency(selectedClient.currentBalance)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-agua-50">
                      <div className="flex items-center gap-2 mb-1">
                        <Droplets className="w-4 h-4 text-agua-600" />
                        <span className="text-xs text-muted-foreground">Envases en poder</span>
                      </div>
                      <p className="text-xl font-bold text-agua-600">{selectedClient.containersOwed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Formulario de pago */}
              {Number(selectedClient.currentBalance) > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Registrar pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="paymentAmount" className="text-xs">Monto *</Label>
                        <Input
                          id="paymentAmount"
                          name="paymentAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="paymentMethod" className="text-xs">Método</Label>
                        <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm((p) => ({ ...p, paymentMethod: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Efectivo</SelectItem>
                            <SelectItem value="TRANSFER">Transferencia</SelectItem>
                            <SelectItem value="CHECK">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor="paymentDescription" className="text-xs">Descripción (opcional)</Label>
                        <Input
                          id="paymentDescription"
                          name="paymentDescription"
                          placeholder="Ej: Pago parcial en efectivo"
                          value={paymentForm.description}
                          onChange={(e) => setPaymentForm((p) => ({ ...p, description: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full mt-3 bg-agua-600 hover:bg-agua-700"
                      disabled={paymentMutation.isPending || !paymentForm.amount || Number(paymentForm.amount) <= 0}
                      onClick={() =>
                        paymentMutation.mutate({
                          clientId: selectedClient.id,
                          amount: Number(paymentForm.amount),
                          paymentMethod: paymentForm.paymentMethod,
                          description: paymentForm.description,
                        })
                      }
                    >
                      {paymentMutation.isPending ? "Registrando..." : "Confirmar pago"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Movimientos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Historial de movimientos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!movements?.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                            Sin movimientos registrados
                          </TableCell>
                        </TableRow>
                      )}
                      {movements?.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(mov.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant={movementVariant(mov.type)} className="text-xs">
                              {movementLabel(mov.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{mov.description ?? "-"}</TableCell>
                          <TableCell className={`text-right font-medium ${mov.type === "PAYMENT" ? "text-green-600" : "text-orange-600"}`}>
                            {mov.type === "PAYMENT" ? "-" : "+"}{formatCurrency(Math.abs(Number(mov.amount)))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
