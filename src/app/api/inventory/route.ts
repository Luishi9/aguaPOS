import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const adjustSchema = z.object({
  branchId: z.string(),
  fullContainers: z.number().int().min(0),
  emptyContainers: z.number().int().min(0),
  description: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const branchId = session.user.branchId;

  const inventory = await prisma.inventory.findMany({
    where: isAdmin ? {} : { branchId: branchId ?? undefined },
    include: { branch: { select: { name: true } } },
  });

  return NextResponse.json(inventory);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { branchId, fullContainers, emptyContainers, description } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.inventory.update({
      where: { branchId },
      data: { fullContainers, emptyContainers },
      include: { branch: { select: { name: true } } },
    });

    await tx.inventoryMovement.create({
      data: {
        branchId,
        type: "ADJUSTMENT",
        description: description ?? "Ajuste manual de inventario",
      },
    });

    return inv;
  });

  return NextResponse.json(updated);
}
