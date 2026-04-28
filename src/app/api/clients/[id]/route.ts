import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      branch: { select: { name: true } },
      accountMovements: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { sale: { select: { saleNumber: true } } },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && client.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(client);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && existing.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
    },
    include: { branch: { select: { name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.client.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
