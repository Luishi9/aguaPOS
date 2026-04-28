"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, TrendingUp, Users, Droplets } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import Papa from "papaparse";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("sales");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      return res.json();
    },
  });

  const queryParams = new URLSearchParams({
    type: reportType,
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    ...(branchFilter && { branchId: branchFilter }),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reports", reportType, dateFrom, dateTo, branchFilter],
    queryFn: async () => {
      const res = await fetch(`/api/reports?${queryParams}`);
      if (!res.ok) throw new Error("Error al cargar el reporte");
      return res.json();
    },
    enabled: false,
  });

  function handleExportCSV() {
    if (!data || data.length === 0) return;

    let rows: Record<string, unknown>[] = [];
    if (reportType === "sales") {
      rows = data.map((s: any) => ({
        "N° Venta": s.saleNumber,
        Fecha: formatDateTime(s.saleDate),
        Cliente: s.client.name,
        Sucursal: s.branch.name,
        Vendedor: s.user.name,
        "Bidones Entregados": s.containersDelivered,
        "Bidones Retirados": s.containersReturned,
        "Precio Unitario": s.unitPrice,
        Total: s.total,
        Abonado: s.amountPaid,
        "Método de Pago": s.paymentMethod,
      }));
    } else if (reportType === "debt") {
      rows = data.map((c: any) => ({
        Cliente: c.name,
        Teléfono: c.phone ?? "",
        Dirección: c.address ?? "",
        Sucursal: c.branch.name,
        "Saldo Deudor": c.currentBalance,
      }));
    } else {
      rows = data.map((c: any) => ({
        Cliente: c.name,
        Teléfono: c.phone ?? "",
        Dirección: c.address ?? "",
        Sucursal: c.branch.name,
        "Envases en Poder": c.containersOwed,
      }));
    }

    const csv = Papa.unparse(rows, { delimiter: "," });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_${reportType}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const reportTabs = [
    { key: "sales", label: "Ventas", icon: TrendingUp },
    { key: "debt", label: "Deudores", icon: Users },
    { key: "containers", label: "Envases", icon: Droplets },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">Análisis y exportación de datos</p>
      </div>

      {/* Tipo de reporte */}
      <div className="flex flex-wrap gap-2">
        {reportTabs.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={reportType === key ? "default" : "outline"}
            size="sm"
            className={reportType === key ? "bg-agua-600 hover:bg-agua-700" : ""}
            onClick={() => setReportType(key)}
          >
            <Icon className="w-4 h-4 mr-1.5" />
            {label}
          </Button>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {reportType === "sales" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="reportDateFrom" className="text-xs">Desde</Label>
                  <Input id="reportDateFrom" name="reportDateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reportDateTo" className="text-xs">Hasta</Label>
                  <Input id="reportDateTo" name="reportDateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reportBranch" className="text-xs">Sucursal</Label>
              <Select value={branchFilter || "all"} onValueChange={(v) => setBranchFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {branches?.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="bg-agua-600 hover:bg-agua-700 w-full" onClick={() => refetch()}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Generar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-base">
                {data.length} registros encontrados
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={data.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
          <div className="overflow-x-auto">
            {/* Tabla de ventas */}
            {reportType === "sales" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Venta</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Sucursal</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Abonado</TableHead>
                    <TableHead className="hidden md:table-cell">Método</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.saleNumber}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">{formatDateTime(s.saleDate)}</TableCell>
                      <TableCell className="text-sm">{s.client.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{s.branch.name}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(s.total)}</TableCell>
                      <TableCell className={`text-right hidden sm:table-cell ${Number(s.amountPaid) >= Number(s.total) ? "text-green-600" : "text-orange-600"}`}>
                        {formatCurrency(s.amountPaid)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{s.paymentMethod}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Tabla de deudores / envases */}
            {(reportType === "debt" || reportType === "containers") && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                    <TableHead className="hidden md:table-cell">Sucursal</TableHead>
                    {reportType === "debt" ? (
                      <TableHead className="text-right">Saldo deudor</TableHead>
                    ) : (
                      <TableHead className="text-right">Envases en poder</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{c.phone ?? "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{c.branch.name}</Badge>
                      </TableCell>
                      {reportType === "debt" ? (
                        <TableCell className="text-right font-bold text-orange-600">
                          {formatCurrency(c.currentBalance)}
                        </TableCell>
                      ) : (
                        <TableCell className="text-right font-bold text-agua-600">
                          {c.containersOwed}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-sm">Cargando reporte...</div>
        </div>
      )}

      {!data && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Selecciona los filtros y haz clic en "Generar"</p>
        </div>
      )}
    </div>
  );
}
