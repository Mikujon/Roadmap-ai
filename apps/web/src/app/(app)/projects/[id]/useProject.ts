"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Status = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
type SprintStatus = "UPCOMING" | "ACTIVE" | "DONE";

interface Feature {
  id: string; title: string; module?: string; status: Status;
  priority: string; notes?: string; dependsOn: { id: string; dependsOnId: string }[];
  estimatedHours: number; actualHours: number;
}
interface Sprint {
  id: string; num: string; name: string; goal?: string;
  status: SprintStatus; startDate?: string; endDate?: string; features: Feature[];
}
interface Project {
  id: string; name: string; description?: string; startDate: string; endDate: string;
  budgetTotal: number; costActual: number; revenueExpected: number; status: string;
  phases: any[]; sprints: Sprint[]; shareToken?: string; shareEnabled: boolean;
  dependsOn: any[]; risks: any[]; assignments: any[]; departments: any[]; requestedBy?: any;
}

export function useProject(initial: Project) {
  const [project, setProject] = useState<Project>({
    ...initial,
    dependsOn:   initial.dependsOn   ?? [],
    risks:       initial.risks       ?? [],
    assignments: initial.assignments ?? [],
    departments: initial.departments ?? [],
  });
  const [saving,        setSaving]        = useState(false);
  const [projectStatus, setProjectStatus] = useState(initial.status ?? "ACTIVE");
  const [shareUrl,      setShareUrl]      = useState(
    initial.shareEnabled && initial.shareToken ? `/share/${initial.shareToken}` : ""
  );
  const [copied,        setCopied]        = useState(false);
  const [noteDrawer,    setNoteDrawer]    = useState<Feature | null>(null);
  const [noteText,      setNoteText]      = useState("");
  const [statusChangeModal, setStatusChangeModal] = useState<{ newStatus: string; note: string } | null>(null);
  const router = useRouter();

  const updateFeature = useCallback(async (featureId: string, patch: Partial<Feature>) => {
    setSaving(true);
    setProject(p => ({
      ...p,
      sprints: p.sprints.map(s => ({
        ...s,
        features: s.features.map(f => f.id === featureId ? { ...f, ...patch } : f),
      })),
    }));
    await fetch(`/api/features/${featureId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(patch),
    });
    setTimeout(() => setSaving(false), 600);
    router.refresh();
  }, []);

  const updateSprint = useCallback(async (sprintId: string, patch: { status: SprintStatus }) => {
    setSaving(true);
    setProject(p => ({
      ...p,
      sprints: p.sprints.map(s => s.id === sprintId ? { ...s, ...patch } : s),
    }));
    await fetch(`/api/sprints/${sprintId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(patch),
    });
    setTimeout(() => setSaving(false), 600);
    router.refresh();
  }, []);

  const confirmStatusChange = async () => {
    if (!statusChangeModal) return;
    const { newStatus, note } = statusChangeModal;
    await fetch(`/api/projects/${project.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus, statusNote: note }),
    });
    setProjectStatus(newStatus);
    setStatusChangeModal(null);
    if (newStatus === "CLOSED" || newStatus === "ARCHIVED") {
      const from = new URLSearchParams(window.location.search).get("from") ?? "/portfolio";
      window.location.href = from;
    }
  };

  const toggleShare = useCallback(async () => {
    if (shareUrl) {
      await fetch(`/api/projects/${project.id}/share`, { method: "DELETE" });
      setShareUrl("");
    } else {
      const res  = await fetch(`/api/projects/${project.id}/share`, { method: "POST" });
      const data = await res.json();
      setShareUrl(data.url);
    }
  }, [project.id, shareUrl]);

  const openNote = (f: Feature) => { setNoteDrawer(f); setNoteText(f.notes ?? ""); };
  const saveNote = async () => {
    if (!noteDrawer) return;
    await updateFeature(noteDrawer.id, { notes: noteText });
    setNoteDrawer(null);
  };

  const addProjectDep = async (dependsOnId: string, allProjects: any[]) => {
    await fetch("/api/dependencies/projects", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ projectId: project.id, dependsOnId }),
    });
    setProject(p => ({
      ...p,
      dependsOn: [...p.dependsOn, {
        id: Date.now().toString(), dependsOnId,
        dependsOn: { id: dependsOnId, name: allProjects.find(pr => pr.id === dependsOnId)?.name ?? "" },
      }],
    }));
  };

  const removeProjectDep = async (dependsOnId: string) => {
    await fetch("/api/dependencies/projects", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ projectId: project.id, dependsOnId }),
    });
    setProject(p => ({ ...p, dependsOn: p.dependsOn.filter(d => d.dependsOnId !== dependsOnId) }));
  };

  const addFeatureDep = async (featureId: string, dependsOnId: string) => {
    await fetch("/api/dependencies/features", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ featureId, dependsOnId }),
    });
    setProject(p => ({
      ...p,
      sprints: p.sprints.map(s => ({
        ...s,
        features: s.features.map(f =>
          f.id === featureId
            ? { ...f, dependsOn: [...(f.dependsOn ?? []), { id: Date.now().toString(), dependsOnId }] }
            : f
        ),
      })),
    }));
  };

  const removeFeatureDep = async (featureId: string, dependsOnId: string) => {
    await fetch("/api/dependencies/features", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ featureId, dependsOnId }),
    });
    setProject(p => ({
      ...p,
      sprints: p.sprints.map(s => ({
        ...s,
        features: s.features.map(f =>
          f.id === featureId
            ? { ...f, dependsOn: (f.dependsOn ?? []).filter(d => d.dependsOnId !== dependsOnId) }
            : f
        ),
      })),
    }));
  };

  // Computed values
  const allF = project.sprints.flatMap(s =>
    s.features.map(f => ({
      ...f,
      sprintId:   s.id,
      sprintNum:  s.num,
      sprintName: s.name,
      sprintEnd:  s.endDate ?? null,
    }))
  );
  const totalDone = allF.filter(f => f.status === "DONE").length;
  const totalPct  = allF.length ? Math.round((totalDone / allF.length) * 100) : 0;
  const daysLeft  = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000);

  return {
    project, setProject,
    saving,
    projectStatus, setProjectStatus,
    shareUrl, setShareUrl,
    copied, setCopied,
    noteDrawer, setNoteDrawer,
    noteText, setNoteText,
    statusChangeModal, setStatusChangeModal,
    updateFeature, updateSprint,
    confirmStatusChange,
    toggleShare,
    openNote, saveNote,
    addProjectDep, removeProjectDep,
    addFeatureDep, removeFeatureDep,
    allF, totalDone, totalPct, daysLeft,
  };
}