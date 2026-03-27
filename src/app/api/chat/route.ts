import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { buildChatSystemPrompt } from '@/lib/prompts';
import { store } from '@/lib/store';
import { spend } from '@/lib/spend';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    if (!spend.record('chat')) {
      return NextResponse.json({ error: 'Spend cap reached ($10 testing limit). Redeploy to reset.' }, { status: 429 });
    }
    const { petId, message } = await req.json();

    const pet = store.getPet(petId);
    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    // Add user message
    store.addMessage(petId, { role: 'user', content: message });

    // Get conversation history (last 10 messages for token efficiency)
    const history = store.getMessages(petId).slice(-10);

    const systemPrompt = buildChatSystemPrompt(pet);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: history.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      })),
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Add pet response
    store.addMessage(petId, { role: 'assistant', content: text });

    return NextResponse.json({
      response: text,
      voiceId: pet.voiceId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
