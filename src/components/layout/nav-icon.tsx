import type { ReactNode } from "react";

type NavIconProps = { name: string };

type IconNodeProps = { children: ReactNode };

function IconNode({ children }: IconNodeProps) {
  return <svg aria-hidden="true" className="size-[17px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

export function NavIcon({ name }: NavIconProps) {
  switch (name) {
    case "dashboard": return <IconNode><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></IconNode>;
    case "search": return <IconNode><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></IconNode>;
    case "prospects": return <IconNode><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.3c1.4.5 2.4 1.9 2.4 3.4 0 1.6-1 2.9-2.4 3.4M19 14.3c1.8.6 3 2.4 3 4.4" /></IconNode>;
    case "crm": return <IconNode><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v10" /></IconNode>;
    case "financeiro": return <IconNode><path d="M3 20V10M9 20V4M15 20v-7M21 20V13" /></IconNode>;
    case "servicos": return <IconNode><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18" /></IconNode>;
    case "agenda": return <IconNode><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></IconNode>;
    case "favoritos": return <IconNode><path d="m12 3 2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3L3 9.5l6.4-.6L12 3z" /></IconNode>;
    case "configuracoes": return <IconNode><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3.1 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></IconNode>;
    default: return <IconNode><circle cx="12" cy="12" r="8" /></IconNode>;
  }
}
