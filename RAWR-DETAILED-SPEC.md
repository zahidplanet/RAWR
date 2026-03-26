# RAWR — Detailed Technical Spec & Product Map

**For: Claude Code Implementation Handoff**
**Version:** 0.2
**Date:** March 25, 2026
**Prototype repo:** `rawr-app` (push to GitHub, deploy via Vercel)

---

## 0. Quick Context

RAWR is an AR + AI + Voice app that gives any animal a personality and voice. User points camera → AI identifies the animal → short personality quiz → generates a unique character with voice → real-time conversation with AR thought bubbles and voice playback. Think Pokémon GO meets AI companionship.

The prototype is built and compiles. This doc maps out everything needed to go from prototype → production.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   CLIENT (Next.js)              │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Camera   │  │ Onboard  │  │  Chat +      │  │
│  │ Scanner  │  │ Quiz     │  │  Voice UI    │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │          │
├───────┼──────────────┼───────────────┼──────────┤
│       │         API LAYER            │          │
│  ┌────▼─────┐  ┌────▼─────┐  ┌──────▼───────┐  │
│  │/identify │  │/personal │  │  /chat       │  │
│  │ (Vision) │  │  ity     │  │  /voice      │  │
│  └────┬─────┘  └────┬─────┘  └──┬────┬──────┘  │
├───────┼──────────────┼───────────┼────┼──────────┤
│       │         SERVICES         │    │          │
│  ┌────▼──────────────▼───────────▼┐ ┌─▼────────┐│
│  │      Claude API (Anthropic)    │ │ElevenLabs││
│  │  • Vision (pet ID)             │ │  • TTS   ││
│  │  • Personality gen             │ │  • Voice ││
│  │  • Conversational chat         │ │   clone  ││
│  └────────────────┬───────────────┘ └──────────┘│
│                   │                              │
│  ┌────────────────▼───────────────────────────┐  │
│  │         Supabase (Production)              │  │
│  │  • Auth  • Pet profiles  • Conversations   │  │
│  │  • Voice cache  • User preferences         │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 2. File Structure (Current Prototype)

```
rawr-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout, viewport meta
│   │   ├── page.tsx            # Landing page ("Meet a Pet")
│   │   ├── globals.css         # All styles (thought bubbles, animations, AR)
│   │   ├── onboarding/
│   │   │   └── page.tsx        # Camera → Scan → Quiz → Result flow
│   │   ├── chat/
│   │   │   └── page.tsx        # Real-time chat with voice playback
│   │   └── api/
│   │       ├── identify/route.ts    # Claude Vision: identify pet from frame
│   │       ├── personality/route.ts # Claude: generate personality from quiz
│   │       ├── chat/route.ts        # Claude: in-character conversation
│   │       └── voice/route.ts       # ElevenLabs TTS (fallback: browser)
│   ├── lib/
│   │   ├── store.ts            # In-memory store (replace w/ Supabase)
│   │   └── prompts.ts          # System prompts, voice mapping
│   └── types/
│       └── speech.d.ts         # SpeechRecognition type defs
├── .env.example
├── vercel.json
├── package.json
└── tsconfig.json
```

---

## 3. Product Map — Build Phases

### Phase 1: PROTOTYPE (✅ DONE)
What's built and working:
- [x] Landing page with branding
- [x] Camera capture with MediaStream API
- [x] Claude Vision pet identification (species, breed, traits)
- [x] 4-question personality quiz (binary forced-choice)
- [x] Personality generation via Claude (maps to 5 axes)
- [x] Voice selection based on personality axes
- [x] Real-time chat in pet's character
- [x] ElevenLabs TTS with browser fallback
- [x] Speech-to-text input (Web Speech API)
- [x] AR-style thought bubbles and message UI
- [x] Mobile-optimized responsive design
- [x] Vercel-ready with build passing

### Phase 2: PERSISTENCE & AUTH
Priority: **HIGH** — Required for any real usage

| Task | Details | Effort |
|------|---------|--------|
| Supabase setup | Create project, configure auth, RLS policies | 2hr |
| Auth flow | Email/Google sign-in, session management | 4hr |
| Pet persistence | Save pets to Supabase with personality + voice config | 3hr |
| Conversation history | Store messages, load on return | 3hr |
| Pet roster ("Pack") | List view of saved pets, tap to resume chat | 3hr |
| Avatar storage | Save camera snapshots to Supabase Storage | 2hr |

**Database schema (Supabase SQL):**

```sql
-- Users (handled by Supabase Auth)

create table pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  traits text[] default '{}',
  personality jsonb not null,
  -- { energy, sociability, sass, communication, attitude }
  system_prompt text not null,
  voice_id text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references pets(id) on delete cascade,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  audio_url text,
  created_at timestamptz default now()
);

-- RLS
alter table pets enable row level security;
create policy "Users see own pets" on pets for all using (auth.uid() = user_id);

alter table conversations enable row level security;
create policy "Users see own convos" on conversations for all
  using (pet_id in (select id from pets where user_id = auth.uid()));

alter table messages enable row level security;
create policy "Users see own messages" on messages for all
  using (conversation_id in (
    select c.id from conversations c
    join pets p on c.pet_id = p.id
    where p.user_id = auth.uid()
  ));
```

### Phase 3: VOICE & PERSONALITY UPGRADES
Priority: **HIGH** — Core differentiation

| Task | Details | Effort |
|------|---------|--------|
| ElevenLabs Voice Design API | Generate custom voices per pet instead of picking presets | 4hr |
| Voice cloning from sample | Let user record 30s of "how they imagine the pet sounds" | 6hr |
| Personality fine-tuning | After 20+ messages, analyze patterns and adjust system prompt | 4hr |
| Confirmation bias engine | Track what makes users laugh/engage, lean into those traits | 6hr |
| Emotional state tracking | Pet has moods that shift based on conversation context | 4hr |
| Memory system | Pet remembers past conversations, references them naturally | 4hr |

**Confirmation bias engine detail:**
```
1. Track user engagement signals:
   - Message length (longer = more engaged)
   - Response time (faster = more interested)
   - Emoji usage
   - Follow-up questions

2. After each session, Claude analyzes which personality traits
   triggered the most engagement

3. System prompt is updated with weights:
   "The user responds most positively when you: [trait list].
    Lean into these while maintaining core personality."

4. This creates a feedback loop where the pet becomes
   increasingly tailored to what the user finds entertaining
```

### Phase 4: AR EXPERIENCE
Priority: **MEDIUM** — Visual wow factor

| Task | Details | Effort |
|------|---------|--------|
| Real-time camera overlay | Show thought bubble over live video feed, not just static | 6hr |
| Face/body detection | Position thought bubble relative to pet's head | 8hr |
| AR.js or 8th Wall integration | True AR positioning with marker tracking | 12hr |
| Animated thought bubbles | Typing indicator, pop-in animations, emoji reactions | 4hr |
| Screenshot/video capture | Export AR conversation clips for social sharing | 6hr |
| AR filters | Fun overlays (crown, sunglasses, etc.) on the pet | 8hr |

### Phase 5: WILD ENCOUNTER MODE (Pokémon GO)
Priority: **MEDIUM** — Viral growth mechanic

| Task | Details | Effort |
|------|---------|--------|
| Quick-scan mode | One-tap scan of any animal, instant personality (no quiz) | 4hr |
| Encounter cards | Pokédex-style card with species, personality, quote | 4hr |
| Collection system | "Catch" wild encounters, build collection | 6hr |
| Rarity system | Some personality combinations are "rare" (e.g., sarcastic pigeon) | 4hr |
| Location tagging | Remember where you met each animal | 3hr |
| Social sharing | Export encounter card as image for Instagram/TikTok | 4hr |

### Phase 6: MONETIZATION
Priority: **HIGH** (after Phase 2)

| Task | Details | Effort |
|------|---------|--------|
| Stripe integration | Payment processing for subscriptions | 4hr |
| Free tier limits | 3 pets, 20 turns/day, basic voices only | 3hr |
| RAWR+ ($4.99/mo) | Unlimited pets, unlimited chat, premium voices | 3hr |
| RAWR Pro ($9.99/mo) | Custom voice training, video clips, delivery integration | 4hr |
| Usage tracking | Token counter, tier enforcement middleware | 4hr |
| DoorDash API integration | "Send treats" feature for Pro tier | 8hr |

**DoorDash integration concept:**
```
When the pet detects sadness or the user says they're having a bad day:

Pet: "Hey... you seem off today. Want me to send you something?
      I know a place that does amazing cookies. 🍪"

[User taps "Yes please"]

→ /api/delivery endpoint
→ DoorDash Drive API: create delivery
→ Search nearby for flowers/treats/comfort food
→ User confirms address + payment
→ Pet: "Done. Should be there in 20 minutes.
        I'd bring them myself but... you know... paws."
```

### Phase 7: SOCIAL & VIRAL
Priority: **LOW** (growth phase)

| Task | Details | Effort |
|------|---------|--------|
| Video clip export | Auto-generate TikTok/Reels of pet convos with AR overlay | 8hr |
| Pet personality cards | Shareable MBTI-style card for your pet | 4hr |
| "My pet said WHAT" feed | Community highlight reel of funniest generated responses | 6hr |
| Pet-to-pet chat | Two users' pets can talk to each other | 8hr |
| Leaderboard | Most scanned species, rarest encounters | 4hr |

---

## 4. Token & Cost Model (Detailed)

### Per-Operation Breakdown

| Operation | Model | Input | Output | $/call |
|-----------|-------|-------|--------|--------|
| Pet scan (vision) | Sonnet | ~1,500 tok (image+prompt) | ~200 tok | $0.0051 |
| Personality gen | Sonnet | ~800 tok | ~500 tok | $0.0059 |
| Chat turn | Sonnet | ~600 tok (sys+history) | ~150 tok | $0.0027 |
| Chat turn (optimized) | Haiku | ~600 tok | ~150 tok | $0.0004 |
| Voice (ElevenLabs) | Standard | ~100 chars | — | $0.0040 |
| Voice (ElevenLabs) | Turbo v2 | ~100 chars | — | $0.0060 |

### Session Cost Scenarios

| Scenario | Breakdown | Total |
|----------|-----------|-------|
| Onboard only | 1 scan + 1 personality | $0.011 |
| Quick chat (5 turns, Sonnet) | 5 chat + 5 voice | $0.034 |
| Long chat (20 turns, Sonnet) | 20 chat + 20 voice | $0.134 |
| Long chat (20 turns, Haiku) | 20 chat + 20 voice | $0.088 |
| Full session (onboard + 10 chat) | scan + personality + 10 Sonnet + 10 voice | $0.078 |

### Monthly Projections

| Scale | DAU | Avg sessions/user/day | Monthly cost | Revenue needed |
|-------|-----|-----------------------|-------------|---------------|
| Alpha | 50 | 2 | ~$234 | — |
| Beta | 500 | 2 | ~$2,340 | $2,495 (500 × $4.99) |
| Launch | 5,000 | 1.5 | ~$17,550 | $24,950 |
| Growth | 25,000 | 1.5 | ~$87,750 | $124,750 |
| Scale | 100,000 | 1 | ~$234,000 | $499,000 |

### Optimization Roadmap

1. **Haiku for simple turns** — Use Sonnet only for personality gen and first 3 messages, then downgrade to Haiku. Saves ~60% on chat costs.

2. **Prompt caching** — Cache the system prompt (personality) with Anthropic's prompt caching. Saves ~90% on system prompt tokens after first call.

3. **Conversation windowing** — Only send last 10 messages as context. Prevents token growth per turn.

4. **Voice caching** — Cache common phrases/greetings. Many pets will say similar things ("hey!", "what's up?").

5. **Client-side TTS fallback** — Free tier uses browser `SpeechSynthesis` API. Zero cost, decent quality on modern devices.

6. **Batch voice generation** — Pre-generate greeting audio during onboarding. First impression is instant.

---

## 5. Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...          # Claude API

# Optional (falls back to browser TTS)
ELEVENLABS_API_KEY=xi_...             # ElevenLabs

# Production (Phase 2+)
NEXT_PUBLIC_SUPABASE_URL=             # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=            # Supabase service role (server only)
STRIPE_SECRET_KEY=                    # Stripe (Phase 6)
STRIPE_WEBHOOK_SECRET=                # Stripe webhooks
DOORDASH_API_KEY=                     # DoorDash Drive API (Phase 6)
```

---

## 6. Claude Code Handoff Checklist

When you open this in Claude Code, here's the priority order:

```
1. cd rawr-app && npm install && npm run dev
   → Verify prototype runs locally

2. Add your ANTHROPIC_API_KEY to .env.local
   → Test the full flow: scan → quiz → chat

3. Deploy to Vercel:
   → gh repo create rawr-app --public --source=. --push
   → vercel deploy
   → Add env vars in Vercel dashboard

4. Start Phase 2 (Supabase):
   → npx supabase init
   → Run the SQL schema from this doc
   → Replace src/lib/store.ts with Supabase client

5. Start Phase 3 (Voice upgrades):
   → ElevenLabs Voice Design API for custom voices
   → Personality fine-tuning pipeline
```

---

## 7. Key Technical Decisions to Make

| Decision | Options | Recommendation |
|----------|---------|---------------|
| State management | React Context vs Zustand vs Jotai | Zustand — lightweight, works well with Next.js |
| Real-time chat | Polling vs SSE vs WebSockets | SSE via Anthropic streaming — already supported |
| AR framework | CSS overlays vs AR.js vs 8th Wall | Start with CSS overlays (done), upgrade to 8th Wall for native AR |
| Voice streaming | Full audio vs chunked streaming | ElevenLabs streaming API — sub-second latency |
| Offline support | None vs PWA vs Service Worker | PWA with offline pet roster, online-only chat |
| Analytics | None vs Posthog vs Mixpanel | Posthog (self-hostable, generous free tier) |

---

## 8. Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Claude rate limits at scale | High | Implement request queuing, fallback to Haiku, cache aggressively |
| ElevenLabs latency on mobile | Medium | Pre-generate first response during onboarding, stream subsequent |
| Camera permissions denied | Medium | Graceful fallback with upload-a-photo option |
| Generated content is inappropriate | High | Claude's built-in safety + post-generation content filter |
| Cost overrun from viral spike | High | Hard rate limits per user, circuit breaker on API spend |
| App Store rejection (if native) | Medium | Web-first strategy avoids this entirely |

---

*This doc is your single source of truth. Hand it to Claude Code and start building from Phase 2.*
