import { useEffect } from "react";

/** Sets document.title to "<title> — Constance Obra" while the component is mounted. */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — Constance Obra` : "Constance Obra";
    return () => { document.title = prev; };
  }, [title]);
}
