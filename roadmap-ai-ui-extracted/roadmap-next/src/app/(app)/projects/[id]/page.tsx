import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProjectOverviewClient from "./ProjectOverviewClient";
export default async function Page({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  return <ProjectOverviewClient projectId={params.id} />;
}
