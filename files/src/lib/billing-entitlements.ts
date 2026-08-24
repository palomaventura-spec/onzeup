import { prisma } from "@/lib/prisma";

export const PAYMENT_GRACE_DAYS = 10;

export function addGraceDays(date: Date, days = PAYMENT_GRACE_DAYS) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isPastGrace(periodEnd: Date | null | undefined, now = new Date()) {
  if (!periodEnd) return false;
  return now > addGraceDays(periodEnd);
}

export function hasValidComplimentaryAccess(input: {
  isComplimentary?: boolean | null;
  complimentaryUntil?: Date | null;
}, now = new Date()) {
  if (!input.isComplimentary) return false;
  return !input.complimentaryUntil || input.complimentaryUntil >= now;
}

export function hasEffectivePlayerPremium(input: {
  plan?: string | null;
  planStatus?: string | null;
  premiumUntil?: Date | null;
  isComplimentary?: boolean | null;
  complimentaryUntil?: Date | null;
}, now = new Date()) {
  if (hasValidComplimentaryAccess(input, now)) return true;
  if (String(input.planStatus || "").toUpperCase() === "CANCELLED") return false;
  if (String(input.plan || "").toUpperCase() !== "PREMIUM") return false;
  if (!input.premiumUntil) return String(input.planStatus || "ACTIVE").toUpperCase() === "ACTIVE";
  return !isPastGrace(input.premiumUntil, now);
}

export async function reconcileExpiredPlayerPremiums(filter?: { guardianId?: string; slug?: string }) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PAYMENT_GRACE_DAYS);

  await prisma.playerProfile.updateMany({
    where: {
      ...(filter?.guardianId ? { guardianId: filter.guardianId } : {}),
      ...(filter?.slug ? { slug: filter.slug } : {}),
      plan: "PREMIUM",
      premiumUntil: { lt: cutoff },
      OR: [
        { isComplimentary: false },
        { isComplimentary: true, complimentaryUntil: { lt: new Date() } },
      ],
    },
    data: {
      plan: "FREE",
      planStatus: "PAST_DUE",
      template: "FREE_CLEAN",
    },
  });
}
