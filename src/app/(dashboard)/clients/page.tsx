"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Edit2, Trash2, Eye, Phone, MapPin, Droplets, CreditCard,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  currentBalance: number;
  containersOwed: number;
  branch: { name: string };
}

async function fetchClients(search: string, page: number) {
  const params = new URLSearchParams({ search, page: String(page), limit: "20" });
  const res = await fetch(`/api/clients?${params}`);
  if (!res.ok) throw new Error("Error al cargar clientes");
  return res.json();
}

export default function ClientsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["clients", search, page],
    queryFn: () => fetchClients(search, page),
  });

  const createMutation = useMutation({
    mutationFn: async (formData: Partial<Client>) => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al crear cliente");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsModalOpen(false);
      toast({ title: "Cliente creado", description: "El cliente fue registrado exitosamente." });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Client> & { id: string }) => {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsModalOpen(false);
      setEditingClient(null);
      toast({ title: "Cliente actualizado" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente eliminado" });
    },
  });

  function handleEdit(client: Client) {
    setEditingClient(client);
    setIsModalOpen(true);
  }

  function handleNew() {
    setEditingClient(null);
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gestión de clientes y sus cuentas</p>
        </div>
        <Button onClick={handleNew} className="bg-agua-600 hover:bg-agua-700 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo cliente
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono..."
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Contacto</TableHead>
              <TableHead className="hidden sm:table-cell">Sucursal</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Envases</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.clients?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            ) : (
              data?.clients?.map((client: Client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="font-medium">{client.name}</div>
                    {client.email && <div className="text-xs text-muted-foreground hidden md:block">{client.email}</div>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5">
                      {client.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" /> {client.phone}
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {client.address}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs">{client.branch.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={Number(client.currentBalance) > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                      {formatCurrency(client.currentBalance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <Droplets className="w-3.5 h-3.5 text-agua-500" />
                      <span className="font-medium">{client.containersOwed}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link href={`/clients/${client.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(client)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${client.name}?`)) deleteMutation.mutate(client.id);
                        }}
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

      {/* Paginación */}
      {data && data.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">{data.total} clientes en total</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="px-3 py-1.5 text-sm">Página {page} de {data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      <ClientModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingClient(null); }}
        client={editingClient}
        onSave={(formData) => {
          if (editingClient) {
            updateMutation.mutate({ id: editingClient.id, ...formData });
          } else {
            createMutation.mutate(formData);
          }
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  onSave: (data: Partial<Client>) => void;
  isSaving: boolean;
}

function ClientModal({ open, onClose, client, onSave, isSaving }: ClientModalProps) {
  const [form, setForm] = useState({
    name: client?.name ?? "",
    phone: client?.phone ?? "",
    address: client?.address ?? "",
    email: client?.email ?? "",
    notes: "",
  });

  // Sync con el cliente al abrir
  useState(() => {
    setForm({
      name: client?.name ?? "",
      phone: client?.phone ?? "",
      address: client?.address ?? "",
      email: client?.email ?? "",
      notes: "",
    });
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Nombre completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="011-xxxx-xxxx" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@ejemplo.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="Dirección de entrega" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Observaciones..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button
            className="bg-agua-600 hover:bg-agua-700"
            onClick={() => onSave(form)}
            disabled={isSaving || !form.name.trim()}
          >
            {isSaving ? "Guardando..." : client ? "Actualizar" : "Crear cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
