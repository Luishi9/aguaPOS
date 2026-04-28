import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const branchSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  defaultUnitPrice: z.coerce.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  const { id } = await params;
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      inventory: true,
      _count: { select: { clients: true } },
    },
  });
  if (!branch) return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  return NextResponse.json(branch);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });

  const { defaultUnitPrice, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (defaultUnitPrice !== undefined) {
    data.defaultUnitPrice = String(defaultUnitPrice);
  }

  try {
    const updated = await prisma.branch.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating branch:", err);
    return NextResponse.json({ error: "Error al actualizar sucursal" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.branch.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
