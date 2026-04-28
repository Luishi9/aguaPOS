import { PrismaClient, UserRole, PaymentMethod, MovementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de base de datos...");

  // Crear sucursales
  const branch1 = await prisma.branch.upsert({
    where: { id: "branch-central" },
    update: {},
    create: {
      id: "branch-central",
      name: "Sucursal Central",
      address: "Av. Principal 123",
      phone: "011-4567-8900",
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { id: "branch-norte" },
    update: {},
    create: {
      id: "branch-norte",
      name: "Sucursal Norte",
      address: "Av. Norte 456",
      phone: "011-4567-8901",
    },
  });

  console.log("✅ Sucursales creadas");

  // Crear inventario para cada sucursal
  await prisma.inventory.upsert({
    where: { branchId: branch1.id },
    update: {},
    create: {
      branchId: branch1.id,
      fullContainers: 150,
      emptyContainers: 30,
    },
  });

  await prisma.inventory.upsert({
    where: { branchId: branch2.id },
    update: {},
    create: {
      branchId: branch2.id,
      fullContainers: 80,
      emptyContainers: 15,
    },
  });

  console.log("✅ Inventario creado");

  // Crear usuarios
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const sellerPassword = await bcrypt.hash("vendedor123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@aguapos.com" },
    update: {},
    create: {
      email: "admin@aguapos.com",
      name: "Administrador",
      password: hashedPassword,
      role: UserRole.ADMIN,
      branchId: branch1.id,
    },
  });

  const seller1 = await prisma.user.upsert({
    where: { email: "vendedor@aguapos.com" },
    update: {},
    create: {
      email: "vendedor@aguapos.com",
      name: "Juan Vendedor",
      password: sellerPassword,
      role: UserRole.SELLER,
      branchId: branch1.id,
    },
  });

  const seller2 = await prisma.user.upsert({
    where: { email: "vendedor2@aguapos.com" },
    update: {},
    create: {
      email: "vendedor2@aguapos.com",
      name: "María Vendedora",
      password: sellerPassword,
      role: UserRole.SELLER,
      branchId: branch2.id,
    },
  });

  console.log("✅ Usuarios creados");
  console.log("   Admin: admin@aguapos.com / admin123");
  console.log("   Vendedor: vendedor@aguapos.com / vendedor123");

  // Crear clientes de ejemplo
  const clients = [
    { name: "Carlos García", phone: "011-1234-5678", address: "Calle 1 N°100", branchId: branch1.id },
    { name: "María López", phone: "011-2345-6789", address: "Calle 2 N°200", branchId: branch1.id },
    { name: "Pedro Martínez", phone: "011-3456-7890", address: "Av. Sur 300", branchId: branch1.id },
    { name: "Ana Rodríguez", phone: "011-4567-8901", address: "Pasaje Norte 50", branchId: branch2.id },
    { name: "Luis Fernández", phone: "011-5678-9012", address: "Boulevard 400", branchId: branch2.id },
  ];

  for (const client of clients) {
    await prisma.client.upsert({
      where: { id: `client-${client.name.toLowerCase().replace(/\s/g, "-")}` },
      update: {},
      create: {
        id: `client-${client.name.toLowerCase().replace(/\s/g, "-")}`,
        ...client,
        containersOwed: Math.floor(Math.random() * 10),
        currentBalance: Math.floor(Math.random() * 5000),
      },
    });
  }

  console.log("✅ Clientes de ejemplo creados");
  console.log("🎉 Seed completado exitosamente!");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
