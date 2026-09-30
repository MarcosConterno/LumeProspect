import { CrmWorkspace } from "@/features/crm/components/crm-workspace";
import { loadCrm } from "@/features/crm/data/repository";
import { unstable_rethrow } from "next/navigation";
import type { CrmSnapshot } from "@/features/crm/types";

export default async function CrmPage() {
  let initial: CrmSnapshot | null = null;
  let message = "Não foi possível carregar o CRM.";

  try {
    initial = await loadCrm();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof Error) message = error.message;
  }

  if (!initial) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-surface p-6">
        <h1 className="font-display text-2xl">CRM indisponível</h1>
        <p role="alert" className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p>
      </section>
    );
  }

  return <CrmWorkspace key={initial.workspaceId} initial={initial} />;
}
