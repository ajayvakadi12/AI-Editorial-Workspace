# Manual End-to-End Test Plan & Verification Checklist

This document provides a systematic verification matrix for the **AI Editorial Workspace**, covering edge cases, network failures, security defenses, and writer-controlled feedback loops.

---

## 1. Test Matrix Summary

| Test ID | Test Scenario | Expected Outcome | Status |
|---------|---------------|------------------|--------|
| **TC-01** | Standard Public URLs (3+ valid sources) | Successfully extracts HTML, parses main text, extracts quotes, synthesizes brief | **PASS** |
| **TC-02** | 404 / Non-existent Webpage | Extraction marks source `failed` with clear reason; prompts user to paste text | **PASS** |
| **TC-03** | Paywalled / Low Content Webpage (<50 chars) | Extraction marks source `failed` or `partial`; UI prompts to paste full text | **PASS** |
| **TC-04** | X / Twitter Link | Scraper detects platform wall, marks `failed`, displays explicit message: "X/Twitter links cannot be scraped directly. Please paste tweet text." | **PASS** |
| **TC-05** | Pasted Text Excerpts (<50, 50–400, 400+ chars) | Enforces character gates; shows status badge and character counter | **PASS** |
| **TC-06** | Insufficient Sources (<3 sources submitted) | Request rejected with HTTP 400 validation error; UI disables submit button | **PASS** |
| **TC-07** | SSRF Attack Payload (Loopback / Cloud Metadata) | Blocked by `urlSafety.js` before network request; displays "SSRF Blocked" | **PASS** |
| **TC-08** | Missing API Key / Config Error | Graceful HTTP 500/400 with user-friendly message; no stack trace leaked | **PASS** |
| **TC-09** | LLM Mock Mode (`LLM_MOCK=true`) | Displays prominent yellow "MOCK DATA MODE" banner in UI; returns fixtures | **PASS** |
| **TC-10** | Angle Handoff to Writing Editor | Selected angle headline, thesis, claims, and links pre-fill editor outline | **PASS** |
| **TC-11** | 6 Writing Rules Engine | Flags long sentences, passive voice, fillers, acronyms, repetition, dense paras | **PASS** |
| **TC-12** | Offset Remapping on Accepted Edits | Editing earlier sentences shifts downstream offsets cleanly without drift | **PASS** |
| **TC-13** | Word-Level Diff View | Side-by-side & word diff show exact deletions (red) and insertions (green) | **PASS** |
| **TC-14** | Hallucination Guardrail on Rewrites | Rewrites that drop numbers or alter names are flagged with warning | **PASS** |

---

## 2. Detailed Execution Procedures

### TC-01: Valid Public URLs
- **Input:** 3 live public web pages (e.g. Wikipedia articles, tech blogs).
- **Steps:**
  1. Paste 3 distinct URLs in the Research Assistant.
  2. Click **Generate Research Brief**.
- **Expected:** Sources show status `ok` or `partial`. Brief renders developments, tensions, and at least 2 newsletter angles.

### TC-02: 404 Not Found URL
- **Input:** `https://en.wikipedia.org/wiki/This_Page_Definitely_Does_Not_Exist_1234567`
- **Steps:**
  1. Add source with non-existent URL alongside 2 valid sources.
  2. Click **Generate Research Brief**.
- **Expected:**
  - Source #1 fails with status `failed` and message `HTTP Error 404 Not Found`.
  - UI surfaces an alert: `Research brief requires at least 3 usable sources`.
  - A button **"Paste text instead"** appears next to the failed source.

### TC-03: Paywalled or Minimal Webpage
- **Input:** A heavily paywalled or JavaScript-blocked page that returns `<50` characters of readable text.
- **Steps:**
  1. Submit the URL.
- **Expected:** Status `failed` with reason: `Could not extract sufficient text from page (under 50 characters). Content may be behind a paywall or rendered via JavaScript. Please paste the text instead.`

### TC-04: X / Twitter Post URL
- **Input:** `https://twitter.com/sama/status/1234567890` or `https://x.com/OpenAI/status/9876543210`
- **Steps:**
  1. Enter the Twitter/X link in the URL input.
- **Expected:**
  - Inline input immediately displays advisory: `Twitter / X links block direct scraping. We recommend switching to "Pasted Text".`
  - If submitted, extraction safely flags `failed` with explicit guidance to paste the post text.

### TC-05: Pasted Text Boundary Tests
- **Test 5A (<50 chars):** Paste `"Short text."` -> Marked `failed` ("Pasted text is too short. Under 50 characters").
- **Test 5B (50–399 chars):** Paste 200 characters -> Marked `partial` ("Pasted text is under 400 characters; editorial context may be limited").
- **Test 5C (400+ chars):** Paste 500 characters -> Marked `ok` ("✓ adequate depth").

### TC-06: Submission Validation (<3 Sources)
- **Input:** Provide only 2 filled sources.
- **Expected:**
  - Submit button is disabled in UI with counter: `2 of 3–8 required`.
  - Direct API POST request to `/api/research` returns `HTTP 400` with code `VALIDATION_ERROR` and message: `At least 3 sources are required to conduct editorial research`.

### TC-07: SSRF Protection Defense
- **Input 7A:** `http://localhost/admin`
- **Input 7B:** `http://127.0.0.1:8080/metrics`
- **Input 7C:** `http://169.254.169.254/latest/meta-data/` (AWS Cloud Metadata)
- **Input 7D:** `file:///etc/passwd`
- **Input 7E:** `http://admin:secret@malicious.com`
- **Expected:**
  - All blocked synchronously by `validateUrlForSsrf()`.
  - Returns `SSRF Blocked` without dispatching external network sockets.

### TC-08: Missing API Key & Error Handling
- **Setup:** Set `LLM_MOCK=false` and `LLM_API_KEY=""`.
- **Steps:** Trigger research analysis.
- **Expected:**
  - Returns structured JSON: `{ error: { code: "CONFIG_ERROR", message: "LLM API key is missing..." } }`.
  - Server logs generic error code without leaking stack traces or internal secrets.

### TC-09: Mock Mode Indicator
- **Setup:** `LLM_MOCK=true`.
- **Expected:**
  - Client header displays prominent amber banner: `MOCK DATA MODE ACTIVE: Server is returning deterministic test fixtures (LLM_MOCK=true)`.
  - All claims and angles are clearly marked as test fixtures.

### TC-10: Research to Writing Handoff
- **Steps:**
  1. Generate a brief in Research Assistant.
  2. Pick Angle #1.
  3. Click **"Start draft from this angle"**.
- **Expected:**
  - App transitions smoothly to the Writing Assistant tab.
  - Draft area is pre-populated with an outline containing the headline, thesis, supporting claims, and clickable source URLs.
  - Active Angle pill in the navbar updates with the selected headline.

### TC-11: 6 Writing Rules Engine
- **Test Passage:**
  `"It is important to note that the SWE-bench benchmark was conducted by independent evaluators in order to measure autonomous code resolution."`
- **Flagged Issues:**
  1. Filler phrase: `"It is important to note that"` -> Suggestion: `"Note that"`.
  2. Acronym: `"SWE-bench"` on first use -> Suggestion: `"Define on first mention"`.
  3. Passive voice: `"was conducted by independent evaluators"` -> Suggestion: `"Active voice: make 'independent evaluators' the subject"`.
  4. Filler phrase: `"in order to"` -> Suggestion: `"to"`.

### TC-12: Offset Shift on Accepted Edits
- **Steps:**
  1. Accept suggestion #1 (`"It is important to note that"` -> `"Note that"`). Text shortens by 18 characters.
  2. Inspect suggestion #2 (`"in order to"`).
- **Expected:**
  - Character offsets for `"in order to"` shift left by 18 characters.
  - Flagged span highlights the exact text without offset drift or misalignment.

### TC-13: Word-Level Diff View
- **Steps:**
  1. Accept an edit.
  2. Switch to **Diff & Revision View** tab.
- **Expected:**
  - Word diff shows deleted words with red strike-through and inserted words with green background.
  - Side-by-side mode displays the original immutable draft adjacent to the updated draft.
  - "Copy Revised Text" copies the clean draft to clipboard.

