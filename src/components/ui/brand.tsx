import Image from "next/image";
import Link from "next/link";

export function Brand({ href = "/dashboard", compact = false, large = false }: { href?: string; compact?: boolean; large?: boolean }) {
  return <Link href={href} aria-label="Lume Prospect — início" className={`brand-logo ${compact ? "brand-logo--compact" : ""} ${large ? "brand-logo--large" : ""}`}>
    <Image src="/lume-logo.png" alt="Lume Prospect" width={850} height={201} className="brand-image" priority />
  </Link>;
}

