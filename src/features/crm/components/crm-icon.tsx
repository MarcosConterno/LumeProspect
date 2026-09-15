type CrmIconProps = { name: "chart" | "pie" | "users" | "alert" | "calendar" | "person" | "phone" | "mail" | "close" | "more" | "building" | "check" };

export function CrmIcon({ name }: CrmIconProps) {
  const common = { className: "size-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "chart") return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20V8" /></svg>;
  if (name === "pie") return <svg {...common}><path d="M12 3v9h9" /><path d="M20.5 15A9 9 0 1 1 9 3.5" /></svg>;
  if (name === "users") return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5c2.2.4 3.5 2 3.5 4M18 14c1.8.6 3 2.3 3 4" /></svg>;
  if (name === "alert") return <svg {...common}><path d="m12 3 9 17H3L12 3Z" /><path d="M12 9v4M12 17h.01" /></svg>;
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>;
  if (name === "person") return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M5 21c.4-3.5 3-6 7-6s6.6 2.5 7 6" /></svg>;
  if (name === "phone") return <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L7.9 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 2.1 2.3Z" /></svg>;
  if (name === "mail") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
  if (name === "close") return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  if (name === "more") return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></svg>;
  if (name === "building") return <svg {...common}><path d="M4 21V5l8-3v19M12 8h8v13M8 7h.01M8 11h.01M8 15h.01M16 12h.01M16 16h.01" /></svg>;
  return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
}
