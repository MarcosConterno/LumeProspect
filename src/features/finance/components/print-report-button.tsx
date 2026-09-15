"use client";

export function PrintReportButton() {
  return <button type="button" onClick={async()=>{await document.fonts.ready;window.print();}}>Imprimir / Salvar PDF</button>;
}
