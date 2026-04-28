import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const branchSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  phone: z.string().optional(),
  defaultUnitPrice: z.coerce.number().positive().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { clients: true, users: true } },
      inventory: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(branches);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { defaultUnitPrice, ...rest } = parsed.data;

  const branch = await prisma.$transaction(async (tx) => {
    const newBranch = await tx.branch.create({
      data: {
        ...rest,
        ...(defaultUnitPrice !== undefined && { defaultUnitPrice }),
      },
    });
    await tx.inventory.create({
      data: { branchId: newBranch.id, fullContainers: 0, emptyContainers: 0 },
    });
    return newBranch;
  });

  return NextResponse.json(branch, { status: 201 });
}
