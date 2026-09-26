import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export default async function NotificationBell({
  organizationId,
}: {
  organizationId: string;
}) {
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 86400000);

  const [pendingCallUps, overdueCharges, upcomingMatches] =
    await Promise.all([
      prisma.callUp.count({
        where: {
          organizationId,
          status: "PENDING",
        },
      }),

      prisma.charge.count({
        where: {
          organizationId,
          status: "PENDING",
          dueDate: {
            lt: now,
          },
        },
      }),

      prisma.match.count({
        where: {
          organizationId,
          status: "SCHEDULED",
          startsAt: {
            gte: now,
            lte: inSevenDays,
          },
        },
      }),
    ]);

  const total =
    pendingCallUps +
    overdueCharges +
    upcomingMatches;

  return (
    <Link
      href="/notificacoes"
      className="notification-bell"
      aria-label={
        total > 0
          ? `Notificações: ${total}`
          : "Notificações"
      }
      title={
        total > 0
          ? `${total} notificação${total === 1 ? "" : "ões"}`
          : "Notificações"
      }
    >
      <Image
        src="/brand/11up/icons/notifications.svg"
        alt=""
        width={22}
        height={22}
        aria-hidden="true"
      />
    </Link>
  );
}