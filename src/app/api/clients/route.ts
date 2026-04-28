import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  branchId: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const branchId = searchParams.get("branchId");

  const isAdmin = session.user.role === "ADMIN";
  const userBranchId = session.user.branchId;

  const where = {
    isActive: true,
    ...(isAdmin && branchId ? { branchId } : !isAdmin ? { branchId: userBranchId ?? undefined } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { address: { contains: search } },
          ],
        }
      : {}),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { branch: { select: { name: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json({ clients, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const branchId = isAdmin ? (parsed.data.branchId ?? session.user.branchId) : session.user.branchId;

  if (!branchId) {
    return NextResponse.json({ error: "Sucursal requerida" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address,
      email: parsed.data.email || null,
      notes: parsed.data.notes,
      branchId,
    },
    include: { branch: { select: { name: true } } },
  });

  return NextResponse.json(client, { status: 201 });
}
