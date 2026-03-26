// In-memory store for the prototype (would be Supabase in production)

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  traits: string[];
  personality: {
    energy: 'high' | 'low';
    sociability: 'extrovert' | 'introvert';
    sass: 'goofy' | 'sarcastic';
    communication: 'verbose' | 'terse';
    attitude: 'eager' | 'aloof';
  };
  systemPrompt: string;
  voiceId: string;
  avatarDataUrl?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
}

// Singleton store
class Store {
  pets: Pet[] = [];
  conversations: Map<string, Message[]> = new Map();

  addPet(pet: Pet) {
    this.pets.push(pet);
    this.conversations.set(pet.id, []);
  }

  getPet(id: string) {
    return this.pets.find(p => p.id === id);
  }

  getMessages(petId: string) {
    return this.conversations.get(petId) || [];
  }

  addMessage(petId: string, message: Message) {
    const msgs = this.conversations.get(petId) || [];
    msgs.push(message);
    this.conversations.set(petId, msgs);
  }
}

// Global singleton (persists across API calls in dev)
const globalStore = globalThis as unknown as { __store: Store };
if (!globalStore.__store) {
  globalStore.__store = new Store();
}

export const store = globalStore.__store;
