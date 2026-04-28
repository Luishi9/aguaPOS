"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building2, Users, Package, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  defaultUnitPrice: number;
  isActive: boolean;
  _count: { clients: number; users: number };
  inventory?: { fullContainers: number; emptyContainers: number };
}

export default function BranchesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", defaultUnitPrice: "2500" });

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Error");
      return res.json() as Promise<Branch[]>;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const url = data.id ? `/api/branches/${data.id}` : "/api/branches";
      const method = data.id ? "PUT" : "POST";
      const { id, ...body } = data;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error al guardar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setIsModalOpen(false);
      setEditBranch(null);
      toast({ title: editBranch ? "Sucursal actualizada" : "Sucursal creada" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  function handleNew() {
    setEditBranch(null);
    setForm({ name: "", address: "", phone: "", defaultUnitPrice: "2500" });
    setIsModalOpen(true);
  }

  function handleEdit(branch: Branch) {
    setEditBranch(branch);
    setForm({ name: branch.name, address: branch.address ?? "", phone: branch.phone ?? "", defaultUnitPrice: String(branch.defaultUnitPrice ?? 2500) });
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Sucursales</h1>
          <p className="text-sm text-muted-foreground">Gestión de sucursales del sistema</p>
        </div>
        <Button onClick={handleNew} className="bg-agua-600 hover:bg-agua-700 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nueva sucursal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
            ))
          : branches?.map((branch) => (
              <Card key={branch.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-agua-50">
                        <Building2 className="w-4 h-4 text-agua-600" />
                      </div>
                      <CardTitle className="text-base">{branch.name}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(branch)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {branch.address && <p className="text-sm text-muted-foreground">{branch.address}</p>}
                  {branch.phone && <p className="text-sm text-muted-foreground">{branch.phone}</p>}
                  <p className="text-sm font-medium text-agua-700">
                    Precio unitario: ${Number(branch.defaultUnitPrice).toLocaleString("es-AR")}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {branch._count.users} usuarios
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {branch._count.clients} clientes
                    </Badge>
                    {branch.inventory && (
                      <Badge variant="outline" className="text-xs">
                        <Package className="w-3 h-3 mr-1" />
                        {branch.inventory.fullContainers} llenos
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={(o) => !o && setIsModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editBranch ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="branchName">Nombre *</Label>
              <Input id="branchName" name="branchName" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ej: Sucursal Norte" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchAddress">Dirección</Label>
              <Input id="branchAddress" name="branchAddress" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchPhone">Teléfono</Label>
              <Input id="branchPhone" name="branchPhone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchDefaultUnitPrice">Precio unitario por defecto ($)</Label>
              <Input
                id="branchDefaultUnitPrice"
                name="branchDefaultUnitPrice"
                type="number"
                min="0"
                step="50"
                value={form.defaultUnitPrice}
                onChange={(e) => setForm((p) => ({ ...p, defaultUnitPrice: e.target.value }))}
                placeholder="Ej: 2500"
              />
              <p className="text-xs text-muted-foreground">Se usa como precio inicial al registrar ventas en esta sucursal.</p>
            </div>          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button
              className="bg-agua-600 hover:bg-agua-700"
              disabled={saveMutation.isPending || !form.name.trim()}
              onClick={() => saveMutation.mutate({ ...form, id: editBranch?.id })}
            >
              {saveMutation.isPending ? "Guardando..." : editBranch ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
