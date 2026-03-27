import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { buildPersonalityPrompt, pickVoice } from '@/lib/prompts';
import { spend } from '@/lib/spend';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    if (!spend.record('personality')) {
      return NextResponse.json({ error: 'Spend cap reached ($10 testing limit). Redeploy to reset.' }, { status: 429 });
    }

    const { species, breed, traits, quizAnswers } = await req.json();

    const prompt = buildPersonalityPrompt(species, breed, traits, quizAnswers);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = JSON.parse(text);

    const voiceId = pickVoice(result.personality);
    const petId = crypto.randomUUID();

    // Return everything the client needs to store locally
    return NextResponse.json({
      petId,
      name: result.name,
      species,
      breed,
      traits,
      personality: result.personality,
      systemPrompt: result.systemPrompt,
      voiceId,
      voiceDescription: result.voiceDescription,
    });
  } catch (error) {
    console.error('Personality error:', error);
    return NextResponse.json(
      { error: 'Failed to generate personality' },
      { status: 500 }
    );
  }
}
