# Product & Engineering Note: AI Editorial Workspace

---

## 1. Product Design & Strategy

### Primary User
The primary user is a professional newsletter editor or technical writer producing high-signal, weekly publications for founders, software engineers, and enterprise operators (specifically exemplified by *This Week in AI*). This user does not need generic copywriting; they require fast factual triage across contradictory technical announcements, synthesis of business and engineering implications, and ruthless editorial tightening while maintaining factual nuance.

### The Core Problem Chosen
The single most damaging bottleneck in technical newsletter production is the **unverified synthesis gap**: editors read multiple fragmented sources (papers, press releases, benchmark evaluations) and either spend hours manually cross-referencing claims, or risk using generative AI that invents convincing but fabricated details. The core problem solved here is **grounded editorial throughput**: connecting raw sources directly to verifiable quotes, extracting cross-source tensions, and transferring verified evidence seamlessly into a writer-controlled editing environment.

### Core Workflow
```
Ingest 3–8 Sources (URLs/Pasted Text)
  │
  ▼
SSRF-Hardened Extraction & Content Sanitization
  │
  ▼
Two-Stage LLM Extraction (Claims with Verbatim Quotes)
  │
  ▼
Deterministic Quote Verification (Verbatim/Fuzzy Containment Check)
  │
  ▼
Cross-Source Narrative Synthesis & Newsletter Angle Selection
  │
  ▼
Angle & Evidence Handoff -> Pre-Filled Writing Outline
  │
  ▼
Writer Drafts Story -> Runs 6 Deterministic Hemingway Rules
  │
  ▼
Writer-Controlled Suggestion Review (Accept / Edit / Reject / Undo)
  │
  ▼
Side-by-Side Diff Verification & Final Markdown Export with Verified Links
```

### What Was Prioritized vs. Deliberately Left Out
- **Prioritized:**
  - *Factual Grounding & Attribution:* Exact quote extraction with deterministic verification against the raw source text.
  - *Writer Sovereignty:* No auto-overwrites. The original draft is immutable; every revision is individually accepted, edited, or dismissed.
  - *Security & Robustness:* Strict SSRF defense, redirect re-validation, per-source failure isolation, and transparent status reporting (`ok`, `partial`, `failed`).
  - *Deterministic Editorial Feedback:* Clear, rule-based flagging of sentence complexity, passive voice, filler phrases, undefined acronyms, echoes, and dense paragraphs with exact character offset tracking.
- **Deliberately Left Out (and Why):**
  - *Autonomous Article Generation:* Generative AI tools that output a full 500-word newsletter story in one click produce bland, homogeneous prose stripped of the publication's authentic editorial voice. We pre-fill an *outline* of claims and sources, keeping drafting in the writer's hands.
  - *Vector Databases & RAG:* For an editorial workflow operating over 3–8 specific documents per story, a vector database adds latency, operational overhead, chunking boundary artifacts, and unnecessary retrieval failures. Direct full-context ingestion inside the LLM prompt is deterministic, complete, and significantly more reliable.
  - *LangChain / Multi-Agent Frameworks:* Excessive framework abstraction obscures prompt execution, creates fragile error paths, and complicates debugging. We use clean, versioned prompt constants behind a thin client adapter.
  - *User Authentication & Cloud Databases:* State lives cleanly in the client session. This eliminates database migrations, lowers latency to zero for drafts, and allows immediate reproducible local evaluation without credentials.

### Proposed Measurement Framework
To evaluate whether this workspace achieves its mission in production, we propose five concrete metrics:
1. **Time-to-First-Draft (TTFD):** Elapsed time from pasting raw source URLs to completing the first structured draft outline (target: < 15 minutes).
2. **Suggestion Acceptance Rate by Rule Type:** % of flagged writing suggestions accepted, edited, or dismissed. A healthy benchmark is 60–80% acceptance on filler words, and 30–50% on passive voice (reflecting deliberate stylistic choice).
3. **Editor Edit Distance on Final Copy:** Levenshtein or token-level delta between the tool-assisted draft and the final published newsletter issue.
4. **Claim-Verification Pass Rate:** % of LLM-extracted evidence quotes confirmed verbatim in primary sources (> 90% target).
5. **Editor Trust Rating:** Weekly survey rating (1–5 scale) measuring editor confidence that output contains no hallucinations or dropped citations.

*Status: In accordance with our principles of honesty, none of these metrics have been measured on live production traffic yet.*

---

## 2. Engineering Architecture

```mermaid
flowchart TD
    subgraph Client ["Client (React + Vite + Tailwind)"]
        UI_Sources["SourceInput & Status"]
        UI_Brief["ResearchBrief & AnglePicker"]
        UI_Editor["WritingEditor & Metrics"]
        UI_Diff["DiffView (diff)"]
    end

    subgraph Server ["Server (Node.js + Express)"]
        Routes["API Routes (/research, /writing)"]
        SSRF["urlSafety.js (DNS & IP CIDR Block)"]
        Extractor["articleExtractor.js (Readability + Cheerio)"]
        LLM["llmClient.js (@anthropic-ai/sdk)"]
        Verifier["quoteVerifier.js (Normalized Containment)"]
        Rules["writingRules.js (6 Deterministic Rules)"]
        Metrics["writingMetrics.js (Flesch & Editorial)"]
    end

    UI_Sources -->|POST /api/research| Routes
    Routes --> SSRF
    SSRF --> Extractor
    Extractor --> LLM
    LLM --> Verifier
    Verifier --> UI_Brief
    UI_Brief -->|Handoff Outline| UI_Editor
    UI_Editor -->|POST /api/writing/analyze| Routes
    Routes --> Rules
    Routes --> Metrics
    Rules --> UI_Editor
    UI_Editor --> UI_Diff
```

### Deterministic vs. AI Separation Rationale
The architecture strictly enforces a boundary between deterministic computation and generative inference:
- **Deterministic Operations (Non-AI):**
  - *URL Safety & SSRF:* Protocol validation, credential stripping, DNS resolution, and IP range blocklists.
  - *HTML Ingestion & Parsing:* Readability-based DOM extraction, boilerplate stripping, and character budget enforcement.
  - *Evidence Quote Verification:* Sliding-window string containment and normalized whitespace/punctuation comparison.
  - *Writing Rules:* Regex-based detection of filler phrases, acronym expansions, sentence length metrics, passive-voice verbs, and paragraph word counts.
  - *Readability & Pacing Metrics:* Flesch Reading Ease, Flesch-Kincaid Grade Level, average sentence length, syllable counting, and offset remapping.
  - *Hallucination Guardrails:* Deterministic verification that LLM sentence rewrites do not alter, introduce, or drop numbers, proper nouns, or URLs.
- **AI Operations (LLM):**
  - *Synthesis:* Distilling multi-source narratives, identifying implicit contradictions, and formulating timely newsletter angles.
  - *Sentence Rewrites:* Suggesting punchy, active phrasing for flagged complex sentences when requested.

*Why this split matters:* AI is non-deterministic and prone to semantic drift. Any task with a ground truth (e.g. "does this string exist in document X?", "is this sentence 45 words long?", "does the rewrite drop the 49.2% benchmark?") is handled deterministically by code.

### Ingestion & Failure Handling
- **Social Media & Paywalls:** X/Twitter explicitly blocks scraping bots. When a user provides an X link or a paywalled page that yields `<50` characters, extraction fails safely, marks the source `failed` with a dedicated explanation, and provides an immediate one-click **"Paste text instead"** fallback.
- **Partial Extraction:** Pages yielding between 50 and 400 characters are tagged `partial`, alerting the editor that contextual depth may be constrained.
- **LLM Output Failures:** If the LLM generates malformed JSON or violates the Zod schema, the client catches the error and automatically triggers a single retry with a strict repair prompt. If that retry fails, a clean HTTP 502 is returned with the raw output preview, preserving the user's extracted sources so they can retry without refetching.
- **Rate Limits & Auth:** Handled via structured error shapes (`RATE_LIMIT_EXCEEDED`, `LLM_AUTH_ERROR`) with next steps, preventing cryptic stack traces or exposed API keys.

### Quote Verification: Methodology & Real Limitations
The `quoteVerifier` normalizes smart quotes, typographic dashes, ellipses, case, and whitespace. It performs exact containment first, then falls back to sliding-window token overlap (threshold ≥ 0.88) to accommodate minor punctuation artifacts.
- **What Quote Verification Proves:** It proves conclusively that the cited passage exists inside the ingested document.
- **What Quote Verification DOES NOT Prove:** It does **not** prove that the quote is factually true, that the original publication is unbiased, or that the quote was not taken out of context. The editor remains responsible for judging truth.

### SSRF Protection
The `urlSafety.js` module resolves hostnames via DNS prior to issuing network requests and verifies that every resolved IP does not fall within:
- Loopback addresses (`127.0.0.0/8`, `::1`)
- RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`)
- Link-local and cloud metadata ranges (`169.254.0.0/16`, `fe80::/10`)
- Carrier-grade NAT (`100.64.0.0/10`)
- Embedded URL credentials (`http://user:pass@host`) and non-standard web ports.
Redirects are followed manually (up to 3 hops), re-evaluating each destination URL and its DNS resolution through the exact same security checks.

### What to Improve with Another Day of Work
1. **Interactive In-Text Highlight Overlays:** Implement a synchronized ProseMirror or CodeMirror editor layer that highlights flagged text directly in the editor buffer with hover popovers, rather than relying on side-panel character offsets.
2. **Streaming LLM Synthesis:** Stream Stage 1 and Stage 2 responses via Server-Sent Events (SSE) so the editor sees claims appear progressively.
3. **Automated Citation Footnoting:** Automatically append numeric footnote superscripts `[^1]` linking claim sentences directly to bibliography links at the bottom of the draft.
4. **Cross-Source Stance Detection:** Add an NLP classifier to label whether two sources taking opposing sides on a benchmark represent a direct contradiction or a difference in methodology.

---

## 3. Editorial Judgment & Standards

### What Makes Newsletter Writing Clear and Useful
Writing for technical executives and startup builders requires high informational density, immediate relevance, and zero fluff:
1. **The Lead Must Answer "What Changed?":** Never begin with throat-clearing ("In recent years, artificial intelligence has made great strides"). Start with the concrete inflection point.
2. **Active Ownership:** Who released it? Who validated it? Passive voice obscures responsibility.
3. **Preserving Technical Specificity:** Clear writing does not mean dumbed-down writing. A 16-word sentence containing "heterogeneous mixture-of-experts routing" is far superior to a vague 8-word sentence like "smart models work better."
4. **Honoring Uncertainty:** If a benchmark result is preliminary or unverified on proprietary enterprise codebases, state that hedge explicitly.

### How to Evaluate Whether the Writing Assistant Improves a Draft
- **Blind Comparative Review:** Present editors with randomized, unlabelled drafts (Draft A vs. Draft B) and have them score clarity, technical accuracy, and pacing.
- **Meaning Preservation Audits:** Check that no factual assertions, dates, or qualifications were corrupted during rewriting.
- **Rule Dismissal Analysis:** Track which rules editors consistently reject. If editors reject 80% of passive-voice flags in technical methodology paragraphs, the rule's sensitivity must be relaxed for descriptive technical verbs.

### Guardrails: What the Tool Must NEVER Do Automatically
The Writing Assistant is strictly assistive. It is barred from:
1. **Altering Numbers, Benchmark Statistics, or Quantities:** A change from "49.2%" to "nearly 50%" or "about half" is forbidden.
2. **Modifying Proper Nouns or Model Identifiers:** Version tags (e.g., `Claude 3.5 Sonnet` vs. `Claude 3 Sonnet`) must never be modified.
3. **Removing Hedges and Qualifications:** Hedges like "early evaluations suggest" or "under specific test conditions" represent crucial journalistic integrity. Removing them introduces false certainty.
4. **Inventing Citations or Quotes:** Synthetic quotes or fabricated attribution are prohibited under all circumstances.
5. **Overriding Author Voice:** Auto-applying wholesale stylistic rewrites strips the distinctive editorial personality that builds reader loyalty.

