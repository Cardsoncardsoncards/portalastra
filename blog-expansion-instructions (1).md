# Portal Astra — Blog Expansion Instructions
# Feed to Claude Code from inside the repo

You are working on Portal Astra. Repo at C:\Users\sgyim\OneDrive\Desktop\portalastra.
Run git pull origin main before starting.

Read src/lib/posts.ts IN FULL first. Understand the exact BlogPost interface — field names, types, required fields, how the body content is structured (HTML strings, markdown, or plain text). Do not assume — read the actual schema before writing a single post.

Also read one existing full post to understand the exact tone, length, and HTML structure used in the body field.

Then add ALL 22 posts below to the posts array in src/lib/posts.ts. Each post must match the exact schema of existing posts. Dates are staggered from 2026-06-12 onwards, one per day.

---

## CONTENT RULES (apply to every single post — non-negotiable)

### Length and structure
- Minimum 1,400 words per post
- H2 subheadings every 3-4 paragraphs
- End every post with a "Quick Reference" or summary section
- Categories must match existing category values exactly — check posts.ts for the exact strings used

### Brand voice
- Portal Astra tone: mystical but grounded, scientific but accessible
- Write like a knowledgeable friend who takes this seriously — not an encyclopedia, not a chatbot
- First person is fine occasionally. Contractions are fine. Directness is good.
- The reader is curious, open-minded, and moderately informed — not a complete beginner, not an expert

### Hard word bans — never use these
- No em dashes anywhere in any post
- Never use: eternal, forever, tapestry, dance, infinite, profound, realm, weave, woven, cosmic tapestry, interplay, delve, testament, multifaceted, nuanced, in conclusion, in summary, it is worth noting, it is important to note, furthermore, moreover, nevertheless, thus, hence, whilst
- Never use "journey" as a metaphor for personal growth
- Never use "navigate" as a metaphor (fine for literal navigation)
- Never start a sentence with "It is" or "There is/are" — rewrite to be active

### Sentence and paragraph rules
- Sentences under 25 words — hard limit
- Vary sentence length deliberately. Short sentences land harder. Use them.
- No paragraph longer than 4 sentences
- No bullet point lists inside the post body — write in prose only
- No numbered lists inside the post body — write in prose only

### The anti-AI-tell rules — these are the most important
These patterns immediately signal AI-generated content. Every single one must be avoided:

1. NO TRANSITIONAL SUMMARIES — never write a sentence that just restates what the previous paragraph said. AI constantly writes "Understanding X is key to Y" after explaining X. Cut it.

2. NO HOLLOW OPENERS — never open a paragraph with a sentence that contains no information. "Astrology is a fascinating subject" or "The moon has long captivated humanity" are worthless. Start with the actual information.

3. NO BALANCED BOTH-SIDES PADDING — AI reflexively adds "while some believe X, others believe Y" to appear balanced. Only include contrary views if they are genuinely relevant and specific.

4. NO VAGUE INTENSIFIERS — remove: truly, really, incredibly, remarkably, deeply, powerfully, significantly, essentially, fundamentally, ultimately, undeniably, undoubtedly. These add no meaning.

5. NO META-COMMENTARY — never write about the article itself. Never say "in this post we will explore" or "by the end of this guide you will understand." Start the content immediately.

6. NO FAKE SPECIFICITY — AI often writes "many people find that" or "studies suggest" without any actual data. Either cite a real specific thing or cut the claim.

7. NO SYMMETRICAL STRUCTURE PADDING — AI loves making every section exactly the same length. Let sections be the length they need to be. Some topics need 3 sentences. Some need 8. Match the content, not a template.

8. SPECIFIC OVER GENERAL — always. "Mercury went retrograde on April 1, 2024 and communications broke down across industries" is better than "Mercury retrograde can cause communication issues." Be concrete.

### Internal links (natural, not forced)
- Where the post discusses moon phases, mention the moon calendar on Portal Astra naturally
- Where the post discusses angel numbers or life path, mention the decoder or birth calculator
- Where the post discusses daily readings, mention the Stars tab horoscope
- Where the post discusses tarot, mention the Tarot tab
- Links should feel like a recommendation from the author, not a SEO insertion
- Maximum 3 internal link mentions per post

---

## THE 22 POSTS

### POST 1
Slug: mercury-retrograde-2026
Title: Mercury Retrograde 2026: Every Date, What It Means, and How to Navigate It
Category: Astrology
Date: 2026-06-12
Tags: mercury retrograde, astrology, planets, 2026
Cover the three Mercury retrograde periods in 2026 with specific dates. Explain what Mercury retrograde actually is astronomically. Cover communication, technology, travel, contracts. What to do and what to avoid during each period. Include a practical survival guide. This is a high-traffic seasonal search — be specific about 2026 dates.

### POST 2
Slug: moon-sign-vs-sun-sign
Title: Moon Sign vs Sun Sign: What Is the Difference and Which One Matters More?
Category: Astrology
Date: 2026-06-13
Tags: moon sign, sun sign, astrology, birth chart
Explain the difference clearly and simply. Sun sign = how you present to the world. Moon sign = your inner emotional world. How to find your moon sign. Why both matter and how they interact. Common combinations and what they mean. Link to the birth calculator on Portal Astra.

### POST 3
Slug: what-is-a-coronal-mass-ejection
Title: What Is a Coronal Mass Ejection? How Solar Storms Affect Earth
Category: Space and NASA
Date: 2026-06-14
Tags: coronal mass ejection, solar storm, space weather, NASA
Explain CMEs scientifically but accessibly. How they form on the sun. How they travel through space. What happens when they hit Earth — auroras, satellite disruption, power grid effects. Historical examples (Carrington Event). How Portal Astra's Solar tab tracks space weather. Why they matter both scientifically and energetically.

### POST 4
Slug: full-moon-ritual-guide
Title: Full Moon Ritual: A Step-by-Step Guide for Releasing and Receiving
Category: Rituals
Date: 2026-06-15
Tags: full moon ritual, moon ritual, manifestation, lunar cycle
Detailed practical ritual guide. Why the full moon is the peak release point. What to prepare. The ritual steps — space clearing, release list, burning or water ceremony, gratitude, intention for next cycle. Journal prompts. Crystals and herbs. How to track the full moon using Portal Astra. This complements the IntentionGuides premium feature.

### POST 5
Slug: manifestation-moon-phases
Title: How to Use Moon Phases for Manifestation: A Complete Lunar Cycle Guide
Category: Moon
Date: 2026-06-16
Tags: manifestation, moon phases, lunar cycle, new moon, full moon
Walk through all 8 moon phases and exactly what to manifest or release in each. New moon for planting intentions. Waxing crescent for taking action. First quarter for pushing through resistance. Waxing gibbous for refining. Full moon for receiving and releasing. Waning phases for letting go and resting. Practical action for each phase. Link to the moon calendar.

### POST 6
Slug: what-is-my-life-path-number
Title: What Is My Life Path Number? How to Calculate Yours and What It Means
Category: Angel Numbers
Date: 2026-06-17
Tags: life path number, numerology, angel numbers, birth date
Explain what a life path number is. Step-by-step calculation guide with examples. What each number 1-9 means as a life path. Master numbers 11, 22, 33 and their special significance. How it differs from your angel number. Link to the birth calculator on Portal Astra.

### POST 7
Slug: supermoon-meaning-astrology
Title: What Is a Supermoon? The Science and Spiritual Meaning Explained
Category: Moon
Date: 2026-06-18
Tags: supermoon, full moon, moon phases, astrology, astronomy
Explain what a supermoon is scientifically — perigee, orbital mechanics, how much closer and brighter it is. Upcoming supermoon dates. The energetic and astrological significance — why feelings and intuition are amplified. How to work with supermoon energy. What to do on a supermoon night. How Portal Astra eclipse alerts work.

### POST 8
Slug: aries-zodiac-sign-complete-guide
Title: Aries Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-19
Tags: aries, zodiac, astrology, star sign
Comprehensive Aries guide. Dates, ruling planet Mars, element fire. Core personality traits — both strengths and shadows. Love and relationships — best and challenging matches. Career and ambition. Aries season energy for all signs. Famous Aries. How the daily horoscope on Portal Astra applies to Aries energy.

### POST 9
Slug: taurus-zodiac-sign-complete-guide
Title: Taurus Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-20
Tags: taurus, zodiac, astrology, star sign
Same structure as Aries. Taurus dates, Venus ruling planet, earth element. Sensual, stubborn, loyal. Love compatibility. Career strengths. Taurus season themes. Famous Taurus. Portal Astra horoscope tie-in.

### POST 10
Slug: gemini-zodiac-sign-complete-guide
Title: Gemini Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-21
Tags: gemini, zodiac, astrology, star sign
Same structure. Gemini dates, Mercury ruling, air element. Duality, curiosity, communication. Love and social life. Career in ideas and words. Gemini season. Famous Geminis.

### POST 11
Slug: cancer-zodiac-sign-complete-guide
Title: Cancer Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-22
Tags: cancer, zodiac, astrology, star sign
Same structure. Cancer dates, Moon ruling, water element. Emotional depth, home, family, intuition. Love compatibility. Career in nurturing roles. Cancer season and the solstice connection.

### POST 12
Slug: leo-zodiac-sign-complete-guide
Title: Leo Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-23
Tags: leo, zodiac, astrology, star sign
Same structure. Leo dates, Sun ruling, fire element. Confidence, creativity, leadership, generosity. Love and drama. Career in performance and leadership. Leo season.

### POST 13
Slug: virgo-zodiac-sign-complete-guide
Title: Virgo Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-24
Tags: virgo, zodiac, astrology, star sign
Same structure. Virgo dates, Mercury ruling, earth element. Analysis, service, perfectionism, health. Love compatibility. Career in detail-oriented work. Virgo season.

### POST 14
Slug: libra-zodiac-sign-complete-guide
Title: Libra Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-25
Tags: libra, zodiac, astrology, star sign
Same structure. Libra dates, Venus ruling, air element. Balance, beauty, relationships, justice. Love and partnership focus. Career in arts and law. Libra season.

### POST 15
Slug: scorpio-zodiac-sign-complete-guide
Title: Scorpio Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-26
Tags: scorpio, zodiac, astrology, star sign
Same structure. Scorpio dates, Pluto ruling, water element. Intensity, transformation, secrets, power. Love depth. Career in research and power. Scorpio season.

### POST 16
Slug: sagittarius-zodiac-sign-complete-guide
Title: Sagittarius Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-27
Tags: sagittarius, zodiac, astrology, star sign
Same structure. Sagittarius dates, Jupiter ruling, fire element. Adventure, philosophy, freedom, optimism. Love and travel. Career in exploration and teaching. Sagittarius season.

### POST 17
Slug: capricorn-zodiac-sign-complete-guide
Title: Capricorn Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-28
Tags: capricorn, zodiac, astrology, star sign
Same structure. Capricorn dates, Saturn ruling, earth element. Ambition, discipline, structure, legacy. Love and loyalty. Career in business and authority. Capricorn season.

### POST 18
Slug: aquarius-zodiac-sign-complete-guide
Title: Aquarius Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-29
Tags: aquarius, zodiac, astrology, star sign
Same structure. Aquarius dates, Uranus ruling, air element. Innovation, rebellion, humanity, detachment. Love and friendship. Career in technology and social change. Aquarius season.

### POST 19
Slug: pisces-zodiac-sign-complete-guide
Title: Pisces Zodiac Sign: Complete Guide to Personality, Love, Career, and Compatibility
Category: Astrology
Date: 2026-06-30
Tags: pisces, zodiac, astrology, star sign
Same structure. Pisces dates, Neptune ruling, water element. Spirituality, empathy, creativity, escapism. Love and soul connections. Career in arts and healing. Pisces season.

### POST 20
Slug: new-moon-ritual-guide
Title: New Moon Ritual: How to Set Intentions and Plant Seeds for the Month Ahead
Category: Rituals
Date: 2026-07-01
Tags: new moon ritual, moon ritual, intention setting, manifestation
Companion to the full moon ritual post. Why the new moon is the most powerful intention-setting time. What darkness means energetically. Step-by-step ritual. Writing intentions by candlelight. Bay leaf burning. What not to do on a new moon. Journal prompts for each phase. Link to intention guides premium feature on Portal Astra.

### POST 21
Slug: kp-index-explained
Title: What Is the KP Index? How to Read Space Weather and Why It Matters
Category: Space and NASA
Date: 2026-07-02
Tags: KP index, space weather, geomagnetic storm, aurora, solar activity
Explain the KP index from 0 to 9. What each level means — quiet, unsettled, storm, severe, extreme. How it is measured. What causes geomagnetic activity. Aurora viewing thresholds by latitude. How KP affects satellites, radio, and power. The spiritual and energetic interpretation of high KP days. How to read it on Portal Astra's Solar tab.

### POST 22
Slug: near-earth-objects-explained
Title: Near Earth Objects: What Are Asteroids and Why Does NASA Track Them?
Category: Space and NASA
Date: 2026-07-03
Tags: near earth objects, asteroids, NASA, space, planetary defence
What are NEOs — asteroids and comets. How close is close? The Torino scale explained. How NASA tracks them with ATLAS, NEOWISE, Spaceguard. Famous close approaches and historical impacts. Planetary defence — what humanity would actually do. Potentially hazardous asteroid definition. How to read the NEO tracker on Portal Astra.

---

## AFTER WRITING ALL 22 POSTS

1. Run: npx tsc --noEmit
2. Run: npm run build
3. If build passes:
   git add src/lib/posts.ts
   git commit -m "feat: 22 new blog posts — zodiac guides, moon rituals, space explainers, astrology topics"
   git push origin main
4. Report the commit hash
5. Report the total post count in posts.ts after the addition
6. Report any posts that were skipped or had schema conflicts

## RULES
- Read posts.ts schema fully before writing any post
- Match the exact field names, types, and body format of existing posts
- Do not modify any existing posts
- If any slug already exists in posts.ts, skip that post and report it
- Do not commit if tsc or build fails
- If the body field uses a different format than HTML (e.g. markdown or JSX), match that format exactly
- Stop and ask if you are unsure about the schema after reading posts.ts
