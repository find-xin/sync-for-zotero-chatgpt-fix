# ChatGPT DOM compatibility fix

This repository is an **unofficial fork** of [yilewang/sync-for-zotero](https://github.com/yilewang/sync-for-zotero), based on upstream release `v0.0.16` (commit `099159b`). The original Apache-2.0 license and upstream history are retained.

## What changed

ChatGPT changed the markup used for conversation messages. On the observed page, the previous `[data-message-author-role]` and `[data-testid^="conversation-turn"]` selectors returned no matches even though ChatGPT had sent and answered a question. The extension then failed with:

> Chat never exposed a user turn matching the submitted prompt, so delivery could not be verified.

This patch also recognizes ChatGPT's current `data-content-search-unit-key` user and assistant units. It reads the assistant's `data-markdown-text-style="assistant-message"` body, detects a submitted PDF card in the adjacent user-message container, and checks the response action bar outside the assistant unit. The older selectors remain supported.

## Install

Download `extension.zip` from this repository's [Releases](../../releases) page. Unzip it, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked** with the extracted folder. If you already loaded an unpacked Sync for Zotero extension, replace its files with this archive's contents, click **Reload** on its extension card, and refresh the ChatGPT tab.

## Verification

Run `npm test` from the repository root. The new regression test is `test/chatgpt_current_dom.test.mjs`. A PDF turn was also sent through Zotero → Chrome → ChatGPT → Zotero on 2026-09-28; the response appeared in both ChatGPT and Zotero. Future ChatGPT markup changes may require another adapter update.
