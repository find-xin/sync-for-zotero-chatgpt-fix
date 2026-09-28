import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { parseHTML } = require("linkedom");
const shared = require("../extension/webchat_shared.js");
const source = fs.readFileSync(new URL("../extension/content_script.js", import.meta.url), "utf8");

function page(html) {
  const { window, document } = parseHTML(`<html><body><main>${html}</main></body></html>`);
  window.location = new URL("https://chatgpt.com/c/test-chat");
  window.getComputedStyle = () => ({ display: "block", visibility: "visible" });
  window.HTMLElement.prototype.getBoundingClientRect = () => ({ width: 100, height: 30 });
  const context = vm.createContext({
    window, document, URL, console, Node: window.Node, Element: window.Element,
    HTMLElement: window.HTMLElement, HTMLButtonElement: window.HTMLButtonElement,
    HTMLTextAreaElement: window.HTMLTextAreaElement, Event: window.Event,
    SyncZoteroShared: shared, setInterval: () => 1, clearInterval() {},
    setTimeout, clearTimeout,
    chrome: { runtime: { onMessage: { addListener() {} }, onConnect: { addListener() {} }, sendMessage() {} } },
  });
  vm.runInContext(source, context);
  const api = vm.runInContext(`({ extractConversationTranscript, findMatchingUserTurn,
    getUserMessageCount, getAssistantMessageNodes, hasResponseActionBar })`, context);
  return { ...api, document };
}

test("current ChatGPT markup binds a PDF user turn and extracts the complete answer", () => {
  const current = page(`
    <div class="group flex flex-col pb-2 pt-2">
      <div class="flex flex-col gap-3">
        <div class="block-BQZwFn">
          <div class="group/user-message flex flex-col items-end gap-2">
            <div class="flex w-full flex-wrap justify-end">
              <span class="group/resource-card"><span class="truncate">paper.pdf</span><span>PDF</span></span>
            </div>
            <div data-content-search-unit-key="fallback-turn-0:0:user" class="w-full">
              <h4 class="sr-only">你说：</h4>
              <div data-user-message-bubble="true"><div class="text-size-chat whitespace-pre-wrap">Explain this paper</div></div>
            </div>
          </div>
        </div>
        <div class="block-BQZwFn">
          <div data-content-search-unit-key="fallback-turn-0:1:assistant">
            <h4 class="sr-only">ChatGPT 说：</h4>
            <div data-markdown-text-style="assistant-message" class="MarkdownRoot-rZKhxa">
              <p>First paragraph.</p><p>Second paragraph.</p>
            </div>
          </div>
        </div>
      </div>
      <button aria-label="复制">Copy response</button>
    </div>`);
  const transcript = current.extractConversationTranscript();
  assert.equal(transcript.count, 2);
  assert.equal(transcript.messages[0].role, "user");
  assert.equal(transcript.messages[0].text, "Explain this paper");
  assert.ok(transcript.messages[0].attachments.some((name) => name.includes("paper.pdf")));
  assert.equal(transcript.messages[1].role, "assistant");
  assert.equal(transcript.messages[1].text, "First paragraph.\n\nSecond paragraph.");
  assert.equal(current.getUserMessageCount(), 1);
  assert.equal(current.getAssistantMessageNodes().length, 1);
  assert.equal(current.findMatchingUserTurn(transcript, 0, "Explain this paper")?.role, "user");
  assert.equal(current.hasResponseActionBar(), true);
});

test("answer controls and citations alone do not signal completion", () => {
  const current = page(`
    <div class="group flex flex-col pb-2 pt-2"><div><div>
      <div data-content-search-unit-key="fallback-turn-0:1:assistant">
        <div data-markdown-text-style="assistant-message"><p>Generating</p><button aria-label="Open citation">Source</button></div>
      </div>
    </div></div></div>`);
  assert.equal(current.hasResponseActionBar(), false);
});

test("legacy ChatGPT role attributes remain supported", () => {
  const legacy = page(`
    <div data-message-author-role="user" data-message-id="u1">Old prompt</div>
    <div data-message-author-role="assistant" data-message-id="a1"><div class="markdown"><p>Old answer</p></div></div>`);
  const transcript = legacy.extractConversationTranscript();
  assert.equal(transcript.count, 2);
  assert.equal(transcript.messages[0].text, "Old prompt");
  assert.equal(transcript.messages[1].text, "Old answer");
});
