import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsMainClient from "./SettingsMainClient";

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  return <SettingsMainClient />;
}
