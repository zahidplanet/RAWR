# RAWR — Every Creature Has Something to Say

AR-powered pet voice app. Point your camera at any animal, give it a personality, and have a conversation.

## Stack
- **Next.js 14** — Mobile web app (App Router)
- **Claude Sonnet** — Vision (pet ID) + personality generation + chat
- **ElevenLabs** — Voice generation (optional, falls back to browser TTS)
- **Tailwind CSS** — Styling

## Quick Start

```bash
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
# Optionally add ELEVENLABS_API_KEY
npm run dev
```

Open on your phone (same network): `http://<your-ip>:3000`

## Deploy to Vercel

```bash
npx vercel deploy
```

Or push to GitHub and connect via [vercel.com/new](https://vercel.com/new).

**Environment variables to set in Vercel dashboard:**
- `ANTHROPIC_API_KEY` (required)
- `ELEVENLABS_API_KEY` (optional)

## Architecture

```
/api/identify     → Claude Vision identifies the pet
/api/personality  → Claude generates personality from quiz answers
/api/chat         → Conversational AI in the pet's character
/api/voice        → ElevenLabs TTS (or browser fallback)
```

## Cost Estimates

| Action | Cost |
|--------|------|
| Pet scan | ~$0.005 |
| Personality gen | ~$0.006 |
| Chat turn | ~$0.003 |
| Voice (ElevenLabs) | ~$0.004/turn |
| Full session | ~$0.05 |
