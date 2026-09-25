"use client";

import { useActionState, useState } from "react";
import { savePlatformUser } from "../user-actions";
import { assignableRoles, roleLabels } from "../roles";

const input = "mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export function PlatformUserForm({ workspace, canCreate, scope = "company", operatorRole = "admin" }: { workspace: string; canCreate: boolean; scope?: "company" | "master"; operatorRole?: string }) {
  const [mode, setMode] = useState<"create" | "assign">("create");

  return <div className="space-y-4">
    {!canCreate && <p role="status" className="rounded-lg bg-[var(--accent-soft)] p-3 text-sm">A criação de contas precisa ser habilitada pela Lume na configuração do servidor. Por enquanto, você pode vincular uma conta existente.</p>}
    <UserFields key={`${workspace}:${scope}:${operatorRole}:${mode}`} workspace={workspace} scope={scope} operatorRole={operatorRole} mode={mode} canCreate={canCreate} onModeChange={setMode} />
  </div>;
}

function UserFields({ workspace, scope, operatorRole, mode, canCreate, onModeChange }: {
  scope: "company" | "master"; operatorRole: string;
  workspace: string; mode: "create" | "assign"; canCreate: boolean;
  onModeChange: (mode: "create" | "assign") => void;
}) {
  const [state, action, pending] = useActionState(savePlatformUser.bind(null, workspace, scope), {});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const creating = mode === "create";

  return <form action={action} className="space-y-4">
    <fieldset disabled={pending} className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Como adicionar a pessoa">
        <button type="button" aria-pressed={creating} onClick={() => onModeChange("create")} className={"rounded-lg border px-4 py-2 text-sm "+(creating ? "border-accent bg-[var(--accent-soft)] font-semibold text-accent-dark" : "border-border")}>Novo usuário</button>
        <button type="button" aria-pressed={!creating} onClick={() => onModeChange("assign")} className={"rounded-lg border px-4 py-2 text-sm "+(!creating ? "border-accent bg-[var(--accent-soft)] font-semibold text-accent-dark" : "border-border")}>Já possui conta</button>
      </div>
      <input type="hidden" name="mode" value={mode} />
      {creating && <label className="block text-sm">Nome da pessoa
        <input className={input} name="name" required minLength={2} maxLength={120} autoComplete="off" value={name} onChange={event => setName(event.target.value)} />
      </label>}
      <label className="block text-sm">E-mail de acesso
        <input className={input} name="email" type="email" required maxLength={254} autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} />
      </label>
      {scope === "master" ? <p className="rounded-lg bg-[var(--accent-soft)] p-3 text-sm">Master Lume: administra todas as empresas, usuários e módulos.</p> : <><label className="block text-sm">Perfil na empresa
        <select className={input} name="role" value={role} onChange={event => setRole(event.target.value)}>
          {assignableRoles(operatorRole).map(value => <option key={value} value={value}>{roleLabels[value]}</option>)}
        </select>
      </label>
      <p className="text-xs text-[var(--ink-soft)]">Administradores gerenciam a equipe e têm acesso completo aos módulos liberados. Gerentes gerenciam usuários comuns. Ajuste as permissões abaixo, na lista de usuários.</p></>}
      {creating ? <>
        <label className="block text-sm">Senha inicial
          <input className={input} name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
        </label>
        <label className="block text-sm">Confirme a senha inicial
          <input className={input} name="confirmPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
        </label>
        <p className="text-xs text-[var(--ink-soft)]">A pessoa poderá entrar com o e-mail e a senha definidos aqui, sem confirmação por e-mail. Nenhum e-mail será enviado.</p>
      </> : <p className="text-xs text-[var(--ink-soft)]">{scope === "master" ? "A conta precisa ter e-mail confirmado e estar sem empresa ou vinculada à Lume. Será concedido acesso master, mantendo a senha atual." : "A conta precisa ter e-mail confirmado e não pertencer a outra empresa. A senha atual será mantida. Se já houver vínculo, o perfil e as permissões existentes serão preservados."}</p>}
      <button disabled={creating && !canCreate} className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" type="submit">
        {pending ? "Salvando..." : scope === "master" ? (creating ? "Criar master" : "Conceder acesso master") : creating ? "Criar usuário" : "Vincular conta à empresa"}
      </button>
    </fieldset>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state.message && <p role="status" className="text-sm text-accent-dark">{state.message}</p>}
  </form>;
}
