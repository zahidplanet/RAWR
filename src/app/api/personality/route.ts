import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { buildPersonalityPrompt, pickVoice } from '@/lib/prompts';
import { store } from '@/lib/store';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { species, breed, traits, quizAnswers, avatarDataUrl } = await req.json();

    const prompt = buildPersonalityPrompt(species, breed, traits, quizAnswers);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = JSON.parse(text);

    const voiceId = pickVoice(result.personality);

    const pet = {
      id: crypto.randomUUID(),
      name: result.name,
      species,
      breed,
      traits,
      personality: result.personality,
      systemPrompt: result.systemPrompt,
      voiceId,
      avatarDataUrl,
    };

    store.addPet(pet);

    return NextResponse.json({
      petId: pet.id,
      name: pet.name,
      personality: pet.personality,
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
