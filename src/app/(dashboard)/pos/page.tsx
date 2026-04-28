"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, ShoppingCart, User, Droplets, CreditCard, CheckCircle2,
  Package, ArrowLeftRight, DollarSign, AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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

export default function POSPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");
  const { data: session } = useSession();

  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [successSale, setSuccessSale] = useState<any>(null);

  // Cargar sucursal para obtener precio por defecto
  const { data: branchData } = useQuery({
    queryKey: ["branch-price", session?.user?.branchId],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      const branches = await res.json() as Array<{ id: string; defaultUnitPrice: number }>;
      return branches.find((b) => b.id === session!.user.branchId) ?? null;
    },
    enabled: !!session?.user?.branchId,
  });

  const defaultPrice = branchData ? Number(branchData.defaultUnitPrice) : 2500;

  // Formulario
  const [form, setForm] = useState({
    containersDelivered: 1,
    containersReturned: 0,
    unitPrice: defaultPrice,
    amountPaid: 0,
    paymentMethod: "CASH",
    discount: 0,
    notes: "",
  });

  // Actualizar precio cuando carga la sucursal
  useEffect(() => {
    if (branchData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({ ...prev, unitPrice: Number(branchData.defaultUnitPrice) }));
    }
  }, [branchData]);

  // Cargar clientes
  const { data: clientsData } = useQuery({
    queryKey: ["clients-pos", clientSearch],
    queryFn: async () => {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=8`);
      return res.json();
    },
    enabled: clientSearch.length > 0 || showClientSearch,
  });

  // Preseleccionar cliente
  useEffect(() => {
    if (preselectedClientId) {
      fetch(`/api/clients/${preselectedClientId}`)
        .then((r) => r.json())
        .then(setSelectedClient);
    }
  }, [preselectedClientId]);

  const saleMutation = useMutation({
    mutationFn: async (data: typeof form & { clientId: string }) => {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al registrar la venta");
      }
      return res.json();
    },
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSuccessSale(sale);
      // Reset
      setForm({
        containersDelivered: 1,
        containersReturned: 0,
        unitPrice: defaultPrice,
        amountPaid: 0,
        paymentMethod: "CASH",
        discount: 0,
        notes: "",
      });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  // Cálculos en tiempo real
  const subtotal = form.containersDelivered * form.unitPrice;
  const total = subtotal - form.discount;
  const remainingDebt = Math.max(0, total - form.amountPaid);
  const newBalance = selectedClient ? Number(selectedClient.currentBalance) + remainingDebt - Math.max(0, form.amountPaid - total) : 0;
  const newContainers = selectedClient ? selectedClient.containersOwed + form.containersDelivered - form.containersReturned : 0;

  function handleSubmit() {
    if (!selectedClient) return;
    saleMutation.mutate({ ...form, clientId: selectedClient.id });
  }

  function handleChange(field: string, value: number | string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-sm text-muted-foreground">Registrar entrega de bidones</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Panel izquierdo: Formulario */}
        <div className="lg:col-span-3 space-y-4">
          {/* Selección de cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedClient ? (
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/40">
                  <div>
                    <p className="font-medium">{selectedClient.name}</p>
                    <div className="flex gap-3 mt-1">
                      <span className={`text-xs ${Number(selectedClient.currentBalance) > 0 ? "text-orange-600" : "text-green-600"}`}>
                        Saldo: {formatCurrency(selectedClient.currentBalance)}
                      </span>
                      <span className="text-xs text-agua-600">
                        <Droplets className="w-3 h-3 inline mr-0.5" />
                        {selectedClient.containersOwed} envases
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedClient(null)}>
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente..."
                      className="pl-9"
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientSearch(true); }}
                      onFocus={() => setShowClientSearch(true)}
                    />
                  </div>
                  {showClientSearch && clientsData?.clients?.length > 0 && (
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {clientsData.clients.map((c: Client) => (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedClient(c);
                            setClientSearch("");
                            setShowClientSearch(false);
                          }}
                        >
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.address}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalle de la venta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Detalle de entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="containersDelivered" className="text-xs">Bidones entregados</Label>
                  <Input
                    id="containersDelivered"
                    name="containersDelivered"
                    type="number"
                    min="0"
                    value={form.containersDelivered}
                    onChange={(e) => handleChange("containersDelivered", Number(e.target.value))}
                    className="text-lg font-bold text-center h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="containersReturned" className="text-xs">Envases retirados</Label>
                  <Input
                    id="containersReturned"
                    name="containersReturned"
                    type="number"
                    min="0"
                    value={form.containersReturned}
                    onChange={(e) => handleChange("containersReturned", Number(e.target.value))}
                    className="text-lg font-bold text-center h-12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice" className="text-xs">Precio unitario</Label>
                  <Input
                    id="unitPrice"
                    name="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unitPrice}
                    onChange={(e) => handleChange("unitPrice", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount" className="text-xs">Descuento</Label>
                  <Input
                    id="discount"
                    name="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discount}
                    onChange={(e) => handleChange("discount", Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pago */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amountPaid" className="text-xs">Monto abonado</Label>
                  <Input
                    id="amountPaid"
                    name="amountPaid"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amountPaid}
                    onChange={(e) => handleChange("amountPaid", Number(e.target.value))}
                    className="font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod" className="text-xs">Método de pago</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => handleChange("paymentMethod", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia</SelectItem>
                      <SelectItem value="CHECK">Cheque</SelectItem>
                      <SelectItem value="CREDIT">A Cuenta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs">Observaciones</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  placeholder="Notas de la venta..."
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho: Resumen */}
        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Resumen de venta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Totales */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{form.containersDelivered} bidones × {formatCurrency(form.unitPrice)}</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {form.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span>
                    <span>-{formatCurrency(form.discount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Abonado</span>
                  <span>{formatCurrency(form.amountPaid)}</span>
                </div>
                {remainingDebt > 0 && (
                  <div className="flex justify-between text-orange-600 font-medium">
                    <span>Queda a cuenta</span>
                    <span>{formatCurrency(remainingDebt)}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Impacto en cliente */}
              {selectedClient && (
                <div className="space-y-2 text-sm bg-muted/30 rounded-md p-3">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Impacto en cliente</p>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CreditCard className="w-3.5 h-3.5" /> Nuevo saldo
                    </span>
                    <span className={newBalance > 0 ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                      {formatCurrency(newBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Droplets className="w-3.5 h-3.5" /> Envases cliente
                    </span>
                    <span className="font-medium text-agua-600">{newContainers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Neto envases
                    </span>
                    <span className={`font-medium ${form.containersDelivered - form.containersReturned > 0 ? "text-agua-600" : "text-muted-foreground"}`}>
                      +{form.containersDelivered - form.containersReturned}
                    </span>
                  </div>
                </div>
              )}

              {!selectedClient && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
                  <AlertTriangle className="w-4 h-4" />
                  Seleccione un cliente para continuar
                </div>
              )}

              {/* Botón confirmar */}
              <Button
                className="w-full h-12 text-base bg-agua-600 hover:bg-agua-700"
                disabled={!selectedClient || saleMutation.isPending || form.containersDelivered === 0}
                onClick={handleSubmit}
              >
                {saleMutation.isPending ? (
                  "Procesando..."
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Confirmar venta
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de éxito */}
      <Dialog open={!!successSale} onOpenChange={() => setSuccessSale(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center">¡Venta registrada!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-lg">Comprobante N° {successSale?.saleNumber}</p>
              <p className="text-muted-foreground text-sm">La venta fue procesada exitosamente</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-md text-sm space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{formatCurrency(successSale?.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Abonado</span>
                <span className="text-green-600">{formatCurrency(successSale?.amountPaid)}</span>
              </div>
            </div>
            <Button className="w-full" onClick={() => setSuccessSale(null)}>
              Nueva venta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
