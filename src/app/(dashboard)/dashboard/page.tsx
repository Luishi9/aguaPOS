"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardData {
  salesToday: number;
  revenueToday: number;
  clientsWithDebt: number;
  totalDebt: number;
  containersInCirculation: number;
  inventory: Array<{ branch: { name: string }; fullContainers: number; emptyContainers: number }>;
  salesChart: Array<{ date: string; total: number; count: number }>;
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) throw new Error("Error al cargar el dashboard");
  return res.json();
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 60000, // Refrescar cada minuto
  });

  const chartData = data?.salesChart.map((d) => ({
    name: format(new Date(d.date), "dd MMM", { locale: es }),
    ventas: d.total,
    cantidad: d.count,
  })) ?? [];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de operaciones del día</p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ventas hoy"
          value={String(data?.salesToday ?? 0)}
          subtitle="operaciones"
          icon={ShoppingCart}
          color="text-agua-600"
          bgColor="bg-agua-50"
          loading={isLoading}
        />
        <MetricCard
          title="Recaudado hoy"
          value={formatCurrency(data?.revenueToday ?? 0)}
          subtitle="en ventas"
          icon={TrendingUp}
          color="text-green-600"
          bgColor="bg-green-50"
          loading={isLoading}
        />
        <MetricCard
          title="Clientes con deuda"
          value={String(data?.clientsWithDebt ?? 0)}
          subtitle={`Total: ${formatCurrency(data?.totalDebt ?? 0)}`}
          icon={Users}
          color="text-orange-600"
          bgColor="bg-orange-50"
          loading={isLoading}
        />
        <MetricCard
          title="Bidones en circulación"
          value={String(data?.containersInCirculation ?? 0)}
          subtitle="en poder de clientes"
          icon={Droplets}
          color="text-purple-600"
          bgColor="bg-purple-50"
          loading={isLoading}
        />
      </div>

      {/* Gráfico + Inventario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de ventas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ventas últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d7ee9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1d7ee9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Ventas"]}
                  contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="#1d7ee9"
                  strokeWidth={2}
                  fill="url(#colorVentas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventario por sucursal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : data?.inventory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              data?.inventory.map((inv, i) => (
                <div key={i} className="space-y-1 p-3 rounded-md bg-muted/40">
                  <p className="text-sm font-medium truncate">{inv.branch.name}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3 text-agua-500" />
                      {inv.fullContainers} llenos
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3 text-gray-400" />
                      {inv.emptyContainers} vacíos
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loading: boolean;
}

function MetricCard({ title, value, subtitle, icon: Icon, color, bgColor, loading }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-8 bg-muted animate-pulse rounded w-1/2" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className={`p-2.5 rounded-lg ${bgColor}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
