import type { ReactNode } from "react";
import AdminShell from "./AdminShell";
import "./admin-shell.css";

export default function AdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
