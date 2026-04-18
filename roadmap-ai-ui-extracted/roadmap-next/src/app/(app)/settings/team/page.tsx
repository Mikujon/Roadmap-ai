import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeamPage } from "../../workspace-pages";
export default async function Page() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  return <TeamPage />;
}
