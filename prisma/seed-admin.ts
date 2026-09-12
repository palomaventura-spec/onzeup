import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = String(process.env.ONZEUP_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ONZEUP_ADMIN_PASSWORD || "");

  if (!email) {
    throw new Error("ONZEUP_ADMIN_EMAIL não configurado.");
  }
  if (password.length < 12) {
    throw new Error("ONZEUP_ADMIN_PASSWORD deve estar configurado e ter pelo menos 12 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name: "ONZEUP Super Admin",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      active: true,
      accountStatus: "ACTIVE",
      organizationId: null,
    },
    create: {
      name: "ONZEUP Super Admin",
      email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      active: true,
      accountStatus: "ACTIVE",
      organizationId: null,
    },
  });

  await prisma.session.deleteMany({
    where: { userId: admin.id },
  });

  console.log("");
  console.log("✅ Super Admin ONZEUP criado/atualizado.");
  console.log(`E-mail: ${email}`);
  console.log("Senha: definida exclusivamente por ONZEUP_ADMIN_PASSWORD.");
  console.log(`User ID: ${admin.id}`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ Erro ao criar Super Admin:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
