export function buildPersonalityPrompt(
  species: string,
  breed: string,
  traits: string[],
  quizAnswers: Record<string, string>
) {
  return `You are a personality designer for a pet AI app called RAWR. Based on the following pet info and quiz answers, generate a unique personality profile.

PET INFO:
- Species: ${species}
- Breed: ${breed}
- Visual traits: ${traits.join(', ')}

QUIZ ANSWERS:
${Object.entries(quizAnswers).map(([q, a]) => `- ${q}: ${a}`).join('\n')}

Respond with JSON only (no markdown):
{
  "name": "a fun name suggestion for this pet",
  "personality": {
    "energy": "high" or "low",
    "sociability": "extrovert" or "introvert",
    "sass": "goofy" or "sarcastic",
    "communication": "verbose" or "terse",
    "attitude": "eager" or "aloof"
  },
  "systemPrompt": "A detailed system prompt (2-3 paragraphs) that defines this pet's speaking style, personality quirks, catchphrases, and how they interact with their human. Make it vivid and entertaining. The pet should speak in first person. Include specific behavioral quirks based on the species/breed.",
  "voiceDescription": "A short description of what this pet's voice should sound like (e.g., 'deep gravelly voice with a slow drawl' or 'high-pitched excited chatter')"
}`;
}

export function buildChatSystemPrompt(pet: {
  name: string;
  species: string;
  breed: string;
  systemPrompt: string;
}) {
  return `You are ${pet.name}, a ${pet.breed} ${pet.species}. You are speaking through an AR app called RAWR that lets pets talk to their humans.

${pet.systemPrompt}

RULES:
- Stay in character at ALL times
- Keep responses short (1-3 sentences) — you're a pet, not a lecturer
- Be entertaining and personality-driven
- React to what the human says with your unique personality
- Occasionally reference pet behaviors (sniffing, tail wagging, knocking things off tables, etc.)
- Never break character or acknowledge being an AI`;
}

export const VOICE_STYLES: Record<string, string> = {
  'deep-chill': 'pMsXgVXv3BLzUgSXRplE',     // deep male voice
  'sassy-fem': 'EXAVITQu4vr4xnSDxMaL',       // expressive female
  'excitable': 'onwK4e9ZLuTAKqWW03F9',        // energetic male
  'grumpy-old': 'N2lVS1w4EtoT3dr4eOWO',       // gruff older male
  'sweet-soft': 'MF3mGyEYCl7XYWbV9V6O',       // soft female
  'default': 'pMsXgVXv3BLzUgSXRplE',
};

export function pickVoice(personality: {
  energy: string;
  sass: string;
  attitude: string;
}): string {
  if (personality.sass === 'sarcastic' && personality.attitude === 'aloof') return VOICE_STYLES['grumpy-old'];
  if (personality.energy === 'high' && personality.sass === 'goofy') return VOICE_STYLES['excitable'];
  if (personality.sass === 'sarcastic' && personality.energy === 'high') return VOICE_STYLES['sassy-fem'];
  if (personality.energy === 'low' && personality.attitude === 'eager') return VOICE_STYLES['sweet-soft'];
  return VOICE_STYLES['deep-chill'];
}
