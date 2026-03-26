// src/app/(app)/projects/page.tsx

import Link from "next/link";

export default function ProjectsPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Projects</h1>

      {/* temporary link */}
      <Link href="/projects/test-id">
        Open test project
      </Link>
    </div>
  );
}