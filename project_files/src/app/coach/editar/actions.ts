"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const c = (v: FormDataEntryValue | null) => String(v || "").trim();

export async function saveCoach(formData: FormData) {
  const user = await requireUser();
  const profile = await prisma.coachProfile.findUnique({ where: { ownerUserId: user.id } });
  if (!profile) redirect("/cadastro-coach");

  await prisma.coachProfile.update({
    where: { id: profile.id },
    data: {
      photoUrl: c(formData.get("photoUrl")) || null,
      coverUrl: c(formData.get("coverUrl")) || null,
      professionalName: c(formData.get("professionalName")) || null,
      roleTitle: c(formData.get("roleTitle")) || null,
      currentClub: c(formData.get("currentClub")) || null,
      categories: c(formData.get("categories")) || null,
      city: c(formData.get("city")) || null,
      state: c(formData.get("state")) || null,
      country: c(formData.get("country")) || null,
      nationality: c(formData.get("nationality")) || null,
      bio: c(formData.get("bio")) || null,
      experience: c(formData.get("experience")) || null,
      clubsHistory: c(formData.get("clubsHistory")) || null,
      licenses: c(formData.get("licenses")) || null,
      education: c(formData.get("education")) || null,
      languages: c(formData.get("languages")) || null,
      achievements: c(formData.get("achievements")) || null,
      methodology: c(formData.get("methodology")) || null,
      youtubeUrl: c(formData.get("youtubeUrl")) || null,
      instagramUrl: c(formData.get("instagramUrl")) || null,
      linkedinUrl: c(formData.get("linkedinUrl")) || null,
      contactEmail: c(formData.get("contactEmail")) || null,
      isPublic: formData.get("isPublic") === "on",
      directoryVisible: formData.get("directoryVisible") === "on",
    },
  });

  redirect("/coach/editar?salvo=1");
}
