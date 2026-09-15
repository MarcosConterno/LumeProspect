"use client";

import { useActionState, useState } from "react";
import { savePlatformUser } from "../user-actions";

const input = "mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export function PlatformUserForm({ workspace, canCreate }: { workspace: string; canCreate: boolean }) {
  const [mode, setMode] = useState<"create" | "assign">(canCreate ? "create" : "assign");

  return <div className="space-y-4">
    {!canCreate && <p className="text-sm text-[var(--ink-soft)]">A criação direta de contas ainda não está disponível. Você pode vincular uma conta existente ou usar a seção Administrador do ambiente para gerar um convite.</p>}
    <UserFields key={mode} workspace={workspace} mode={mode} canCreate={canCreate} onModeChange={setMode} />
  </div>;
}

function UserFields({ workspace, mode, canCreate, onModeChange }: {
  workspace: string; mode: "create" | "assign"; canCreate: boolean;
  onModeChange: (mode: "create" | "assign") => void;
}) {
  const [state, action, pending] = useActionState(savePlatformUser.bind(null, workspace), {});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const creating = mode === "create";

  return <form action={action} className="space-y-4">
    <fieldset disabled={pending} className="space-y-4">
      <label className="block text-sm">Como adicionar a pessoa
        <select className={input} value={mode} onChange={event => onModeChange(event.target.value as "create" | "assign")}>
          <option value="create" disabled={!canCreate}>Criar usuário</option>
          <option value="assign">Vincular conta existente</option>
        </select>
      </label>
      <input type="hidden" name="mode" value={mode} />
      {creating && <label className="block text-sm">Nome da pessoa
        <input className={input} name="name" required minLength={2} maxLength={120} autoComplete="off" value={name} onChange={event => setName(event.target.value)} />
      </label>}
      <label className="block text-sm">E-mail de acesso
        <input className={input} name="email" type="email" required maxLength={254} autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} />
      </label>
      <label className="block text-sm">Perfil na empresa
        <select className={input} name="role" value={role} onChange={event => setRole(event.target.value)}>
          <option value="member">Usuário</option><option value="admin">Administrador</option>
        </select>
      </label>
      <p className="text-xs text-[var(--ink-soft)]">Administradores gerenciam a equipe e têm acesso completo aos módulos liberados. Ajuste as permissões dos usuários em Equipe.</p>
      {creating ? <>
        <label className="block text-sm">Senha inicial
          <input className={input} name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
        </label>
        <label className="block text-sm">Confirme a senha inicial
          <input className={input} name="confirmPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
        </label>
        <p className="text-xs text-[var(--ink-soft)]">A pessoa poderá entrar com o e-mail e a senha definidos aqui, sem confirmação por e-mail. Nenhum e-mail será enviado.</p>
      </> : <p className="text-xs text-[var(--ink-soft)]">A conta precisa ter e-mail confirmado e não pertencer a outra empresa. A senha atual será mantida. Se já houver vínculo, o perfil e as permissões existentes serão preservados.</p>}
      <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50" type="submit">
        {pending ? "Salvando..." : creating ? "Criar usuário e vincular" : "Vincular conta"}
      </button>
    </fieldset>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state.message && <p role="status" className="text-sm text-accent-dark">{state.message}</p>}
  </form>;
}
