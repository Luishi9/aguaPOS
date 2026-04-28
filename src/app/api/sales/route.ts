import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateSaleNumber } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/library";

const saleSchema = z.object({
  clientId: z.string(),
  containersDelivered: z.number().int().min(0),
  containersReturned: z.number().int().min(0),
  unitPrice: z.number().positive(),
  amountPaid: z.number().min(0),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CHECK", "CREDIT"]).default("CASH"),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const clientId = searchParams.get("clientId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const isAdmin = session.user.role === "ADMIN";
  const branchFilter = isAdmin ? {} : { branchId: session.user.branchId ?? undefined };

  const where = {
    ...branchFilter,
    status: "COMPLETED" as const,
    ...(clientId ? { clientId } : {}),
    ...(dateFrom || dateTo
      ? {
          saleDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
  };

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        client: { select: { name: true } },
        branch: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { saleDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return NextResponse.json({ sales, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const branchId = session.user.branchId;

  if (!branchId) {
    return NextResponse.json({ error: "Usuario sin sucursal asignada" }, { status: 400 });
  }

  // Verificar que el cliente existe y pertenece a la sucursal
  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && client.branchId !== branchId) {
    return NextResponse.json({ error: "Cliente no pertenece a su sucursal" }, { status: 403 });
  }

  // Calcular totales
  const subtotal = data.containersDelivered * data.unitPrice;
  const total = subtotal - data.discount;
  const containersNet = data.containersDelivered - data.containersReturned;

  // La deuda que genera esta venta = total - amountPaid
  const debtGenerated = Math.max(0, total - data.amountPaid);
  const overpayment = Math.max(0, data.amountPaid - total);

  // Verificar inventario
  const inventory = await prisma.inventory.findUnique({ where: { branchId } });
  if (!inventory || inventory.fullContainers < data.containersDelivered) {
    return NextResponse.json({ error: "Stock insuficiente de bidones llenos" }, { status: 400 });
  }

  // Transacción atómica
  const sale = await prisma.$transaction(async (tx) => {
    // Crear venta
    const newSale = await tx.sale.create({
      data: {
        saleNumber: generateSaleNumber(),
        clientId: data.clientId,
        branchId,
        userId: session.user.id,
        containersDelivered: data.containersDelivered,
        containersReturned: data.containersReturned,
        containersNet,
        unitPrice: data.unitPrice,
        subtotal,
        discount: data.discount,
        total,
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        status: "COMPLETED",
      },
    });

    // Actualizar balance de envases y cuenta corriente del cliente
    const newBalance = Number(client.currentBalance) + debtGenerated - overpayment;
    const newContainers = client.containersOwed + containersNet;

    await tx.client.update({
      where: { id: data.clientId },
      data: {
        currentBalance: new Decimal(newBalance),
        containersOwed: newContainers,
      },
    });

    // Registrar movimiento de cuenta corriente (la venta)
    await tx.accountMovement.create({
      data: {
        clientId: data.clientId,
        saleId: newSale.id,
        type: "SALE",
        amount: new Decimal(total),
        balance: new Decimal(Number(client.currentBalance) + total),
        description: `Venta ${newSale.saleNumber} - ${data.containersDelivered} bidones`,
        paymentMethod: data.paymentMethod,
      },
    });

    // Si pagó algo, registrar el pago
    if (data.amountPaid > 0) {
      await tx.accountMovement.create({
        data: {
          clientId: data.clientId,
          saleId: newSale.id,
          type: "PAYMENT",
          amount: new Decimal(data.amountPaid),
          balance: new Decimal(newBalance),
          description: `Pago en venta ${newSale.saleNumber}`,
          paymentMethod: data.paymentMethod,
        },
      });
    }

    // Actualizar inventario
    await tx.inventory.update({
      where: { branchId },
      data: {
        fullContainers: { decrement: data.containersDelivered },
        emptyContainers: { increment: data.containersReturned },
      },
    });

    // Registrar movimiento de inventario
    await tx.inventoryMovement.create({
      data: {
        branchId,
        type: "SALE",
        fullOut: data.containersDelivered,
        emptyIn: data.containersReturned,
        description: `Venta ${newSale.saleNumber}`,
      },
    });

    return newSale;
  });

  return NextResponse.json(sale, { status: 201 });
}
