"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Phone, MapPin, Droplets, CreditCard, Plus, TrendingDown, TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDateTime, getMovementTypeLabel, getPaymentMethodLabel } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useState } from "react";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Cliente no encontrado");
      return res.json();
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: id,
          amount: Number(paymentAmount),
          paymentMethod,
          description: "Pago a cuenta corriente",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al registrar pago");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      setIsPaymentOpen(false);
      setPaymentAmount("");
      toast({ title: "Pago registrado", description: "El pago fue registrado exitosamente." });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-40 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!client) return <div>Cliente no encontrado</div>;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground">Detalle de cuenta</p>
        </div>
      </div>

      {/* Info y métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Info del cliente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{client.address}</span>
              </div>
            )}
            <div className="pt-1">
              <Badge variant="outline">{client.branch.name}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Saldo */}
        <Card className={Number(client.currentBalance) > 0 ? "border-orange-200 bg-orange-50/30" : "border-green-200 bg-green-50/30"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Saldo actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${Number(client.currentBalance) > 0 ? "text-orange-600" : "text-green-600"}`}>
              {formatCurrency(client.currentBalance)}
            </p>
            {Number(client.currentBalance) > 0 && (
              <p className="text-xs text-orange-600 mt-1">Saldo pendiente de pago</p>
            )}
          </CardContent>
        </Card>

        {/* Envases */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Envases en poder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-agua-600">{client.containersOwed}</p>
            <p className="text-xs text-muted-foreground mt-1">bidones pendientes de devolución</p>
          </CardContent>
        </Card>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3">
        <Button
          className="bg-agua-600 hover:bg-agua-700"
          onClick={() => setIsPaymentOpen(true)}
          disabled={Number(client.currentBalance) <= 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar pago
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/pos?clientId=${client.id}`}>
            Nueva venta
          </Link>
        </Button>
      </div>

      {/* Historial de movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.accountMovements?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Sin movimientos registrados
                  </TableCell>
                </TableRow>
              ) : (
                client.accountMovements?.map((mov: any) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-sm">{formatDateTime(mov.createdAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={mov.type === "SALE" ? "default" : mov.type === "PAYMENT" ? "success" : "secondary"}
                        className="text-xs"
                      >
                        {mov.type === "SALE" ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {getMovementTypeLabel(mov.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{mov.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mov.paymentMethod ? getPaymentMethodLabel(mov.paymentMethod) : "-"}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${mov.type === "SALE" ? "text-orange-600" : "text-green-600"}`}>
                      {mov.type === "SALE" ? "+" : "-"}{formatCurrency(mov.amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(mov.balance)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal pago */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-md text-sm">
              <span className="text-muted-foreground">Saldo actual: </span>
              <span className="font-bold text-orange-600">{formatCurrency(client.currentBalance)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPaymentAmount">Monto a pagar</Label>
              <Input
                id="clientPaymentAmount"
                name="clientPaymentAmount"
                type="number"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPaymentMethod">Método de pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                  <SelectItem value="CHECK">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => paymentMutation.mutate()}
              disabled={!paymentAmount || Number(paymentAmount) <= 0 || paymentMutation.isPending}
            >
              {paymentMutation.isPending ? "Registrando..." : "Confirmar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
