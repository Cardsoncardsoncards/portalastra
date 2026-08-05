# Portal Astra — Blog QA Audit, Rewrite, and Roundtable Review
# Run from inside the repo: C:\Users\sgyim\OneDrive\Desktop\portalastra

You are working on Portal Astra. Run git pull origin main before starting.

Read src/lib/posts.ts IN FULL before doing anything else.

---

## PHASE 1 — QA AUDIT AND REWRITE

Go through every single post in the posts array. For each post, scan the body text and fix every instance of the following issues. Rewrite in place. Do not change the slug, title, date, category, or any other field. Only fix the body text.

### THE ONE ABSOLUTE RULE — NO DASHES OF ANY KIND

This is the most important rule. It overrides everything else.

Remove every single dash from every post body. This means:
- Em dash: — (unicode U+2014)
- En dash: – (unicode U+2013)  
- Hyphen used as a dash: two hyphens -- used as punctuation
- Dashes used as parenthetical brackets: word — aside — word
- Dashes used for emphasis: this is important — very important
- Dashes used as list separators: Fire signs — Aries, Leo, Sagittarius — are...

Replace every dash with one of these alternatives depending on context:
- Parenthetical aside: use a comma instead. "word, aside, word" or restructure into two sentences
- Emphasis: rewrite the sentence so the emphasis comes from word order, not punctuation
- List separator mid-sentence: move the list to the start or end of the sentence. "Aries, Leo, and Sagittarius are the fire signs" not "Fire signs — Aries, Leo, Sagittarius — are..."
- Connecting two clauses: use a comma, a semicolon, or split into two sentences

NEVER use a dash in any replacement. If your rewrite instinctively includes a dash, stop and rewrite again without one.

Hyphens in compound words are fine: well-known, long-term, self-aware. Only remove dashes used as punctuation.

### OTHER REWRITE RULES

**Quadruple parallel structure:** When four or more consecutive sentences share identical grammatical construction, rewrite at least two of them to break the pattern. The zodiac element paragraph is the primary example. "Fire signs are X. Earth signs are Y. Air signs are Z. Water signs are W" must be broken up. Vary the sentence length and structure.

**Adjective dumping:** When four or more adjectives appear in a comma-separated list describing one thing, cut it to two. Pick the two most specific and concrete. "energetic, enthusiastic, driven, and spontaneous" becomes "driven and quick to act."

**Hollow openers:** If a paragraph opens with a sentence that contains no actual information (restates the heading, or says something like "Aries is a fascinating sign" or "Understanding Aries is key to understanding yourself"), delete that sentence and start with the next one.

**Transitional summaries:** If a sentence just restates what the paragraph above it said, delete it.

**Banned words:** Remove any instance of these words and rewrite the sentence without them: eternal, forever, tapestry, dance, infinite, profound, realm, weave, woven, interplay, delve, testament, multifaceted, nuanced, in conclusion, in summary, it is worth noting, furthermore, moreover, nevertheless, thus, hence, whilst, journey (used as personal growth metaphor), navigate (used as life metaphor).

**Sentences over 25 words:** Split them. No exceptions.

---

## PHASE 2 — 10-PERSON ROUNDTABLE REVIEW PER POST

After completing all rewrites and saving the updated posts.ts, run a roundtable review for every post.

For each post, produce a structured review from 10 different perspectives. Output the reviews as a markdown file at: blog-roundtable-reviews.md in the repo root.

The 10 reviewers and what they assess:

1. GENERAL READER: Is this actually interesting to read? Does it hold attention? Where did it lose you?
2. SEO SPECIALIST: Does the title match what people search? Are the right keywords used naturally in the first 100 words? Does it have enough specific information to rank?
3. ASTROLOGY ENTHUSIAST: Is the information accurate? Is anything oversimplified to the point of being wrong? What is missing that a knowledgeable reader would expect?
4. COMPLETE BEGINNER: Is anything assumed without explanation? What terms are used without definition?
5. SCEPTIC: Does any claim seem unsupported or vague? Where does the post say "many people believe" without saying why?
6. MOBILE READER: Are paragraphs short enough to scan on a phone? Is there enough visual structure from H2s?
7. FIRST-TIME SITE VISITOR: Does this post make me want to explore Portal Astra? Is the internal link to the site natural or forced?
8. EXISTING SUBSCRIBER: Does this add anything I do not already know from the weekly digest or the site itself?
9. CONVERSION REVIEWER: Does this post create any reason to check out Astra Premium? Is there a natural moment to mention premium features?
10. COPY EDITOR: Any grammar errors, repeated words, awkward phrasing, or sentences that do not scan well when read aloud?

For each reviewer, output:
- One sentence overall verdict
- Up to 3 specific line-level issues with the exact quoted text and a suggested fix
- A score out of 10

Format for each post in blog-roundtable-reviews.md:

---
## [Post title]
Slug: [slug]

### 1. General Reader — [score]/10
Verdict: [one sentence]
Issues:
- "[exact quote]" → [suggested fix]

### 2. SEO Specialist — [score]/10
...and so on for all 10 reviewers

Overall post score: [average of 10 scores]/10
Priority fixes: [list the 1-3 most important changes across all reviewers]
---

After all 33 posts are reviewed, add a summary section at the top of blog-roundtable-reviews.md:

## Summary
- Total posts reviewed: 33
- Average score across all posts: X/10
- Top 5 posts by score
- Bottom 5 posts by score (prioritise these for manual rewrite)
- Most common issue across all posts
- Recommended next content gaps based on SEO reviewer findings

---

## PHASE 3 — COMMIT

After Phase 1 rewrites and Phase 2 review file are both complete:

1. Run: npx tsc --noEmit
2. Run: npm run build
3. Run: git add src/lib/posts.ts blog-roundtable-reviews.md
4. Run: git commit -m "fix: blog QA rewrite — remove all dashes, fix parallel structure, anti-AI-tell pass; add roundtable reviews"
5. Run: git push origin main
6. Report the commit hash
7. Report: how many dash instances were removed across all posts
8. Report: the 5 lowest-scoring posts from the roundtable so they can be prioritised for manual review

---

## RULES

- No dashes of any kind in any rewrite. If you catch yourself writing a dash, stop and rewrite without one.
- Do not change post slugs, titles, dates, categories, or tags
- Do not add new content to posts — only fix existing content
- Do not shorten posts — if you remove a sentence, replace it with a better one of similar length
- The roundtable reviews are your genuine critical assessment — do not inflate scores. A post that has real problems should score 5 or 6, not 8.
- If a post scores below 6 on average, flag it clearly in the summary as needing a full manual rewrite
- Do not commit if tsc or build fails
