import * as store from "./storage.js";
import { detectLang, setLanguage, getLanguage, t, loadTopic, loadIndex, LANGS } from "./i18n.js";

const main = document.getElementById("main");
const langSel = document.getElementById("lang");
const $ = (tag, props = {}, ...kids) => {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...kids.filter((k) => k != null));
  return el;
};

// ---- Vistas ----
async function showTopics() {
  const idx = await loadIndex();
  const last = store.getLast();
  main.replaceChildren($("h2", { tabIndex: -1, textContent: t("topics") }));
  if (last) {
    const topic = await loadTopic(last.topic);
    const n = Math.min(last.block, topic.blocks.length - 1);
    main.append($("div", { className: "card" },
      $("button", { type: "button", textContent: t("continue"), onclick: () => showBlock(last.topic, n) }),
      $("p", { className: "muted", textContent: t("continueTo", { topic: topic.title, n: n + 1, total: topic.blocks.length }) })));
  }
  const ul = $("ul", { className: "topics" });
  idx.topics.forEach((tp) => ul.append($("li", {}, $("button", { type: "button", className: "ghost", textContent: tp.title, onclick: () => showBlock(tp.id, store.getLast()?.topic === tp.id ? store.getLast().block : 0) }))));
  main.append(ul, $("p", { className: "muted", textContent: store.isMemoryOnly() ? t("memoryOnly") : t("saved") }));
  focusHeading();
}

async function showBlock(topicId, n) {
  const topic = await loadTopic(topicId);
  const total = topic.blocks.length;
  n = Math.max(0, Math.min(n, total - 1));
  const b = topic.blocks[n];
  store.setLast(topicId, n);
  const card = $("section", { className: "card" },
    $("p", { className: "muted", textContent: `${topic.title} · ${t("blockOf", { n: n + 1, total })}` }),
    $("h2", { tabIndex: -1, textContent: b.title }),
    ...(b.text || []).map((p) => $("p", { textContent: p })));
  (b.inputs || []).forEach((inp) => {
    const id = `in-${topicId}-${b.id}-${inp.id}`;
    const field = $("input", { id, type: inp.type === "number" ? "text" : "text", value: store.getAnswer(topicId, inp.id) });
    if (inp.type === "number") field.inputMode = "decimal";
    field.addEventListener("input", () => store.setAnswer(topicId, inp.id, field.value));
    card.append($("label", { htmlFor: id, textContent: inp.label }), field);
  });
  const last = n === total - 1;
  const nav = $("div", { className: "nav" },
    $("button", { type: "button", className: "ghost", disabled: n === 0, textContent: t("back"), onclick: () => showBlock(topicId, n - 1) }),
    $("button", { type: "button", textContent: last ? t("finish") : t("next"), onclick: () => { store.markDone(topicId, b.id); last ? showTopics() : showBlock(topicId, n + 1); } }));
  main.replaceChildren(card, nav, $("button", { type: "button", className: "ghost", textContent: t("toTopics"), onclick: showTopics }));
  focusHeading();
}

const focusHeading = () => main.querySelector("h2")?.focus({ preventScroll: false });
const safe = (fn) => fn().catch(() => main.replaceChildren($("p", { role: "alert", textContent: t("loadError") })));

// ---- Idioma ----
langSel.innerHTML = "";
LANGS.forEach((l) => langSel.append($("option", { value: l, textContent: l === "es" ? "Español" : "English" })));
langSel.addEventListener("change", () => safe(async () => {
  store.setLang(langSel.value);
  await setLanguage(langSel.value);
  document.title = t("appName");
  await showTopics();
}));

// ---- Versión y actualización (sin reinstalar) ----
async function setupUpdates() {
  try {
    const v = await (await fetch("version.json", { cache: "no-store" })).json();
    document.getElementById("ver").textContent = t("version", { build: v.build });
  } catch { /* sin conexión: se omite */ }
  if (!("serviceWorker" in navigator)) return;
  const banner = document.getElementById("update");
  const offer = (worker) => {
    banner.hidden = false;
    document.getElementById("update-btn").onclick = () => worker.postMessage("SKIP_WAITING");
  };
  const reg = await navigator.serviceWorker.register("sw.js");
  if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
  reg.addEventListener("updatefound", () => {
    const w = reg.installing;
    w.addEventListener("statechange", () => {
      if (w.state === "installed" && navigator.serviceWorker.controller) offer(w);
    });
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload(); // los datos están en localStorage: no se pierden
  });
  const check = () => reg.update().catch(() => {});
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  setInterval(check, 60 * 60 * 1000);
}

// ---- Arranque ----
safe(async () => {
  const lang = detectLang(store.getLang());
  langSel.value = lang;
  await setLanguage(lang);
  document.title = t("appName");
  store.askPersistent();
  await showTopics();
  setupUpdates();
});
