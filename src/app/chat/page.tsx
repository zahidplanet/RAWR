'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPet, type PetData } from '@/lib/client-store';

interface Message {
  role: 'user' | 'pet';
  content: string;
  isPlaying?: boolean;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const petId = searchParams.get('petId');

  const [pet, setPet] = useState<PetData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const hasSentGreeting = useRef(false);

  // Load pet from localStorage
  useEffect(() => {
    if (petId) {
      const petData = getPet(petId);
      if (petData) {
        setPet(petData);
      } else {
        setError('Pet not found. It may have been lost — try scanning again.');
      }
    }
  }, [petId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send the first greeting once pet is loaded
  useEffect(() => {
    if (pet && !hasSentGreeting.current) {
      hasSentGreeting.current = true;
      sendMessage("Hey! What's up?", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet]);

  const playVoice = async (text: string, voiceId: string, messageIndex: number) => {
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      });

      if (res.headers.get('content-type')?.includes('audio')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        setMessages(prev =>
          prev.map((m, i) => (i === messageIndex ? { ...m, isPlaying: true } : m))
        );

        audio.onended = () => {
          setMessages(prev =>
            prev.map((m, i) => (i === messageIndex ? { ...m, isPlaying: false } : m))
          );
          URL.revokeObjectURL(url);
        };

        await audio.play();
      } else {
        // Fallback to browser TTS
        const data = await res.json();
        if (data.fallback && typeof speechSynthesis !== 'undefined') {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
          speechSynthesis.speak(utterance);
        }
      }
    } catch {
      // Silent fallback to browser TTS
      if (typeof speechSynthesis !== 'undefined') {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
      }
    }
  };

  const sendMessage = async (text: string, isGreeting = false) => {
    if (!pet || (!text.trim() && !isGreeting)) return;

    const userMessage: Message = { role: 'user', content: text };
    if (!isGreeting) {
      setMessages(prev => [...prev, userMessage]);
    }
    setInput('');
    setIsLoading(true);
    setError('');

    // Build history for the API (excluding isPlaying metadata)
    const currentMessages = isGreeting ? [] : [...messages, userMessage];
    const history = currentMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet: {
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            systemPrompt: pet.systemPrompt,
            voiceId: pet.voiceId,
          },
          message: text,
          history,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const data = await res.json();

      if (data.response) {
        const petMessage: Message = { role: 'pet', content: data.response };
        setMessages(prev => {
          const newMessages = isGreeting ? [petMessage] : [...prev, petMessage];
          const idx = newMessages.length - 1;
          playVoice(data.response, data.voiceId, idx);
          return newMessages;
        });
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong';
      if (errMsg.includes('Spend cap')) {
        setError(errMsg);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'pet', content: "* scratches ear * Sorry, I got distracted. What were you saying?" },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Speech recognition
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionAPI = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  if (!petId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">No pet selected. <button onClick={() => router.push('/onboarding')} className="text-purple-400 underline">Go scan one!</button></p>
      </div>
    );
  }

  if (!pet && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pet && error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">😿</div>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={() => router.push('/onboarding')}
          className="py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-white"
        >
          Scan a Pet
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--rawr-dark)]">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-800 bg-[var(--rawr-dark)]/80 backdrop-blur-sm sticky top-0 z-20">
        <button onClick={() => router.push('/')} className="text-gray-400 text-sm">
          &larr; Back
        </button>
        <div className="text-center">
          <span className="text-white font-bold">{pet?.name || 'Pet'}</span>
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-400 text-xs">talking</span>
          </div>
        </div>
        <div className="w-12" />
      </div>

      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
          >
            {msg.role === 'pet' && (
              <div className="mr-2 flex-shrink-0 mt-auto">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm">
                  🐾
                </div>
              </div>
            )}
            <div className={`max-w-[75%] p-4 ${msg.role === 'user' ? 'msg-user' : 'msg-pet'}`}>
              <p className="text-white text-sm leading-relaxed">{msg.content}</p>
              {msg.isPlaying && (
                <div className="flex gap-1 mt-2">
                  <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" />
                  <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1 h-5 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="mr-2 flex-shrink-0 mt-auto">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm">
                🐾
              </div>
            </div>
            <div className="msg-pet p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-[var(--rawr-dark)] sticky bottom-0">
        <div className="flex gap-2 max-w-lg mx-auto">
          <button
            onClick={toggleListening}
            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              isListening
                ? 'bg-red-500 animate-pulse'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            🎙️
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Say something to your pet..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-5 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-transform"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
