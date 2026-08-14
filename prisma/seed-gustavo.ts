import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "gustavo.model@onzeup.com.br";
  const password = "G9OnzeUp2026!";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Responsável Gustavo",
      passwordHash,
      role: UserRole.GUARDIAN,
      organizationId: null,
      active: true,
      accountStatus: "ACTIVE",
    },
    create: {
      name: "Responsável Gustavo",
      email,
      passwordHash,
      role: UserRole.GUARDIAN,
      organizationId: null,
      active: true,
      accountStatus: "ACTIVE",
    },
  });

  const guardian = await prisma.guardianProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const common = {
    name: "Gustavo Aguiar",
    nickname: "G9",
    birthYear: 2018,
    position: "Atacante",
    secondaryPosition: "Pivô",
    dominantFoot: "Direito",
    height: "1,34 m",
    weight: "28 kg",
    nationality: "Brasil • Portugal",
    modality: "Campo + Futsal",
    categoryLabel: "Sub-9",
    currentClub: "Botafogo",
    photoUrl: "/marketing/gustavo-onze-player.jpg",
    coverUrl: "/marketing/gustavo-onze-player.jpg",
    bio: "Atleta de futebol e futsal com perfil ofensivo, presença de área, movimentação e regularidade em competições de base.",
    matches: 62,
    goals: 128,
    titles: 2,
    careerHistory:
      "2026 — atual | Botafogo | Futebol e Futsal\n2025 | Arouca Futsal",
    achievements:
      "Artilharia em competição estadual\nArtilharia em torneio de base\nParticipação em competições pelo Botafogo",
    websiteUrl: "https://www.gustavoaguiarg9.online/",
    guardianId: guardian.id,
    isPublic: true,
  };

  await prisma.playerProfile.upsert({
    where: { slug: "gustavo-aguiar-free" },
    update: {
      ...common,
      plan: "FREE",
      template: "FREE_CLEAN",
      directoryVisible: false,
      videos: null,
      gallery: null,
    },
    create: {
      ...common,
      slug: "gustavo-aguiar-free",
      plan: "FREE",
      template: "FREE_CLEAN",
      directoryVisible: false,
    },
  });

  await prisma.playerProfile.upsert({
    where: { slug: "gustavo-aguiar" },
    update: {
      ...common,
      plan: "PREMIUM",
      template: "PREMIUM_DARK",
      directoryVisible: true,
      isComplimentary: true,
      complimentaryReason: "Perfil modelo oficial ONZEUP",
      isFeatured: true,
    },
    create: {
      ...common,
      slug: "gustavo-aguiar",
      plan: "PREMIUM",
      template: "PREMIUM_DARK",
      directoryVisible: true,
      isComplimentary: true,
      complimentaryReason: "Perfil modelo oficial ONZEUP",
      isFeatured: true,
    },
  });

  // Remove sessões antigas dessa conta para o teste começar limpo.
  await prisma.session.deleteMany({ where: { userId: user.id } });

  console.log("");
  console.log("✅ Conta modelo do Gustavo pronta.");
  console.log(`E-mail: ${email}`);
  console.log(`Senha: ${password}`);
  console.log(`User ID: ${user.id}`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ Erro ao criar conta do Gustavo:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
