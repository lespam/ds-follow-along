// Presupuesto editable del Tema 1: meses con ingresos y gastos. Todo queda en este dispositivo.
import * as store from "./storage.js";
import { h } from "./dom.js";
import { t, getLanguage } from "./i18n.js";

export const TYPES = ["need", "oblig", "save", "want", "extra"];
const MAX_MONTHS = 12;
const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const money = (n) => fmt.format(Math.round(n || 0));
const parseAmt = (s) => { const n = parseFloat(String(s).replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; };
const uid = () => Math.random().toString(36).slice(2, 9);
const sum = (a) => a.reduce((x, r) => x + (r.monto || 0), 0);
const filled = (m) => sum(m.ingresos) > 0 || sum(m.gastos) > 0;
export const chip = (k) => h("span", { className: `chip t-${k}`, textContent: t(`type.${k}`) });
export const equation = (income, planned) => t("b.equation", { income: money(income), planned: money(planned), left: money(income - planned) });
export const monthLabel = (id) => { const [y, m] = id.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString(getLanguage(), { month: "long", year: "numeric" }); };
const idOf = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
const prevId = (id) => { let [y, m] = id.split("-").map(Number); m--; if (!m) { m = 12; y--; } return idOf(y, m); };

let active = null;

function addMonth(B, template) {
  const now = new Date();
  const oldest = B.months[B.months.length - 1];
  const id = oldest ? prevId(oldest.id) : prevId(idOf(now.getFullYear(), now.getMonth() + 1));
  const src = B.months[0]; // copia los nombres del mes más reciente, con montos en 0
  const m = src
    ? { id, ingresos: src.ingresos.map((r) => ({ id: uid(), nombre: r.nombre, monto: 0 })), gastos: src.gastos.map((r) => ({ id: uid(), tipo: r.tipo, nombre: r.nombre, monto: 0 })) }
    : { id, ingresos: template.ingresos.map((n) => ({ id: uid(), nombre: n, monto: 0 })), gastos: template.gastos.map(([tipo, n]) => ({ id: uid(), tipo, nombre: n, monto: 0 })) };
  B.months.push(m);
  B.months.sort((a, b) => (a.id < b.id ? 1 : -1));
  active = id;
  store.saveBudget();
}

export function renderBudget(root, template, focus) {
  const B = store.getBudget();
  const redraw = (f) => renderBudget(root, template, f);
  root.replaceChildren();
  if (!B.months.length) {
    root.append(h("div", { className: "note" }, h("p", { textContent: t("b.empty") }),
      h("button", { type: "button", textContent: t("b.start"), onclick: () => { addMonth(B, template); redraw("month"); } })));
    return;
  }
  if (!B.months.some((m) => m.id === active)) active = B.months[0].id;
  const m = B.months.find((x) => x.id === active);

  const tabs = h("div", { className: "months", role: "group" });
  tabs.setAttribute("aria-label", t("b.months"));
  B.months.forEach((x) => {
    const b = h("button", { type: "button", className: "month" + (x.id === active ? " on" : ""), textContent: monthLabel(x.id), onclick: () => { active = x.id; redraw("month"); } });
    b.setAttribute("aria-pressed", String(x.id === active));
    tabs.append(b);
  });
  if (B.months.length < MAX_MONTHS) tabs.append(h("button", { type: "button", className: "ghost", textContent: t("b.addMonth"), onclick: () => { addMonth(B, template); redraw("month"); } }));
  root.append(tabs, h("h3", { id: "month-title", tabIndex: -1, textContent: monthLabel(m.id) }));

  const totals = {};
  const refresh = () => {
    totals.ingresos.textContent = money(sum(m.ingresos));
    totals.gastos.textContent = money(sum(m.gastos));
    totals.eq.textContent = equation(sum(m.ingresos), sum(m.gastos));
  };
  const section = (kind, title) => {
    const list = h("ul", { className: "rows" });
    m[kind].forEach((r) => {
      const name = h("input", { type: "text", value: r.nombre, placeholder: t("b.name"), autocomplete: "off" });
      name.setAttribute("aria-label", t("b.nameFor", { title }));
      const amt = h("input", { type: "text", inputMode: "decimal", value: r.monto ? String(r.monto) : "", placeholder: "$0", autocomplete: "off" });
      amt.setAttribute("aria-label", t("b.amountFor", { name: r.nombre || title }));
      const li = h("li", { className: "row" + (kind === "gastos" ? " wide" : "") });
      if (kind === "gastos") {
        const sel = h("select", {}, ...TYPES.map((k) => h("option", { value: k, selected: k === r.tipo, textContent: t(`type.${k}`) })));
        sel.setAttribute("aria-label", t("b.typeFor", { name: r.nombre || title }));
        sel.addEventListener("change", () => { r.tipo = sel.value; store.saveBudget(); refresh(); });
        li.append(sel);
      }
      name.addEventListener("input", () => { r.nombre = name.value; store.saveBudget(); });
      amt.addEventListener("input", () => { r.monto = parseAmt(amt.value); store.saveBudget(); refresh(); });
      const del = h("button", { type: "button", className: "ghost small", textContent: "✕", onclick: () => { m[kind] = m[kind].filter((x) => x.id !== r.id); store.saveBudget(); redraw(`add-${kind}`); } });
      del.setAttribute("aria-label", t("b.remove", { name: r.nombre || title }));
      li.append(name, amt, del);
      list.append(li);
    });
    const add = h("button", { type: "button", className: "ghost", id: `add-${kind}`, textContent: t("b.addRow"), onclick: () => {
      m[kind].push(kind === "gastos" ? { id: uid(), tipo: "need", nombre: "", monto: 0 } : { id: uid(), nombre: "", monto: 0 });
      store.saveBudget(); redraw(`last-${kind}`);
    } });
    totals[kind] = h("strong");
    return h("section", { className: "ledger", id: `sec-${kind}` }, h("h4", { textContent: title }), list, add,
      h("p", { className: "sum" }, `${t("b.total")}: `, totals[kind]));
  };
  totals.eq = h("p", { className: "equation", role: "status" });
  root.append(section("ingresos", t("b.income")), section("gastos", t("b.expenses")), totals.eq);

  const del = h("div", { className: "danger-zone" });
  const askDel = h("button", { type: "button", className: "ghost", textContent: t("b.removeMonth"), onclick: () => {
    del.replaceChildren(h("p", { textContent: t("b.removeConfirm", { month: monthLabel(m.id) }) }),
      h("button", { type: "button", textContent: t("b.yes"), onclick: () => { B.months = B.months.filter((x) => x.id !== m.id); store.saveBudget(); active = null; redraw("month"); } }),
      " ", h("button", { type: "button", className: "ghost", textContent: t("b.no"), onclick: () => redraw("rm") }));
    del.querySelector("button").focus();
  } });
  del.append(askDel);
  root.append(del);
  refresh();

  if (focus === "month") root.querySelector("#month-title")?.focus();
  else if (focus === "rm") askDel.focus();
  else if (focus?.startsWith("add-")) root.querySelector(`#${focus}`)?.focus();
  else if (focus?.startsWith("last-")) root.querySelector(`#sec-${focus.slice(5)} .row:last-child input[type=text]`)?.focus();
}

// Modelo compartido: promedio por tipo, ingreso base (mes con menos ingresos).
export function model() {
  const months = store.getBudget().months.filter(filled);
  if (!months.length) return { n: 0 };
  const base = months.reduce((a, m) => (sum(m.ingresos) < sum(a.ingresos) ? m : a));
  const avg = Object.fromEntries(TYPES.map((k) => [k, 0]));
  months.forEach((m) => m.gastos.forEach((g) => { avg[g.tipo] = (avg[g.tipo] || 0) + (g.monto || 0); }));
  TYPES.forEach((k) => { avg[k] /= months.length; });
  return { n: months.length, months, base, income: sum(base.ingresos), avg, planned: TYPES.reduce((a, k) => a + avg[k], 0) };
}

export function renderSummary(root) {
  const M = model();
  if (!M.n) { root.append(h("div", { className: "note" }, h("p", { textContent: t("b.noData") }))); return; }
  const left = M.income - M.planned;
  const stat = (k, v, cls = "") => h("div", { className: "stat" }, h("div", { className: "k", textContent: k }), h("div", { className: "v " + cls, textContent: v }));
  root.append(
    h("div", { className: "summary" },
      stat(t("b.monthsFilled"), t("b.monthsOf", { n: M.n })),
      stat(t("b.baseIncome", { month: monthLabel(M.base.id) }), money(M.income)),
      stat(t("b.avgExpenses"), money(M.planned)),
      stat(t("b.toPlan"), money(left), left < 0 ? "neg" : "pos")),
    h("div", { className: "tablebox" }, h("table", {}, h("caption", { textContent: t("b.byType") }),
      h("thead", {}, h("tr", {}, h("th", { scope: "col", textContent: t("b.type") }), h("th", { scope: "col", className: "num", textContent: t("b.amount") }))),
      h("tbody", {}, ...TYPES.map((k) => h("tr", {}, h("td", {}, chip(k)), h("td", { className: "num", textContent: money(M.avg[k]) }))),
        h("tr", { className: "total" }, h("td", { textContent: t("b.total") }), h("td", { className: "num", textContent: money(M.planned) }))))),
    h("p", { className: "equation", textContent: equation(M.income, M.planned) }),
    h("p", { textContent: left < 0 ? t("b.adviceOver") : left > 0 ? t("b.adviceLeft", { left: money(left) }) : t("b.adviceZero") }),
    ...(M.n < 4 ? [h("p", { className: "muted", textContent: t("b.moreMonths") })] : []));
}
