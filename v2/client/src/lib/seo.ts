import { useEffect } from "react";

const ORIGIN = "https://www.cmaiplusafrica.com";

function setMeta(selector: string, attr: string, value: string, create: () => HTMLElement) {
  let element = document.head.querySelector<HTMLElement>(selector);
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  element.setAttribute(attr, value);
}

/** Met à jour le titre, la description et l'URL canonique de la page courante (utile aux moteurs de recherche et aux partages). */
export function useSeo(options: { title: string; description?: string; path?: string; noindex?: boolean }) {
  const { title, description, path, noindex } = options;
  useEffect(() => {
    document.title = title.includes("CMAI") ? title : `${title} — CMAI+Africa`;
    if (description) {
      setMeta('meta[name="description"]', "content", description, () => Object.assign(document.createElement("meta"), { name: "description" }));
      setMeta('meta[property="og:description"]', "content", description, () => { const m = document.createElement("meta"); m.setAttribute("property", "og:description"); return m; });
    }
    if (path) {
      setMeta('link[rel="canonical"]', "href", `${ORIGIN}${path}`, () => Object.assign(document.createElement("link"), { rel: "canonical" }));
      setMeta('meta[property="og:url"]', "content", `${ORIGIN}${path}`, () => { const m = document.createElement("meta"); m.setAttribute("property", "og:url"); return m; });
    }
    setMeta('meta[name="robots"]', "content", noindex ? "noindex, nofollow" : "index, follow", () => Object.assign(document.createElement("meta"), { name: "robots" }));
  }, [title, description, path, noindex]);
}
