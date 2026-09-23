import { redirect } from "next/navigation";

import OrganizerAppShell from "@/components/OrganizerAppShell";
import { getCurrentUser } from "@/lib/auth";

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <OrganizerAppShell>{children}</OrganizerAppShell>;
}