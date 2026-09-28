import type { ReactNode } from "react";
import { AccountMenu } from "./account-menu";

export function WorkspaceHeader({ name, email, context, actions }: { name: string; email: string; context: string; actions?: ReactNode }) {
  return <header className="workspace-bar">
    <div className="workspace-actions">{actions}<AccountMenu identity={{ name, email }} context={context} /></div>
  </header>;
}
