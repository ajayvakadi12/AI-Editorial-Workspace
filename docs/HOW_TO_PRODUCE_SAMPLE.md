# How to Produce Sample Editorial Output

This guide outlines the exact, step-by-step procedure for a human editor to create a verified newsletter story using the **AI Editorial Workspace**, populate `sample/editorial-output.md`, and record the revision journey in `sample/before-after.md`.

In accordance with our core non-negotiable principles, **no synthetic facts, simulated quotes, or unverified claims are fabricated by the agent**. The human editor performs these live editorial steps with actual sources.

---

## Step 1: Select 3+ Real, Recent Sources

1. Pick a single timely theme in artificial intelligence from the current week (e.g., frontier coding benchmarks, context caching economics, open weights reasoning models, or agentic security).
2. Gather between **3 and 8 distinct sources**:
   - At least 1 primary technical release, paper, or benchmark report (e.g., an Anthropic, OpenAI, or Google DeepMind technical announcement).
   - At least 1 independent evaluation or developer analysis (e.g., SWE-bench evaluation, independent latency/cost analysis, or a GitHub pull request breakdown).
   - At least 1 industry/market practitioner perspective (e.g., an engineering blog post from an enterprise adopting the tool).
3. If using social posts from X/Twitter or paywalled publications, copy the relevant excerpt directly to paste as text (since X blocks automated scraping).

---

## Step 2: Ingest Sources in the Research Assistant

1. Ensure the workspace is running (`npm run dev`) and navigate to the **Research Assistant** tab (`http://localhost:5173`).
2. Input each source:
   - For web articles: Select `URL`, paste the link, and enter an optional publication label.
   - For paywalled articles, X posts, or excerpts: Select `Pasted Text` and paste the snippet (ensure it has at least 50 characters, ideally 400+ characters).
3. Click **Generate Research Brief**.
4. Check the **Source Ingestion Status** list:
   - Confirm all sources show `OK` (or `Partial`).
   - If any source shows `Failed` (e.g., blocked by SSRF, paywall, or Twitter wall), click **Paste text instead**, insert the text excerpt, and re-submit.

---

## Step 3: Evaluate Cross-Source Synthesis & Select an Editorial Angle

1. Review the synthesized **Developments**:
   - Read the tailored breakdowns for **Founders**, **Builders**, and **Operators**.
   - Note the **Tensions** (Agreements, Conflicts, and Gaps) to see where sources diverge.
2. Review the **Verifiable Claims**:
   - Inspect the green `Verified Quote` badges. Note any unverified claims (quotes that could not be matched verbatim in the source).
   - Click each original link icon to verify that the source URL is active.
3. Review the proposed **Newsletter Angles**:
   - Read each angle's headline, thesis, why now catalyst, counterpoint, and practical takeaway.
   - Review the **Editor Recommendation** card.
4. Select your preferred angle and click **"Start draft from this angle"**.

---

## Step 4: Draft the Story (Human-Authored)

1. When you click "Start draft from this angle", the app transitions to the **Writing Assistant** and seeds the editor with a structured outline:
   - Working headline and thesis.
   - Context and timeliness catalyst.
   - Supporting verified claims with quotes and source URLs.
   - Counterpoints and risks.
   - Actionable takeaway for founders and engineering leaders.
2. Write the first draft in your own words (aim for 350–500 words).
3. **DO NOT** edit out your natural writing quirks yet: write a realistic, honest first pass containing your thoughts, technical arguments, and citations.
4. Copy this raw text and paste it into `sample/before-after.md` under **"2. Original Raw Draft (Before Review)"**. Note its initial word count and readability score.

---

## Step 5: Run the Writing Assistant & Review Feedback

1. In the Writing Assistant, click **Re-analyze Draft**.
2. Examine the **Editorial & Readability Metrics** bar:
   - Word Count, Avg Sentence Length, Longest Sentence, Reading Time, Passive Voice Share, and Flesch Reading Ease.
   - Read the mandatory caveat: *Readability scores are a rough signal, not a verdict on quality.*
3. Review each flagged item in the **Editorial Feedback & Suggestions** panel:
   - **Rule 1 (Long Sentences / Convoluted Clauses):** Sentences over 30/40 words or with 3+ commas.
   - **Rule 2 (Passive Voice):** Verbs that obscure who performed the action.
   - **Rule 3 (Filler Phrases):** "It is important to note that", "in order to", "at the end of the day", etc.
   - **Rule 4 (Acronyms & Jargon):** AI terms like "RAG" or "SWE-bench" lacking an upfront definition.
   - **Rule 5 (Repetition):** Repeated sentence openers and echoed words.
   - **Rule 6 (Dense Paragraphs):** Paragraphs exceeding 120 words.

---

## Step 6: Accept, Reject, or Edit Suggestions (Writer Control)

1. For each suggestion card:
   - Click **Accept** to apply the tool's high-conviction fix.
   - Click **Edit** to customize the replacement before accepting (e.g., maintaining technical precision).
   - Click **Dismiss (Reject)** if the flagged sentence is intentionally phrased (e.g., where passive voice is deliberate or a long sentence is grammatically necessary).
2. Log every decision in the table in `sample/before-after.md`:
   - Document the flagged passage, the suggestion, whether you accepted or rejected it, and your editorial rationale.
   - **Crucial:** Explain *why* you rejected any suggestion. Showing editorial judgment over blind tool acceptance is essential.

---

## Step 7: Verify Diff, Meaning Preservation, and Links

1. Switch to the **Diff & Revision View** tab:
   - Inspect the **Word Diff** to confirm that accepted changes only removed clutter and clarified syntax.
   - Review the **Side-by-Side** comparison of the original immutable draft against the revised text.
2. Conduct the **Integrity Guard Checklist**:
   - Ensure no numbers, benchmark percentages, or dollar figures were altered.
   - Ensure company names and model versions remain accurate.
   - Confirm that hedges reflecting real uncertainty ("may", "preliminary") were not erased into false certainty.
3. Open each primary source link in a browser:
   - Confirm the webpage is accessible.
   - Confirm that the quoted text actually exists in the source and supports the editorial claim.

---

## Step 8: Populate Sample Deliverables

1. Copy the final revised text from the DiffView (click **Copy Revised Text**).
2. Open `sample/editorial-output.md` and replace the `[TODO: ...]` placeholders with your headline, sections, verified quotes, and source links.
3. Open `sample/before-after.md` and complete the final metrics comparison table (Word Count, Passive Share, Reading Ease delta) and meaning preservation checkboxes.
4. Commit both files to version control.

