"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  branchId?: string;
  branch?: { name: string };
  createdAt: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SELLER",
    branchId: "",
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Error");
      return res.json() as Promise<User[]>;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const url = data.id ? `/api/users/${data.id}` : "/api/users";
      const method = data.id ? "PUT" : "POST";
      const { id, ...body } = data;
      const payload = { ...body, branchId: body.branchId || null };
      if (id && !body.password) delete (payload as any).password;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al guardar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsModalOpen(false);
      setEditUser(null);
      toast({ title: editUser ? "Usuario actualizado" : "Usuario creado" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuario eliminado" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  function handleNew() {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: "SELLER", branchId: "" });
    setIsModalOpen(true);
  }

  function handleEdit(user: User) {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, branchId: user.branchId ?? "" });
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Gestión de accesos al sistema</p>
        </div>
        <Button onClick={handleNew} className="bg-agua-600 hover:bg-agua-700 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo usuario
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="hidden md:table-cell">Sucursal</TableHead>
              <TableHead className="hidden sm:table-cell">Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-agua-100 flex items-center justify-center text-agua-700 font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-xs">
                      {user.role === "ADMIN" ? "Admin" : "Vendedor"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{user.branch?.name ?? <span className="text-muted-foreground italic">Sin sucursal</span>}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(user)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("¿Eliminar este usuario?")) deleteMutation.mutate(user.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(o) => !o && setIsModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="userName">Nombre *</Label>
              <Input id="userName" name="userName" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email *</Label>
              <Input id="userEmail" name="userEmail" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userPassword">{editUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}</Label>
              <Input id="userPassword" name="userPassword" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="userRole">Rol</Label>
                <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="SELLER">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userBranch">Sucursal</Label>
                <Select value={form.branchId || "none"} onValueChange={(v) => setForm((p) => ({ ...p, branchId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin sucursal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sucursal</SelectItem>
                    {branches?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button
              className="bg-agua-600 hover:bg-agua-700"
              disabled={saveMutation.isPending || !form.name || !form.email || (!editUser && !form.password)}
              onClick={() => saveMutation.mutate({ ...form, id: editUser?.id })}
            >
              {saveMutation.isPending ? "Guardando..." : editUser ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
