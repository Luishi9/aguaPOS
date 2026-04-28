import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const branchId = session.user.branchId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const branchFilter = isAdmin ? {} : { branchId: branchId ?? undefined };

  const [
    salesToday,
    totalRevToday,
    clientsWithDebt,
    totalDebt,
    containersOut,
    inventory,
  ] = await Promise.all([
    prisma.sale.count({
      where: {
        ...branchFilter,
        saleDate: { gte: today, lt: tomorrow },
        status: "COMPLETED",
      },
    }),
    prisma.sale.aggregate({
      where: {
        ...branchFilter,
        saleDate: { gte: today, lt: tomorrow },
        status: "COMPLETED",
      },
      _sum: { total: true },
    }),
    prisma.client.count({
      where: {
        ...branchFilter,
        currentBalance: { gt: 0 },
        isActive: true,
      },
    }),
    prisma.client.aggregate({
      where: {
        ...branchFilter,
        isActive: true,
      },
      _sum: { currentBalance: true },
    }),
    prisma.client.aggregate({
      where: {
        ...branchFilter,
        isActive: true,
      },
      _sum: { containersOwed: true },
    }),
    isAdmin
      ? prisma.inventory.findMany({ include: { branch: true } })
      : prisma.inventory.findMany({ where: { branchId: branchId ?? undefined }, include: { branch: true } }),
  ]);

  // Ventas últimos 7 días
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 6);
  last7Days.setHours(0, 0, 0, 0);

  const salesLast7Days = await prisma.sale.groupBy({
    by: ["saleDate"],
    where: {
      ...branchFilter,
      saleDate: { gte: last7Days },
      status: "COMPLETED",
    },
    _sum: { total: true },
    _count: { id: true },
  });

  return NextResponse.json({
    salesToday,
    revenueToday: Number(totalRevToday._sum.total ?? 0),
    clientsWithDebt,
    totalDebt: Number(totalDebt._sum.currentBalance ?? 0),
    containersInCirculation: Number(containersOut._sum.containersOwed ?? 0),
    inventory,
    salesChart: salesLast7Days.map((d) => ({
      date: d.saleDate,
      total: Number(d._sum.total ?? 0),
      count: d._count.id,
    })),
  });
}
