import { prisma } from "@/lib/prisma";

/**
 * Retira a concessão Simples cujo prazo acabou, sem excluir a conta ou
 * os vínculos do atleta. Não substitui processamento de cobranças Asaas.
 */
export async function reconcileExpiredSimplePlayerCourtesies(filter?: {
  guardianId?: string;
  slug?: string;
}) {
  return prisma.playerProfile.updateMany({
    where: {
      ...(filter?.guardianId ? { guardianId: filter.guardianId } : {}),
      ...(filter?.slug ? { slug: filter.slug } : {}),
      isComplimentary: true,
      plan: "FREE",
      asaasSubscriptionId: null,
      complimentaryPlan: "SIMPLE",
      complimentaryUntil: { lt: new Date() },
    },
    data: {
      isComplimentary: false,
      complimentaryPlan: null,
      complimentaryUntil: null,
      complimentaryReason: null,
      plan: "FREE",
      planStatus: "AWAITING_PAYMENT",
      isPublic: false,
      directoryVisible: false,
      isFeatured: false,
      featuredUntil: null,
    },
  });
}
