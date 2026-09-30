// R8 SV-46 (delegated simulation, I-233; GAP-18 stays open): the assistant's «Modello
// locale» — the endpoint + model name + «Prova la connessione» panel of Foundry's LLM
// modules and SillyTavern's API connection. Only addresses of this computer or the home
// network are accepted; nothing is contacted (fetch is never called); answers come from the
// demo generator labelled «risposta simulata del modello locale»; copy-and-paste stays.
// Every area loaded; synthetic data only.
import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as D from "../assistant-domain.mjs";
import { actions, renderAssistant, resetAssistantView } from "../assistant.mjs";
import { app, described } from "./r8-harness.mjs";

let calls = [];
const realFetch = globalThis.fetch;
beforeEach(() => {
  calls = [];
  globalThis.fetch = (...args) => {
    calls.push(args);
    throw new Error("No network in the local model simulation");
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
  resetAssistantView();
});

test("only local addresses: this computer, the home network, .local names", () => {
  for (const ok of [
    "http://localhost:11434",
    "localhost:1234",
    "http://127.0.0.1:1234/v1",
    "http://192.168.1.20:11434",
    "http://10.0.0.5:8080",
    "http://172.16.4.2",
    "http://[::1]:11434",
    "http://[fd12:3456::1]:11434",
    "http://gpu-box.local:11434",
    "https://ollama.home.arpa",
  ])
    assert.equal(D.localEndpointCheck(ok).ok, true, ok);
  for (const [bad, why] of [
    ["https://api.openai.com/v1", /non è un indirizzo di questo computer/],
    ["http://8.8.8.8:11434", /8\.8\.8\.8/],
    ["http://172.32.0.1", /non è un indirizzo/],
    ["http://11.0.0.1", /non è un indirizzo/],
    ["http://0.0.0.0:11434", /non è un indirizzo/],
    ["http://user:secret@localhost:11434", /nome utente e password/],
    ["ftp://localhost", /http o https/],
    ["", /Scrivi l’indirizzo/],
  ]) {
    const check = D.localEndpointCheck(bad);
    assert.equal(check.ok, false, bad);
    assert.match(check.reason.it, why, bad);
    assert.ok(check.reason.en.length > 20);
  }
  assert.equal(D.localEndpointCheck("http://localhost:11434/").endpoint, "http://localhost:11434");
  assert.equal(calls.length, 0);
});

test("save, simulated test and a labelled answer; no request ever leaves the browser", async () => {
  const h = await app({ role: "dm", lang: "it" });
  actions.enable(h.ctx, { journal: true, materials: true, chat: true, log: true });
  h.ctx.role = "player";
  actions.giveConsent?.(h.ctx);
  if (D.consentOf(h.ctx.state.ext.assistant, "lanterns", "player") !== "given")
    h.ctx.commit("consenso", (draft) => D.giveConsent(draft, draft.ext.assistant, "player"), {
      local: true,
      visibility: "private",
      undoable: false,
    });
  actions.setEngine(h.ctx, "local");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "consent" };
  let html = renderAssistant(h.ctx);
  assert.match(html, /value="local" data-assistant-engine checked/);
  assert.match(html, /data-assistant-local-endpoint[^>]*|value="http:\/\/localhost:11434"/);
  assert.match(html, /nessuna richiesta lascia il browser/);
  // Nothing saved yet: the test button says why it is disabled (SV-37).
  assert.match(
    html,
    /data-assistant-act="test-local" disabled aria-describedby="assistant-local-why"/,
  );
  described(html.slice(html.indexOf("data-assistant-local")), "local panel");
  // Copy-and-paste stays as a choice.
  assert.match(html, /value="external" data-assistant-engine/);
  // A public address is refused, nothing is saved, the typed values stay.
  assert.throws(
    () => actions.setLocal(h.ctx, { endpoint: "https://api.example.com/v1", model: "llama3.1" }),
    (error) => /non è un indirizzo di questo computer/.test(error.it),
  );
  assert.equal(D.localModelOf(h.ctx.state.ext.assistant, "player"), null);
  html = renderAssistant(h.ctx);
  assert.match(html, /value="https:\/\/api\.example\.com\/v1"/);
  // A LAN address and a model are saved; the simulated test contacts nothing.
  actions.setLocal(h.ctx, { endpoint: "http://192.168.1.20:11434", model: "llama3.1" });
  const test = actions.testLocal(h.ctx);
  assert.deepEqual([test.ok, test.simulated], [true, true]);
  html = renderAssistant(h.ctx);
  assert.match(html, /Prova simulata riuscita/);
  assert.match(html, /nessuna richiesta è uscita dal browser/);
  assert.match(html, /http:\/\/192\.168\.1\.20:11434 il modello «llama3\.1»/);
  // Ask: the demo generator answers, labelled as the local model's simulated answer.
  h.ctx.view = { page: "campaign", tab: "assistant", id: "" };
  const id = actions.ask(h.ctx, "Chi è Oben?");
  const row = D.findHistory(h.ctx.state.ext.assistant, "player", id);
  assert.equal(row.engine, "local");
  assert.equal(row.local.model, "llama3.1");
  html = renderAssistant(h.ctx);
  assert.match(html, /Risposta simulata del modello locale «llama3\.1»/);
  assert.match(html, /Motore: modello locale «llama3\.1» \(simulato/);
  assert.match(html, new RegExp(`data-assistant-act="retry" data-row="${id}"`));
  // English too.
  h.ctx.lang = "en";
  assert.match(renderAssistant(h.ctx), /Simulated answer of the local model “llama3\.1”/);
  assert.equal(calls.length, 0, "fetch was never called");
});

test("privacy: the address stays with its owner; the DM sees only the engine", async () => {
  const h = await app({ role: "dm", lang: "it" });
  actions.enable(h.ctx, { journal: true, materials: true, chat: true, log: true });
  h.ctx.role = "player";
  actions.setEngine(h.ctx, "local");
  actions.setLocal(h.ctx, { endpoint: "http://192.168.1.20:11434", model: "llama3.1" });
  h.ctx.role = "dm";
  resetAssistantView();
  assert.equal(D.localModelOf(h.ctx.state.ext.assistant, "dm"), null);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "consent" };
  const html = renderAssistant(h.ctx);
  assert.doesNotMatch(html, /192\.168\.1\.20/);
  assert.match(html, /motore: modello locale \(simulato, nessuna richiesta di rete\)/);
  // Without a saved connection the local engine refuses to answer instead of guessing.
  h.ctx.role = "dm";
  actions.setEngine(h.ctx, "local");
  assert.throws(
    () => actions.ask(h.ctx, "Chi è Oben?"),
    (error) => /Collega prima il modello locale/.test(error.it),
  );
  // The palette finds the panel by the words people use.
  const command = h.registry.get("command", "assistant.local-model", h.ctx);
  assert.match(command.description.it, /Ollama/);
  h.registry.run(command, h.ctx);
  assert.deepEqual([h.ctx.view.tab, h.ctx.view.id], ["assistant", "consent"]);
  assert.equal(calls.length, 0);
});
