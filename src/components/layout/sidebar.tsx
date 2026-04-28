"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  CreditCard,
  Package,
  Building2,
  UserCog,
  BarChart3,
  Droplets,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: {
    name?: string | null;
    role: string;
    branchName?: string | null;
  };
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "SELLER"],
  },
  {
    title: "Punto de Venta",
    href: "/pos",
    icon: ShoppingCart,
    roles: ["ADMIN", "SELLER"],
  },
  {
    title: "Clientes",
    href: "/clients",
    icon: Users,
    roles: ["ADMIN", "SELLER"],
  },
  {
    title: "Cuenta Corriente",
    href: "/accounts",
    icon: CreditCard,
    roles: ["ADMIN", "SELLER"],
  },
  {
    title: "Inventario",
    href: "/inventory",
    icon: Package,
    roles: ["ADMIN", "SELLER"],
  },
  {
    title: "Reportes",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN"],
  },
  {
    title: "Sucursales",
    href: "/branches",
    icon: Building2,
    roles: ["ADMIN"],
  },
  {
    title: "Usuarios",
    href: "/users",
    icon: UserCog,
    roles: ["ADMIN"],
  },
];

export function Sidebar({ user, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-card border-r shadow-lg transition-transform duration-300 ease-in-out",
        "lg:relative lg:z-auto lg:w-64 lg:shadow-sm lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-agua-600 shadow-sm shrink-0">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg leading-none">AguaPOS</span>
            <p className="text-xs text-muted-foreground mt-0.5">Sistema de Reparto</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Sucursal activa */}
      {user.branchName && (
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium truncate">{user.branchName}</span>
          </div>
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-agua-600 text-white shadow-sm shadow-agua-600/20"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer del sidebar */}
      <div className="px-4 py-4 border-t bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-agua-100 flex items-center justify-center text-agua-700 font-semibold text-sm">
            {user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.role === "ADMIN" ? "Administrador" : "Vendedor"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
