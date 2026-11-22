// "Mis datos": respaldo, restauración y borrado. Nada sale del dispositivo: son archivos y texto que tú guardas.
import * as store from "./storage.js";
import { h } from "./dom.js";
import { t } from "./i18n.js";

export function renderBackup(root, back) {
  const msg = h("p", { role: "status", className: "muted" });
  const say = (k) => { msg.textContent = t(k); };
  const text = h("textarea", { rows: 6, id: "restore-text" });
  const ask = h("div");
  const restore = (txt) => say(store.importData(txt) ? "d.restored" : "d.restoreFail");
  const file = h("input", { type: "file", accept: "application/json,.json", id: "restore-file" });
  file.addEventListener("change", async () => { if (file.files[0]) restore(await file.files[0].text()); file.value = ""; });

  root.replaceChildren(h("section", { className: "card" },
    h("h2", { tabIndex: -1, textContent: t("myData") }),
    h("p", { textContent: t("d.intro") }),
    h("h3", { textContent: t("d.backup") }),
    h("div", { className: "nav" },
      h("button", { type: "button", textContent: t("d.download"), onclick: () => {
        const a = h("a", { href: URL.createObjectURL(new Blob([store.exportData()], { type: "application/json" })), download: `follow-along-${new Date().toISOString().slice(0, 10)}.json` });
        a.click(); URL.revokeObjectURL(a.href); say("d.downloaded");
      } }),
      h("button", { type: "button", className: "ghost", textContent: t("d.copy"), onclick: async () => {
        try { await navigator.clipboard.writeText(store.exportData()); say("d.copied"); } catch { text.value = store.exportData(); text.select(); say("d.copyManual"); }
      } })),
    h("h3", { textContent: t("d.restore") }),
    h("label", { htmlFor: "restore-file", textContent: t("d.fromFile") }), file,
    h("label", { htmlFor: "restore-text", textContent: t("d.fromText") }), text,
    h("button", { type: "button", textContent: t("d.restoreBtn"), onclick: () => restore(text.value) }),
    msg,
    h("h3", { textContent: t("d.wipe") }),
    ask),
    h("button", { type: "button", className: "ghost", textContent: t("toTopics"), onclick: back }));

  const askBtn = h("button", { type: "button", className: "ghost", textContent: t("d.wipeBtn"), onclick: () => {
    const no = h("button", { type: "button", className: "ghost", textContent: t("b.no"), onclick: () => { ask.replaceChildren(askBtn); askBtn.focus(); } });
    ask.replaceChildren(h("p", { textContent: t("d.wipeConfirm") }),
      h("button", { type: "button", textContent: t("d.yes"), onclick: () => { store.wipeData(); ask.replaceChildren(askBtn); say("d.wiped"); } }), " ", no);
    no.focus();
  } });
  ask.append(askBtn);
  root.querySelector("h2").focus();
}
