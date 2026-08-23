import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function NotificationBell({ organizationId }: { organizationId: string }) {
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 86400000);

  const [pendingCallUps, overdueCharges, upcomingMatches] = await Promise.all([
    prisma.callUp.count({ where: { organizationId, status: "PENDING" } }),
    prisma.charge.count({ where: { organizationId, status: "PENDING", dueDate: { lt: now } } }),
    prisma.match.count({ where: { organizationId, status: "SCHEDULED", startsAt: { gte: now, lte: inSevenDays } } }),
  ]);

  const total = pendingCallUps + overdueCharges + upcomingMatches;

  return (
    <Link href="/notificacoes" className="notification-bell" aria-label={`Notificações: ${total}`}>
      <span aria-hidden="true">🔔</span>
      {total > 0 ? <b>{total > 99 ? "99+" : total}</b> : null}
    </Link>
  );
}
