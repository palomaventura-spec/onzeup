import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const SUPPORT_COOKIE_NAME = "onzeup_support_session";

function supportCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    domain:
      process.env.NODE_ENV === "production"
        ? ".onzeup.com.br"
        : undefined,
  };
}

export async function setAdminSupportCookie(sessionId: string) {
  const store = await cookies();

  store.set(SUPPORT_COOKIE_NAME, sessionId, {
    ...supportCookieOptions(),
    maxAge: 60 * 60 * 4,
  });
}

export async function clearAdminSupportCookie() {
  const store = await cookies();
  store.delete(SUPPORT_COOKIE_NAME);
}

export async function getAdminSupportSession(adminUserId: string) {
  const store = await cookies();
  const sessionId = store.get(SUPPORT_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const session = await prisma.adminSupportSession.findFirst({
    where: {
      id: sessionId,
      adminUserId,
      endedAt: null,
    },
    include: {
      organization: true,
    },
  });

  if (!session) {
    return null;
  }

  return session;
}

export async function getAdminSupportOrganization(adminUserId: string) {
  const session = await getAdminSupportSession(adminUserId);

  if (!session) {
    return null;
  }

  return session.organization;
}
