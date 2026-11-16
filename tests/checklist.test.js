/* Done marks and checklists. Run: node --test tests/ */
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const realLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "obsidian") {
    class Base {}
    return { Plugin: Base, Notice: Base, PluginSettingTab: Base, Setting: Base, ItemView: Base, Modal: Base, getLanguage: () => "en", setIcon: () => {} };
  }
  return realLoad.call(this, request, ...rest);
};
globalThis.window = { localStorage: { getItem: () => null } };
const { checklistState, doneMark, setDoneMark, tickAll, isDone } = require("../main.js").core;

test("checklist state", () => {
  assert.equal(checklistState("plain text"), null);
  assert.equal(checklistState("- [ ] a\n- [x] b"), false);
  assert.equal(checklistState("task\n- [x] a\n  - [X] b\n* [x] c\n1. [x] d"), true);
  assert.equal(checklistState("- [x] a\n  - [ ] nested"), false);
  assert.equal(checklistState("text with [ ] inside a line"), null);
});

test("a card without checkboxes is done by ✅ at the start", () => {
  assert.equal(isDone({ type: "text", text: "✅ ship it" }), true);
  assert.equal(isDone({ type: "text", text: "⏸ ✅ x" }), true);
  assert.equal(isDone({ type: "text", text: "## ✅ Title" }), true);
  assert.equal(isDone({ type: "text", text: "ship ✅ later" }), false);
  assert.equal(isDone({ type: "text", text: "green but open", color: "4" }), false);
});

test("a card with checkboxes is done when all are ticked, ✅ or not", () => {
  assert.equal(isDone({ type: "text", text: "- [x] a\n- [x] b" }), true);
  assert.equal(isDone({ type: "text", text: "Fixes:\n- [x] a\n- [X] b" }), true);
  assert.equal(isDone({ type: "text", text: "- [x] a\n- [ ] b" }), false);
  assert.equal(isDone({ type: "text", text: "✅ Fixes:\n- [x] a\n- [ ] b" }), false, "an open box beats ✅");
});

test("❌ cancels any card, checklist or not", () => {
  assert.equal(isDone({ type: "text", text: "\n❌ dropped" }), true);
  assert.equal(isDone({ type: "text", text: "❌ Fixes:\n- [ ] a" }), true);
});

test("file and link cards: green still means done", () => {
  assert.equal(isDone({ type: "file", file: "a.md", color: "4" }), true);
  assert.equal(isDone({ type: "file", file: "a.md" }), false);
});

test("setDoneMark puts ✅ on and takes it off", () => {
  assert.equal(setDoneMark("task", true), "✅ task");
  assert.equal(setDoneMark("✅ task", true), "✅ task");
  assert.equal(setDoneMark("❌ task", true), "❌ task");
  assert.equal(setDoneMark("⏸ task", true), "⏸ ✅ task");
  assert.equal(setDoneMark("# Title\nbody", true), "# ✅ Title\nbody");
  assert.equal(setDoneMark("- [x] ✅ a", false), "- [x] a");
  assert.equal(setDoneMark("✅\n- [x] a", false), "- [x] a");
  for (const s of ["task", "⏸ task", "# Title\nbody", "> quote", "line one\nline two"]) {
    assert.equal(setDoneMark(setDoneMark(s, true), false), s, "round trip: " + s);
  }
  assert.equal(setDoneMark("❌ task", false), "❌ task");
});

test("tickAll ticks every open box", () => {
  assert.equal(tickAll("Fixes:\n- [ ] a\n  - [x] b\n1. [ ] c"), "Fixes:\n- [x] a\n  - [x] b\n1. [x] c");
});
