import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

const paymentSchema = z.object({
  clientId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CHECK", "CREDIT"]).default("CASH"),
  description: z.string().optional(),
});

// Registrar un pago a cuenta corriente
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { clientId, amount, paymentMethod, description } = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && client.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const newBalance = Number(client.currentBalance) - amount;

  const movement = await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: { currentBalance: new Decimal(newBalance) },
    });

    return tx.accountMovement.create({
      data: {
        clientId,
        type: "PAYMENT",
        amount: new Decimal(amount),
        balance: new Decimal(newBalance),
        description: description ?? "Pago a cuenta corriente",
        paymentMethod,
      },
    });
  });

  return NextResponse.json(movement, { status: 201 });
}

// Obtener movimientos de cuenta corriente
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 30);

  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  }

  const [movements, total] = await Promise.all([
    prisma.accountMovement.findMany({
      where: { clientId },
      include: { sale: { select: { saleNumber: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.accountMovement.count({ where: { clientId } }),
  ]);

  return NextResponse.json({ movements, total, page, totalPages: Math.ceil(total / limit) });
}
