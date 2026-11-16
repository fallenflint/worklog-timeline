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
const { checklistState, checklistDone, doneMark, setDoneMark, isDone } = require("../main.js").core;

test("checklist state", () => {
  assert.equal(checklistState("plain text"), null);
  assert.equal(checklistState("- [ ] a\n- [x] b"), false);
  assert.equal(checklistState("task\n- [x] a\n  - [X] b\n* [x] c\n1. [x] d"), true);
  assert.equal(checklistState("- [x] a\n  - [ ] nested"), false);
  assert.equal(checklistState("text with [ ] inside a line"), null);
});

test("done = ✅ or ❌ at the start of the first line; color means nothing for text", () => {
  assert.equal(isDone({ type: "text", text: "✅ ship it" }), true);
  assert.equal(isDone({ type: "text", text: "\n❌ dropped" }), true);
  assert.equal(isDone({ type: "text", text: "⏸ ✅ x" }), true);
  assert.equal(isDone({ type: "text", text: "## ✅ Title" }), true);
  assert.equal(isDone({ type: "text", text: "✅\n- [x] a" }), true);
  assert.equal(isDone({ type: "text", text: "- [x] ✅ a\n- [ ] b" }), true);
  assert.equal(isDone({ type: "text", text: "- [x] a ✅" }), false);
  assert.equal(isDone({ type: "text", text: "green but open", color: "4" }), false);
  assert.equal(isDone({ type: "text", text: "- [x] a\n- [x] b" }), false);
  assert.equal(isDone({ type: "text", text: "ship ✅ later" }), false);
  assert.equal(isDone({ type: "file", file: "a.md", color: "4" }), true, "files have no text: green still counts");
  assert.equal(isDone({ type: "file", file: "a.md" }), false);
});

test("setDoneMark puts ✅ on and takes it off", () => {
  assert.equal(setDoneMark("task", true), "✅ task");
  assert.equal(setDoneMark("✅ task", true), "✅ task");
  assert.equal(setDoneMark("❌ task", true), "❌ task");
  assert.equal(setDoneMark("⏸ task", true), "⏸ ✅ task");
  assert.equal(setDoneMark("# Title\nbody", true), "# ✅ Title\nbody");
  assert.equal(setDoneMark("- [x] a\n- [x] b", true), "- [x] ✅ a\n- [x] b", "a list stays a list");
  assert.equal(setDoneMark("1. [x] a", true), "1. [x] ✅ a");
  assert.equal(setDoneMark("✅\n- [x] a", false), "- [x] a", "the old own-line mark comes off too");
  for (const s of ["task", "⏸ task", "# Title\nbody", "- [x] a\n- [x] b", "> quote", "line one\nline two"]) {
    assert.equal(setDoneMark(setDoneMark(s, true), false), s, "round trip: " + s);
  }
  assert.equal(setDoneMark("❌ task", false), "❌ task");
});

test("ticking the last box adds ✅, unticking takes it off", () => {
  assert.equal(checklistDone(false, true, null), true);
  assert.equal(checklistDone(true, false, "✅"), false);
});

test("no change without a transition, and ❌ is never touched", () => {
  assert.equal(checklistDone(true, true, "✅"), undefined, "still complete");
  assert.equal(checklistDone(false, false, null), undefined, "still open");
  assert.equal(checklistDone(undefined, false, "✅"), undefined, "a ✅ card with open boxes, first seen, stays done");
  assert.equal(checklistDone(true, false, null), undefined, "✅ removed by hand: left alone");
  assert.equal(checklistDone(true, true, null), undefined, "✅ removed by hand while complete: left alone");
  assert.equal(checklistDone(true, false, "❌"), undefined, "cancelled stays cancelled");
  assert.equal(checklistDone(false, true, "❌"), undefined);
});

test("a complete list seen for the first time gets ✅", () => {
  assert.equal(checklistDone(undefined, true, null), true);
  assert.equal(checklistDone(undefined, true, "✅"), undefined);
});
