import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { buildChatSystemPrompt } from '@/lib/prompts';
import { spend } from '@/lib/spend';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    if (!spend.record('chat')) {
      return NextResponse.json({ error: 'Spend cap reached ($10 testing limit). Redeploy to reset.' }, { status: 429 });
    }

    const { pet, message, history } = await req.json();

    if (!pet || !pet.name || !pet.systemPrompt) {
      return NextResponse.json({ error: 'Pet data required' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const systemPrompt = buildChatSystemPrompt(pet);

    // Use history from client (last 10 messages for token efficiency)
    const messages = (history || []).slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));

    // Add current user message
    messages.push({ role: 'user' as const, content: message });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

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
