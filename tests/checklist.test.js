/* Checklist → green tests. Run: node --test tests/ */
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
const { checklistState, checklistColor } = require("../main.js").core;

test("checklist state", () => {
  assert.equal(checklistState("plain text"), null);
  assert.equal(checklistState("- [ ] a\n- [x] b"), false);
  assert.equal(checklistState("task\n- [x] a\n  - [X] b\n* [x] c\n1. [x] d"), true);
  assert.equal(checklistState("- [x] a\n  - [ ] nested"), false);
  assert.equal(checklistState("text with [ ] inside a line"), null);
});

test("ticking the last box turns the card green, unticking restores its color", () => {
  assert.equal(checklistColor(false, true, "2", undefined), "4");
  assert.equal(checklistColor(false, true, undefined, undefined), "4");
  assert.equal(checklistColor(true, false, "4", "2"), "2");
  assert.equal(checklistColor(true, false, "4", undefined), "");
});

test("no change without a transition", () => {
  assert.equal(checklistColor(true, true, "4", undefined), undefined, "still complete");
  assert.equal(checklistColor(false, false, "2", undefined), undefined, "still open");
  assert.equal(checklistColor(undefined, false, "4", undefined), undefined, "a green card with open boxes, first seen, stays green");
  assert.equal(checklistColor(true, false, "1", "2"), undefined, "recolored by hand after turning green: left alone");
  assert.equal(checklistColor(true, true, "1", undefined), undefined, "recolored by hand while complete: left alone");
});

test("a complete list seen for the first time turns green", () => {
  assert.equal(checklistColor(undefined, true, undefined, undefined), "4");
  assert.equal(checklistColor(undefined, true, "4", undefined), undefined);
});
