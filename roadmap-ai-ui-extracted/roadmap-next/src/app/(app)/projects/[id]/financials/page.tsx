import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProjectFinancialsClient from "./FinancialsClient";
export default async function Page({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  return <ProjectFinancialsClient projectId={params.id} />;
}
