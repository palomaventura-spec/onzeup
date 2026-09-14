import MobileCoachNavigation from "@/components/MobileCoachNavigation";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <MobileCoachNavigation />
    </>
  );
}