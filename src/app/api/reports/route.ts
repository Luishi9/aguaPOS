import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "sales"; // sales | debt | containers
  const branchId = searchParams.get("branchId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const branchFilter = branchId ? { branchId } : {};
  const dateFilter =
    dateFrom || dateTo
      ? {
          saleDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {};

  if (type === "sales") {
    const sales = await prisma.sale.findMany({
      where: { ...branchFilter, ...dateFilter, status: "COMPLETED" },
      include: {
        client: { select: { name: true } },
        branch: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { saleDate: "desc" },
      take: 500,
    });
    return NextResponse.json(sales);
  }

  if (type === "debt") {
    const clients = await prisma.client.findMany({
      where: {
        ...branchFilter,
        currentBalance: { gt: 0 },
        isActive: true,
      },
      include: { branch: { select: { name: true } } },
      orderBy: { currentBalance: "desc" },
      take: 100,
    });
    return NextResponse.json(clients);
  }

  if (type === "containers") {
    const clients = await prisma.client.findMany({
      where: {
        ...branchFilter,
        containersOwed: { gt: 0 },
        isActive: true,
      },
      include: { branch: { select: { name: true } } },
      orderBy: { containersOwed: "desc" },
      take: 100,
    });
    return NextResponse.json(clients);
  }

  return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 });
}
