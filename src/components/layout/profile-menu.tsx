"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { signOut } from "@/features/auth/actions";
import { NavIcon } from "./nav-icon";

export function ProfileMenu({ name, email }: { name: string; email: string }) {
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !details.current?.contains(event.target)) details.current?.removeAttribute("open");
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && details.current?.open) {
        details.current.removeAttribute("open");
        summary.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function close() { details.current?.removeAttribute("open"); }

  return <details ref={details} className="profile-menu">
    <summary ref={summary} aria-label={"Meu perfil: " + name}>
      <span className="profile-trigger-name">{name}</span>
      <span className="profile-avatar" aria-hidden="true">{initials}</span>
      <span className="profile-chevron" aria-hidden="true">⌄</span>
    </summary>
    <div className="profile-popover">
      <div className="profile-identity">
        <span className="profile-avatar" aria-hidden="true">{initials}</span>
        <div><strong>{name}</strong><span>{email}</span></div>
      </div>
      <nav aria-label="Minha conta">
        <Link href="/perfil" onClick={close}><NavIcon name="prospects" /><span>Meu perfil</span><span className="profile-link-arrow" aria-hidden="true">›</span></Link>
        <Link href="/configuracoes/empresa" onClick={close}><NavIcon name="configuracoes" /><span>Configurações</span><span className="profile-link-arrow" aria-hidden="true">›</span></Link>
      </nav>
      <form action={signOut}>
        <button type="submit"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4" /></svg><span>Sair</span></button>
      </form>
    </div>
  </details>;
}
