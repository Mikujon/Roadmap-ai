import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CreateOrganization } from "@clerk/nextjs";

export default async function SetupPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (orgId)  redirect("/onboarding");

  return (
    <div style={{
      minHeight:      "100vh",
      background:     "#F8F7F3",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      fontFamily:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background:   "#FFFFFF",
        border:       "1px solid #E5E2D9",
        borderRadius: 16,
        padding:      "48px 40px",
        maxWidth:     520,
        width:        "100%",
        textAlign:    "center",
      }}>
        <div style={{
          width:          52,
          height:         52,
          background:     "linear-gradient(135deg, #006D6B, #0891B2)",
          borderRadius:   16,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontWeight:     800,
          fontSize:       18,
          color:          "#fff",
          margin:         "0 auto 20px",
          boxShadow:      "0 4px 16px rgba(0,109,107,0.3)",
        }}>
          RM
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#18170F", marginBottom: 8, letterSpacing: "-0.4px" }}>
          Create your organisation
        </h1>
        <p style={{ fontSize: 14, color: "#5C5A52", marginBottom: 32, lineHeight: 1.6 }}>
          Set up your workspace to start managing projects with your team.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CreateOrganization afterCreateOrganizationUrl="/onboarding" />
        </div>
      </div>
    </div>
  );
}
