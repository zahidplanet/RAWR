# RAWR — Product Requirements Document

**Version:** 0.1 (Draft)
**Date:** March 25, 2026
**Author:** Z / PlanetZ

---

## 1. Product Vision

RAWR is a mobile-first AR app that gives pets a voice. Point your camera at any animal, onboard them with a quick personality quiz, and RAWR generates a unique voice and personality that "speaks" through AR thought bubbles. Over time, the personality fine-tunes itself based on interactions — playing on confirmation bias and the pure entertainment of hearing your dog roast you.

**One-liner:** *"Your pet has something to say."*

---

## 2. Problem Statement

Pet owners already anthropomorphize their animals constantly. There's no product that does this well — existing "talking pet" apps are gimmicky filters with canned audio. RAWR is different: it uses real AI vision to understand what it's looking at, generates a contextual personality, and speaks with a unique voice that belongs to *that* pet. It's part entertainment, part emotional companion, part viral content machine.

---

## 3. Target Users

**Primary:** Pet owners ages 18–35 who are active on social media (TikTok, Instagram Reels). They already post pet content and would share clips of their pet "talking."

**Secondary:** Anyone who encounters animals — dog park visitors, cat café regulars, people who narrate their pet's inner monologue in their head already.

**Tertiary:** The lonely/sad use case (from the original flower-sending insight) — people who want emotional comfort from a warm, familiar voice attached to their pet.

---

## 4. Core User Flows

### 4.1 Onboarding a New Pet

1. User opens RAWR, taps "Meet a Pet"
2. Camera activates — user points at their pet
3. Claude Vision identifies the animal (species, breed if possible, physical traits)
4. App presents 4–5 personality quiz questions (see §5)
5. Claude generates a personality profile + name suggestion
6. ElevenLabs generates a unique voice clone/style for this pet
7. Pet is saved to the user's "Pack" (pet roster)

### 4.2 Talking to Your Pet (Core Loop)

1. User opens camera or selects a pet from their Pack
2. AR overlay shows the pet with a thought bubble
3. User speaks or taps to prompt the pet
4. Claude generates a response in-character
5. ElevenLabs renders the voice
6. Thought bubble animates with the text; audio plays
7. Conversation continues in real-time

### 4.3 Wild Encounter Mode (Pokémon GO style)

1. User is out in the world, camera open
2. Points at a random animal (pigeon, squirrel, stranger's dog)
3. RAWR auto-generates a quick personality and voice
4. One-shot conversation — funny, contextual, ephemeral
5. User can "catch" (save) the personality if they like it

---

## 5. Personality Quiz Design

The quiz is short (4–5 questions), visually engaging, and designed to feel like a BuzzFeed personality test — not a form. Each question is a forced-choice between two options presented as visual cards.

**Example Questions:**

| # | Question | Option A | Option B |
|---|----------|----------|----------|
| 1 | "Your pet sees a stranger at the door. They..." | "Lose their mind with joy" | "Judge silently from across the room" |
| 2 | "It's 3 AM. Your pet is..." | "Zooming around the house" | "Dead asleep, snoring" |
| 3 | "Your pet's energy at the park is..." | "Golden retriever energy" | "Too cool for this" |
| 4 | "If your pet could text you, the vibe would be..." | "ALL CAPS EXCITEMENT" | "One-word replies" |
| 5 | "Your pet's relationship with food is..." | "Inhale first, ask questions never" | "Picky royalty" |

These map to personality axes: Energy (high/low), Sociability (extrovert/introvert), Sass Level (goofy/sarcastic), Communication Style (verbose/terse), Attitude (eager/aloof).

The system prompt for Claude uses these axes to generate consistent, distinct personalities.

---

## 6. Technical Architecture

### 6.1 Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) | Mobile web app, PWA-capable |
| Camera | MediaStream API + Canvas | Real-time camera feed |
| AR Overlay | CSS transforms + Canvas 2D | Thought bubbles, animations |
| AI Vision | Claude claude-sonnet-4-6 (Vision) | Pet identification, context understanding |
| AI Chat | Claude claude-sonnet-4-6 | Personality generation + conversation |
| Voice | ElevenLabs API | Text-to-speech with unique voices |
| Storage | Supabase (Postgres + Auth) | User accounts, pet profiles, conversation history |
| Hosting | Vercel | Edge deployment, serverless functions |

### 6.2 API Routes

```
POST /api/identify      — Send camera frame to Claude Vision, get pet identification
POST /api/personality    — Generate personality from quiz answers + pet ID
POST /api/chat           — Conversational turn (user message → pet response)
POST /api/voice          — Convert text to speech via ElevenLabs
GET  /api/pets           — List user's saved pets
POST /api/pets           — Save a new pet to the Pack
```

### 6.3 Data Model

```
User
├── id, email, created_at
└── pets[] → Pet
    ├── id, name, species, breed
    ├── personality_axes: { energy, sociability, sass, communication, attitude }
    ├── system_prompt: string (generated by Claude)
    ├── voice_id: string (ElevenLabs voice ID)
    ├── avatar_url: string (snapshot from camera)
    └── conversations[] → Conversation
        ├── id, created_at
        └── messages[] → Message
            ├── role: "user" | "pet"
            ├── content: string
            └── audio_url: string?
```

---

## 7. Token Usage & Cost Estimates

### 7.1 Per-Interaction Costs

| Operation | Model | Input Tokens | Output Tokens | Cost per Call |
|-----------|-------|-------------|---------------|---------------|
| Pet ID (vision) | Sonnet | ~1,500 (image + prompt) | ~200 | ~$0.005 |
| Personality Gen | Sonnet | ~800 | ~500 | ~$0.006 |
| Chat Turn | Sonnet | ~600 (system + history) | ~150 | ~$0.003 |
| Voice (ElevenLabs) | Standard | — | — | ~$0.03/1K chars (~$0.004/turn) |

### 7.2 Session Cost Breakdown

| Scenario | Actions | Estimated Cost |
|----------|---------|---------------|
| Onboarding (1 pet) | 1 vision + 1 personality gen | ~$0.011 |
| 10-turn conversation | 10 chat + 10 voice | ~$0.070 |
| Casual session (onboard + chat) | 1 vision + 1 personality + 5 chat + 5 voice | ~$0.046 |

### 7.3 Monthly Cost Projections

| Scale | DAU | Sessions/Day | Monthly Cost |
|-------|-----|-------------|-------------|
| Early beta | 100 | 300 | ~$414 |
| Growth | 1,000 | 5,000 | ~$6,900 |
| Scale | 10,000 | 50,000 | ~$69,000 |

### 7.4 Optimization Strategies

- Cache personality system prompts (generate once, reuse forever)
- Use Haiku for simple chat turns, Sonnet for vision/personality
- Batch voice generation for common phrases
- Client-side TTS fallback for non-premium users
- Conversation history windowing (last 10 messages only)

---

## 8. Monetization

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 pets, 20 chat turns/day, basic voices |
| RAWR+ | $4.99/mo | Unlimited pets, unlimited chat, premium voices, voice customization |
| RAWR Pro | $9.99/mo | Everything in +, plus: DoorDash integration (send treats/flowers), shareable video clips with voice, custom voice training |

The DoorDash/delivery integration (from the original concept) lives in Pro tier — when your pet "tells you" you look sad, it can trigger a flower/treat delivery to your location via API.

---

## 9. Viral / Growth Mechanics

- **Shareable clips**: Auto-generated short videos of pet conversations with AR overlay, optimized for TikTok/Reels
- **Wild encounters**: Scanning random animals creates shareable "Pokédex-style" cards
- **Pet personality cards**: Shareable personality breakdowns (like MBTI but for pets)
- **"My pet said WHAT"**: Highlight reel of the funniest/most unhinged things your pet's personality generated

---

## 10. Privacy & Safety

- Camera frames processed in-memory, never stored on server
- Pet photos stored only with explicit user consent
- Content moderation on generated speech (Claude's built-in safety)
- No real animal data collected — all personalities are fictional/entertainment
- COPPA compliance: 13+ age gate

---

## 11. MVP Scope (Prototype)

For the Vercel prototype, we're building:

- [x] Mobile-optimized camera UI
- [x] Onboarding quiz flow (4 questions)
- [x] Claude Vision pet identification
- [x] Personality generation from quiz results
- [x] Real-time chat with generated personality
- [x] ElevenLabs voice playback on responses
- [x] AR-style thought bubble overlay
- [ ] User auth (stubbed)
- [ ] Persistent pet storage (in-memory for prototype)
- [ ] DoorDash integration (future)
- [ ] Video clip export (future)

---

## 12. Success Metrics

| Metric | Target (90 days) |
|--------|-----------------|
| Onboarding completion rate | >70% |
| Avg. conversation length | >5 turns |
| D1 retention | >40% |
| Share rate (clips created / sessions) | >15% |
| NPS | >50 |

---

*"Every pet has a personality. RAWR just lets them tell you about it."*
