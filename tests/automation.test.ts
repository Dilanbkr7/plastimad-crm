import assert from "node:assert/strict";
import test from "node:test";
import { decideBotReply } from "../lib/whatsapp/flow";
import { commercialHandoffReply, COMMERCIAL_WHATSAPP_URL } from "../lib/commercial";

const defaults = { enabled: true, paused: false, handedOff: false, replyCount: 0, asksForHuman: false, messageType: "text" };

test("two replies, third hands off, later messages remain silent", () => {
  assert.equal(decideBotReply(defaults), "ANSWER");
  assert.equal(decideBotReply({ ...defaults, replyCount: 1 }), "ANSWER");
  assert.equal(decideBotReply({ ...defaults, replyCount: 2 }), "HANDOFF");
  assert.equal(decideBotReply({ ...defaults, replyCount: 3, handedOff: true }), "SILENT");
});
test("human requests and media immediately hand off", () => {
  assert.equal(decideBotReply({ ...defaults, asksForHuman: true }), "HANDOFF");
  for (const messageType of ["image", "audio", "video", "document", "sticker", "location", "unknown"]) {
    assert.equal(decideBotReply({ ...defaults, messageType }), "HANDOFF");
  }
});
test("interactive answers count as text; reactions do not consume replies", () => {
  for (const messageType of ["button", "interactive"]) assert.equal(decideBotReply({ ...defaults, messageType }), "ANSWER");
  assert.equal(decideBotReply({ ...defaults, messageType: "reaction" }), "SILENT");
});
test("manual intervention and disabled automation stop all replies", () => {
  assert.equal(decideBotReply({ ...defaults, paused: true, asksForHuman: true }), "SILENT");
  assert.equal(decideBotReply({ ...defaults, enabled: false, messageType: "audio" }), "SILENT");
});
test("commercial contact is separate and files must be resent", () => {
  assert.equal(COMMERCIAL_WHATSAPP_URL, "https://wa.me/593995152308");
  assert.match(commercialHandoffReply(), /593995152308/);
  assert.match(commercialHandoffReply(true), /reenvíe/);
  assert.doesNotMatch(commercialHandoffReply(), /984332620/);
});
