// Texto con **negritas** y [enlaces](url) -> nodos DOM (sin innerHTML).
// Enlaces a lecciones del sitio se abren dentro de la app; los demás, en otra pestaña.
import { h } from "./dom.js";
import { t } from "./i18n.js";

const LINK = /\[([^\]]+)\]\((\S+?)\)/g;
const LESSON = /^https:\/\/dollarscholars\.org(?:\/es-mx)?\/resources\/lessons\/([^/#]+)\/?(?:#.*)?$/;

const bold = (s) => s.split("**").map((part, i) => (i % 2 && part ? h("strong", { textContent: part }) : part)).filter((x) => x !== "");

export function inline(text) {
  const out = [];
  let last = 0, m;
  LINK.lastIndex = 0;
  while ((m = LINK.exec(text))) {
    out.push(...bold(text.slice(last, m.index)));
    const label = bold(m[1]);
    const lesson = LESSON.exec(m[2]);
    if (lesson && !m[2].includes("#quiz")) {
      out.push(h("a", { href: "#", onclick: (e) => { e.preventDefault(); document.dispatchEvent(new CustomEvent("ds:lesson", { detail: lesson[1] })); } }, ...label));
    } else {
      out.push(h("a", { href: m[2], target: "_blank", rel: "noopener noreferrer" }, ...label, h("span", { className: "sr-only", textContent: ` ${t("external")}` })));
    }
    last = m.index + m[0].length;
  }
  out.push(...bold(text.slice(last)));
  return out;
}
