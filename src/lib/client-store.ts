// Client-side pet storage using localStorage
// Solves Vercel serverless issue where in-memory store doesn't persist across invocations

export interface PetData {
  id: string;
  name: string;
  species: string;
  breed: string;
  traits: string[];
  personality: Record<string, string>;
  systemPrompt: string;
  voiceId: string;
  avatarDataUrl?: string;
}

const STORAGE_KEY = 'rawr_pets';

export function savePet(pet: PetData): void {
  try {
    const pets = getAllPets();
    pets[pet.id] = pet;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
  } catch {
    // localStorage unavailable — silent fail
  }
}

export function getPet(id: string): PetData | null {
  try {
    const pets = getAllPets();
    return pets[id] || null;
  } catch {
    return null;
  }
}

function getAllPets(): Record<string, PetData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
