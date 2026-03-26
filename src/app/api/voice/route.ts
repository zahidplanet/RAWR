import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json();

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      // Return a flag so the client can use browser TTS as fallback
      return NextResponse.json({ fallback: true, text });
    }

    const voice = voiceId || 'pMsXgVXv3BLzUgSXRplE';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('ElevenLabs error:', response.status, await response.text());
      return NextResponse.json({ fallback: true, text });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Voice error:', error);
    return NextResponse.json({ fallback: true });
  }
}
