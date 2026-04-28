"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Droplets, Building2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useSession } from "next-auth/react";

interface InventoryItem {
  branchId: string;
  fullContainers: number;
  emptyContainers: number;
  updatedAt: string;
  branch: { name: string };
}

export default function InventoryPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = session?.user.role === "ADMIN";
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ fullContainers: 0, emptyContainers: 0, description: "" });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Error al cargar inventario");
      return res.json() as Promise<InventoryItem[]>;
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (data: { branchId: string; fullContainers: number; emptyContainers: number; description: string }) => {
      const res = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al ajustar inventario");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setEditItem(null);
      toast({ title: "Inventario actualizado" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  function handleEdit(item: InventoryItem) {
    setEditItem(item);
    setForm({ fullContainers: item.fullContainers, emptyContainers: item.emptyContainers, description: "" });
  }

  const totals = inventory?.reduce(
    (acc, inv) => ({
      full: acc.full + inv.fullContainers,
      empty: acc.empty + inv.emptyContainers,
    }),
    { full: 0, empty: 0 }
  ) ?? { full: 0, empty: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Inventario</h1>
        <p className="text-sm text-muted-foreground">Stock de bidones por sucursal</p>
      </div>

      {/* Totales globales (solo admin) */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-agua-200 bg-agua-50/30">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total bidones llenos</p>
                  <p className="text-3xl font-bold text-agua-600 mt-1">{totals.full}</p>
                </div>
                <div className="p-3 rounded-xl bg-agua-100">
                  <Droplets className="w-6 h-6 text-agua-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total envases vacíos</p>
                  <p className="text-3xl font-bold mt-1">{totals.empty}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cards por sucursal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <div className="h-5 bg-muted animate-pulse rounded" />
                  <div className="h-12 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))
          : inventory?.map((item) => (
              <Card key={item.branchId} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {item.branch.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-agua-50 text-center">
                      <Droplets className="w-5 h-5 text-agua-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-agua-700">{item.fullContainers}</p>
                      <p className="text-xs text-muted-foreground">Llenos</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 text-center">
                      <Package className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-2xl font-bold">{item.emptyContainers}</p>
                      <p className="text-xs text-muted-foreground">Vacíos</p>
                    </div>
                  </div>

                  {/* Alerta de stock bajo */}
                  {item.fullContainers < 10 && (
                    <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
                      ⚠ Stock bajo de bidones llenos
                    </p>
                  )}

                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-2" />
                      Ajustar stock
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Modal ajuste */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar inventario - {editItem?.branch.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fullContainers">Bidones llenos</Label>
              <Input
                id="fullContainers"
                name="fullContainers"
                type="number"
                min="0"
                value={form.fullContainers}
                onChange={(e) => setForm((p) => ({ ...p, fullContainers: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emptyContainers">Envases vacíos</Label>
              <Input
                id="emptyContainers"
                name="emptyContainers"
                type="number"
                min="0"
                value={form.emptyContainers}
                onChange={(e) => setForm((p) => ({ ...p, emptyContainers: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustDescription">Motivo del ajuste</Label>
              <Input
                id="adjustDescription"
                name="adjustDescription"
                placeholder="Ej: Compra de nuevos bidones"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button
              className="bg-agua-600 hover:bg-agua-700"
              disabled={adjustMutation.isPending}
              onClick={() =>
                adjustMutation.mutate({
                  branchId: editItem!.branchId,
                  ...form,
                })
              }
            >
              {adjustMutation.isPending ? "Guardando..." : "Guardar ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
