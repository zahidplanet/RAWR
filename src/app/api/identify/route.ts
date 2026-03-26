import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mediaType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Identify the animal in this image. Respond with JSON only (no markdown):
{
  "species": "the animal species (e.g., dog, cat, bird, hamster)",
  "breed": "the breed if identifiable, or 'mixed/unknown'",
  "traits": ["list", "of", "visual", "traits", "like", "color", "size", "distinguishing features"],
  "confidence": "high/medium/low"
}

If there is no animal visible, respond with:
{"species": "unknown", "breed": "unknown", "traits": [], "confidence": "none"}`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = JSON.parse(text);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Identify error:', error);
    return NextResponse.json(
      { error: 'Failed to identify pet' },
      { status: 500 }
    );
  }
}
