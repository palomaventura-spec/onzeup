"use server";

import crypto from "crypto";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import {
  canManageClubUsers,
  type ClubRole,
} from "@/lib/club-permissions";
import { sendTransactionalEmail } from "@/lib/email";

const clean = (
  value: FormDataEntryValue | null
) => String(value || "").trim();

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://www.onzeup.com.br"
      : "http://localhost:3000")
  ).replace(/\/$/, "");
}

function createInviteToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

function hashInviteToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function validClubRole(
  value: string
): value is ClubRole {
  return [
    "MANAGER",
    "COORDINATOR",
    "COACH",
    "FINANCE",
  ].includes(value);
}

function roleLabel(role: ClubRole) {
  switch (role) {
    case "MANAGER":
      return "Gestor";
    case "COORDINATOR":
      return "Coordenador";
    case "COACH":
      return "Coach";
    case "FINANCE":
      return "Financeiro";
  }
}

async function requireAccessManager() {
  const user =
    await requireOrganizationUser();

  if (!canManageClubUsers(user)) {
    redirect("/dashboard");
  }

  return user;
}

async function sendInvite({
  userId,
  email,
  name,
  organizationName,
  clubRole,
}: {
  userId: string;
  email: string;
  name: string;
  organizationName: string;
  clubRole: ClubRole;
}) {
  const rawToken =
    createInviteToken();

  const tokenHash =
    hashInviteToken(rawToken);

  const expiresAt = new Date(
    Date.now() +
      24 * 60 * 60 * 1000
  );

  await prisma.clubUserInvite.deleteMany({
    where: {
      userId,
      usedAt: null,
    },
  });

  await prisma.clubUserInvite.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const inviteUrl =
    `${appUrl()}/aceitar-convite?token=${rawToken}`;

  const result =
    await sendTransactionalEmail({
      to: email,

      subject:
        `Convite para ${organizationName} — 11UP`,

      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#101719">
          <div style="font-size:28px;font-weight:900;margin-bottom:22px">
            11<span style="color:#9ddb16">UP</span>
          </div>

          <h2>Você recebeu um convite</h2>

          <p>Olá, ${name}.</p>

          <p>
            Você foi convidado para acessar
            <strong>${organizationName}</strong>
            no 11UP.
          </p>

          <p>
            Perfil de acesso:
            <strong>${roleLabel(clubRole)}</strong>
          </p>

          <p>
            Clique no botão abaixo para criar sua senha
            e ativar seu acesso.
          </p>

          <p style="margin:28px 0">
            <a
              href="${inviteUrl}"
              style="display:inline-block;background:#9ddb16;color:#071006;padding:14px 20px;text-decoration:none;border-radius:9px;font-weight:bold"
            >
              Aceitar convite
            </a>
          </p>

          <p>
            Este link é válido por 24 horas.
          </p>

          <p style="color:#657278;font-size:13px">
            Se você não reconhece este convite,
            ignore esta mensagem.
          </p>
        </div>
      `,
    });

  return result.ok;
}

export async function inviteClubUser(
  formData: FormData
) {
  const manager =
    await requireAccessManager();

  const organizationId =
    manager.organizationId;

  const name =
    clean(formData.get("name"));

  const email =
    clean(formData.get("email"))
      .toLowerCase();

  const rawRole =
    clean(formData.get("clubRole"));

  if (
    !name ||
    !email ||
    !validClubRole(rawRole)
  ) {
    redirect(
      "/acessos?erro=dados"
    );
  }

  const existing =
    await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        organizationId: true,
        active: true,
        accountStatus: true,
      },
    });

  if (existing) {
    redirect(
      "/acessos?erro=email"
    );
  }

  const organization =
    await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        name: true,
        publicName: true,
      },
    });

  if (!organization) {
    redirect(
      "/acessos?erro=organizacao"
    );
  }

  const temporaryPassword =
    crypto
      .randomBytes(32)
      .toString("hex");

  const passwordHash =
    await hash(
      temporaryPassword,
      12
    );

  const newUser =
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,

        // Mantemos o papel estrutural interno
        // do Club.
        role: "COORDINATOR",

        clubRole: rawRole as any,

        organizationId,

        active: false,

        accountStatus:
          "PENDING_INVITE",
      },
    });

  const sent =
    await sendInvite({
      userId: newUser.id,
      email,
      name,
      organizationName:
        organization.publicName ||
        organization.name,
      clubRole: rawRole,
    });

  redirect(
    `/acessos?status=${
      sent
        ? "convite-enviado"
        : "erro-email"
    }`
  );
}

export async function resendClubInvite(
  formData: FormData
) {
  const manager =
    await requireAccessManager();

  const userId =
    clean(formData.get("userId"));

  const target =
    await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId:
          manager.organizationId,
        active: false,
        accountStatus:
          "PENDING_INVITE",
      },
      include: {
        organization: {
          select: {
            name: true,
            publicName: true,
          },
        },
      },
    });

  if (!target) {
    redirect(
      "/acessos?erro=usuario"
    );
  }

  const clubRole =
    (target.clubRole ||
      "COORDINATOR") as ClubRole;

  const sent =
    await sendInvite({
      userId: target.id,
      email: target.email,
      name: target.name,
      organizationName:
        target.organization
          ?.publicName ||
        target.organization
          ?.name ||
        "11UP Club",
      clubRole,
    });

  redirect(
    `/acessos?status=${
      sent
        ? "convite-reenviado"
        : "erro-email"
    }`
  );
}

export async function updateClubUserRole(
  formData: FormData
) {
  const manager =
    await requireAccessManager();

  const userId =
    clean(formData.get("userId"));

  const rawRole =
    clean(formData.get("clubRole"));

  if (
    !userId ||
    !validClubRole(rawRole)
  ) {
    redirect(
      "/acessos?erro=dados"
    );
  }

  if (userId === manager.id) {
    redirect(
      "/acessos?erro=proprio-acesso"
    );
  }

  const target =
    await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId:
          manager.organizationId,
        role: "COORDINATOR",
      },
      select: {
        id: true,
      },
    });

  if (!target) {
    redirect(
      "/acessos?erro=usuario"
    );
  }

  await prisma.user.update({
    where: {
      id: target.id,
    },
    data: {
      clubRole: rawRole as any,
    },
  });

  revalidatePath("/acessos");

  redirect(
    "/acessos?status=perfil-atualizado"
  );
}

export async function toggleClubUserAccess(
  formData: FormData
) {
  const manager =
    await requireAccessManager();

  const userId =
    clean(formData.get("userId"));

  if (!userId) {
    redirect(
      "/acessos?erro=usuario"
    );
  }

  if (userId === manager.id) {
    redirect(
      "/acessos?erro=proprio-acesso"
    );
  }

  const target =
    await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId:
          manager.organizationId,
        role: "COORDINATOR",
      },
      select: {
        id: true,
        active: true,
        accountStatus: true,
      },
    });

  if (!target) {
    redirect(
      "/acessos?erro=usuario"
    );
  }

  // Convite ainda não aceito:
  // não usamos este botão para ativar.
  if (
    target.accountStatus ===
    "PENDING_INVITE"
  ) {
    redirect(
      "/acessos?erro=convite-pendente"
    );
  }

  const nextActive =
    !target.active;

  await prisma.user.update({
    where: {
      id: target.id,
    },
    data: {
      active: nextActive,
      accountStatus:
        nextActive
          ? "ACTIVE"
          : "INACTIVE",
    },
  });

  if (!nextActive) {
    await prisma.session.deleteMany({
      where: {
        userId: target.id,
      },
    });
  }

  revalidatePath("/acessos");

  redirect(
    `/acessos?status=${
      nextActive
        ? "reativado"
        : "desativado"
    }`
  );
}