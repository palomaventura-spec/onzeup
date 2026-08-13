import { PrismaClient, OrganizationType, SportType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("OnzeUp123!", 10);

  const org = await prisma.organization.upsert({
    where: { slug: "demo-clube-onzeup" },
    update: {
      name: "Clube Demo OnzeUp",
      publicName: "Clube Demo OnzeUp",
      description: "Clube fictício criado exclusivamente para demonstração da plataforma ONZEUP.",
      city: "Rio de Janeiro",
      state: "RJ",
      onboardingCompleted: true,
      active: true
    },
    create: {
      name: "Clube Demo OnzeUp",
      publicName: "Clube Demo OnzeUp",
      type: OrganizationType.SCHOOL,
      sport: SportType.BOTH,
      slug: "demo-clube-onzeup",
      description: "Clube fictício criado exclusivamente para demonstração da plataforma ONZEUP.",
      city: "Rio de Janeiro",
      state: "RJ",
      onboardingCompleted: true,
      subscription: { create: { plan: "STARTER" } },
      categories: {
        create: [
          { name: "Sub-8", birthYear: 2018 },
          { name: "Sub-9", birthYear: 2017 },
          { name: "Sub-11", birthYear: 2015 }
        ]
      }
    }
  });

  for (const category of [
    { name: "Sub-8", birthYear: 2018 },
    { name: "Sub-9", birthYear: 2017 },
    { name: "Sub-11", birthYear: 2015 }
  ]) {
    const existing = await prisma.category.findFirst({
      where: { organizationId: org.id, name: category.name }
    });
    if (!existing) {
      await prisma.category.create({
        data: { ...category, organizationId: org.id }
      });
    }
  }

  await prisma.user.upsert({
    where: { email: "admin@onzeup.com.br" },
    update: {
      name: "Coordenador Demo",
      passwordHash,
      role: UserRole.COORDINATOR,
      organizationId: org.id,
      active: true
    },
    create: {
      name: "Coordenador Demo",
      email: "admin@onzeup.com.br",
      passwordHash,
      role: UserRole.COORDINATOR,
      organizationId: org.id
    }
  });

  const guardian = await prisma.user.upsert({
    where: { email: "responsavel@onzeup.com.br" },
    update: {
      name: "Responsável Demo",
      passwordHash,
      role: UserRole.GUARDIAN,
      organizationId: null,
      active: true
    },
    create: {
      name: "Responsável Demo",
      email: "responsavel@onzeup.com.br",
      passwordHash,
      role: UserRole.GUARDIAN
    }
  });
  const guardianProfile = await prisma.guardianProfile.upsert({
    where: { userId: guardian.id },
    update: { phone: "(21) 99999-0000" },
    create: { userId: guardian.id, phone: "(21) 99999-0000" }
  });

  const sub9 = await prisma.category.findFirst({
    where: { organizationId: org.id, name: "Sub-9" }
  });

  if (sub9) {
    let demoAthlete = await prisma.athlete.findFirst({
      where: { organizationId: org.id, name: "Lucas Demo" }
    });

    if (!demoAthlete) {
      demoAthlete = await prisma.athlete.create({
        data: {
          organizationId: org.id,
          categoryId: sub9.id,
          name: "Lucas Demo",
          nickname: "L10",
          jerseyNumber: 10,
          position: "Atacante",
          dominantFoot: "Direito",
          birthYear: 2018,
          guardianName: "Responsável Demo",
          guardianPhone: "(21) 99999-0000",
          guardianEmail: "responsavel@onzeup.com.br",
          active: true
        }
      });
    }

    const demoPlayer = await prisma.playerProfile.upsert({
      where: { slug: "lucas-demo" },
      update: {
        guardianId: guardianProfile.id,
        isPublic: true
      },
      create: {
        slug: "lucas-demo",
        name: "Lucas Demo",
        nickname: "L10",
        birthYear: 2018,
        position: "Atacante",
        secondaryPosition: "Pivô",
        dominantFoot: "Direito",
        height: "1,33 m",
        weight: "28 kg",
        nationality: "Brasil",
        currentClub: "Clube Demo OnzeUp",
        bio: "Atleta fictício criado exclusivamente para demonstrar os recursos do ONZE Player.",
        matches: 24,
        goals: 31,
        assists: 12,
        titles: 2,
        careerHistory: "2026 — atual | Academia OnzeUp\n2025 | Projeto Base Demo",
        achievements: "Artilheiro da Copa Demo\nDestaque da categoria Sub-9",
        template: "PREMIUM_DARK",
        isPublic: true,
        guardianId: guardianProfile.id
      }
    });

    await prisma.playerAthleteLink.upsert({
      where: {
        playerId_athleteId: {
          playerId: demoPlayer.id,
          athleteId: demoAthlete.id
        }
      },
      update: { verified: true },
      create: {
        playerId: demoPlayer.id,
        athleteId: demoAthlete.id,
        verified: true
      }
    });

    const existingStaff = await prisma.staffMember.findFirst({
      where: { organizationId: org.id, name: "Treinador Demo", categoryId: sub9.id }
    });
    if (!existingStaff) {
      await prisma.staffMember.create({
        data: {
          organizationId: org.id,
          categoryId: sub9.id,
          name: "Treinador Demo",
          roleTitle: "Treinador"
        }
      });
    }

    const existingTraining = await prisma.trainingSchedule.findFirst({
      where: { organizationId: org.id, categoryId: sub9.id, weekday: 2 }
    });
    if (!existingTraining) {
      await prisma.trainingSchedule.create({
        data: {
          organizationId: org.id,
          categoryId: sub9.id,
          weekday: 2,
          startTime: "18:00",
          endTime: "19:30",
          location: "Campo Principal"
        }
      });
    }

    const existingMatch = await prisma.match.findFirst({
      where: { organizationId: org.id, categoryId: sub9.id, opponent: "Academia Futuro" }
    });
    if (!existingMatch) {
      const nextSaturday = new Date();
      nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
      nextSaturday.setHours(10, 0, 0, 0);
      await prisma.match.create({
        data: {
          organizationId: org.id,
          categoryId: sub9.id,
          opponent: "Academia Futuro",
          competition: "Copa Demonstração",
          startsAt: nextSaturday,
          location: "Arena OnzeUp",
          status: "SCHEDULED"
        }
      });
    }
  }


  // ONZE Player model account — Gustavo
  const gustavoHash = await bcrypt.hash("G9OnzeUp2026!", 10);
  const gustavoGuardian = await prisma.user.upsert({
    where: { email: "gustavo.model@onzeup.com.br" },
    update: {
      name: "Responsável Gustavo",
      passwordHash: gustavoHash,
      role: UserRole.GUARDIAN,
      organizationId: null,
      active: true,
      accountStatus: "ACTIVE"
    },
    create: {
      name: "Responsável Gustavo",
      email: "gustavo.model@onzeup.com.br",
      passwordHash: gustavoHash,
      role: UserRole.GUARDIAN,
      active: true,
      accountStatus: "ACTIVE"
    }
  });

  const gustavoGuardianProfile = await prisma.guardianProfile.upsert({
    where: { userId: gustavoGuardian.id },
    update: {},
    create: { userId: gustavoGuardian.id }
  });

  const gustavoCommon = {
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
    careerHistory: "2026 — atual | Botafogo | Futebol e Futsal\n2025 | Arouca Futsal",
    achievements: "Artilharia em competição estadual\nArtilharia em torneio de base\nParticipação em competições pelo Botafogo",
    websiteUrl: "https://www.gustavoaguiarg9.online/",
    guardianId: gustavoGuardianProfile.id,
    isPublic: true
  };

  await prisma.playerProfile.upsert({
    where: { slug: "gustavo-aguiar-free" },
    update: {
      ...gustavoCommon,
      plan: "FREE",
      template: "FREE_CLEAN",
      directoryVisible: false,
      videos: null,
      gallery: null
    },
    create: {
      ...gustavoCommon,
      slug: "gustavo-aguiar-free",
      plan: "FREE",
      template: "FREE_CLEAN",
      directoryVisible: false
    }
  });

  await prisma.playerProfile.upsert({
    where: { slug: "gustavo-aguiar" },
    update: {
      ...gustavoCommon,
      plan: "PREMIUM",
      template: "PREMIUM_DARK",
      directoryVisible: true,
      isComplimentary: true,
      complimentaryReason: "Perfil modelo oficial ONZEUP"
    },
    create: {
      ...gustavoCommon,
      slug: "gustavo-aguiar",
      plan: "PREMIUM",
      template: "PREMIUM_DARK",
      directoryVisible: true,
      isComplimentary: true,
      complimentaryReason: "Perfil modelo oficial ONZEUP"
    }
  });

  await prisma.user.upsert({
    where: { email: "onzeupfutebolbase@gmail.com" },
    update: {},
    create: {
      name: "Admin ONZEUP",
      email: "onzeupfutebolbase@gmail.com",
      passwordHash,
      role: UserRole.SUPER_ADMIN
    }
  });
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
