// Dibuja el cuerpo de cada tipo de bloque. Tipos: text (por defecto), carlos, tipos, budget, summary.
import { h } from "./dom.js";
import { inline } from "./inline.js";
import { t } from "./i18n.js";
import { TYPES, chip, money, equation, renderBudget, renderSummary } from "./budget.js";

const paras = (list = []) => list.map((p) => h("p", { textContent: p }));
const table = (caption, heads, rows, foot) => {
  const tb = h("tbody", {}, ...rows.map((r) => h("tr", {}, ...r.map(([c, num]) => h("td", { className: num === "n" ? "num" : "" }, c)))));
  if (foot) tb.append(h("tr", { className: "total" }, ...foot.map(([c, num]) => h("td", { className: num === "n" ? "num" : "" }, c))));
  return h("div", { className: "tablebox" }, h("table", {}, h("caption", { textContent: caption }),
    h("thead", {}, h("tr", {}, ...heads.map(([c, num]) => h("th", { scope: "col", className: num === "n" ? "num" : "", textContent: c })))), tb));
};
const sumAmt = (rows, i) => rows.reduce((a, r) => a + r[i], 0);

const renderers = {
  carlos(card, b) {
    card.append(...paras(b.text));
    const ing = b.ingresos, gas = b.gastos;
    const inTotal = sumAmt(ing.rows, 1), gaTotal = sumAmt(gas.rows, 2);
    card.append(
      table(ing.caption, [[b.cols.item], [b.cols.amount, "n"]], ing.rows.map((r) => [[r[0]], [money(r[1]), "n"]]), [[b.cols.baseIncome], [money(inTotal), "n"]]),
      table(gas.caption, [[b.cols.type], [b.cols.what], [b.cols.amount, "n"]], gas.rows.map((r) => [[chip(r[0])], [r[1]], [money(r[2]), "n"]]), [[t("b.total")], [""], [money(gaTotal), "n"]]),
      h("p", { className: "equation", textContent: equation(inTotal, gaTotal) }),
      ...paras(b.after));
  },
  tipos(card, b) {
    card.append(...paras(b.text), h("div", { className: "tablebox" }, h("table", {}, h("tbody", {},
      ...TYPES.map((k) => h("tr", {}, h("td", {}, chip(k)), h("td", { textContent: b.types[k] })))))));
  },
  budget(card, b, topic) {
    card.append(...paras(b.text), h("p", { className: "muted", textContent: t("b.privacy") }));
    const root = h("div", { className: "budget" });
    card.append(root);
    renderBudget(root, topic.template);
  },
  summary(card, b) {
    card.append(...paras(b.text));
    const root = h("div");
    card.append(root);
    renderSummary(root);
  },
};

// ---- Lecciones importadas del sitio (content/*/tema-NN.json, bloques type "lesson") ----
const node = {
  p: (v) => h("p", {}, ...inline(v)),
  formula: (v) => h("p", { className: "formula" }, ...inline(v)),
  h3: (v) => h("h3", {}, ...inline(v)),
  ul: (v) => h("ul", {}, ...v.map((x) => h("li", {}, ...inline(x)))),
  ol: (v) => h("ol", {}, ...v.map((x) => h("li", {}, ...inline(x)))),
  quote: (v) => h("blockquote", { className: "sample" }, ...inline(v)),
  dl: (v) => h("dl", {}, ...v.flatMap(([d, x]) => [h("dt", {}, ...inline(d)), h("dd", {}, ...inline(x))])),
  table: (v) => {
    const cell = (tag, c, i, scope) => h(tag, { className: v.num.includes(i) ? "num" : "", ...(scope ? { scope } : {}) }, ...inline(c));
    const wrap = h("div", { className: "tablebox", role: "region", tabIndex: 0 },
      h("table", {}, h("caption", { textContent: v.caption }),
        v.head.length ? h("thead", {}, h("tr", {}, ...v.head.map((c, i) => cell("th", c, i, "col")))) : null,
        h("tbody", {}, ...v.rows.map((r, ri) => h("tr", { className: v.total.includes(ri) ? "total" : "" }, ...r.map((c, i) => cell("td", c, i)))))));
    wrap.setAttribute("aria-label", v.caption);
    return wrap;
  },
  links: (v) => h("ul", { className: "links" }, ...v.map((l) => h("li", {}, ...inline(`[${l.t}](${l.u})`),
    l.org ? h("p", { className: "muted", textContent: l.org }) : null, l.d ? h("p", { textContent: l.d }) : null))),
  quiz: (v) => h("div", { className: "note" }, h("p", { textContent: t("quiz.text") }), ...inline(`[${t("quiz.btn")}](${v})`)),
};
renderers.lesson = (card, b) => {
  card.classList.add(`kind-${b.kind}`);
  if (b.label) card.insertBefore(h("p", { className: "callout-label", textContent: b.label }), card.querySelector("h2"));
  b.body.forEach((n) => { const k = Object.keys(n)[0]; if (node[k]) card.append(node[k](n[k])); });
};

export function renderBlockBody(card, b, topic) {
  if (renderers[b.type]) return renderers[b.type](card, b, topic);
  card.append(...paras(b.text));
  if (b.note) card.append(h("div", { className: "note" }, h("p", {}, h("strong", { textContent: b.note.title + " " }), b.note.text)));
}
