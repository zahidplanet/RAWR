'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {/* Logo */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-7xl font-black tracking-tight bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
          RAWR
        </h1>
        <p className="text-gray-400 mt-2 text-lg">Every creature has something to say.</p>
      </div>

      {/* Hero illustration - thought bubble */}
      <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <div className="thought-bubble mx-auto text-center">
          <p className="text-white text-sm font-medium">
            &ldquo;Honestly? I&apos;ve been meaning to talk to you about the treat situation...&rdquo;
          </p>
        </div>
        <div className="mt-8 text-5xl">
          🐕
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-4 w-full max-w-xs animate-fade-in-up" style={{ animationDelay: '0.4s', opacity: 0 }}>
        <button
          onClick={() => router.push('/onboarding')}
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-lg text-white pulse-glow active:scale-95 transition-transform"
        >
          Meet a Pet
        </button>
        <p className="text-gray-500 text-xs">
          Point your camera at any animal to get started
        </p>
      </div>

      {/* Features preview */}
      <div className="mt-16 grid grid-cols-3 gap-6 max-w-sm animate-fade-in-up" style={{ animationDelay: '0.6s', opacity: 0 }}>
        <div className="text-center">
          <div className="text-3xl mb-2">📸</div>
          <p className="text-gray-400 text-xs">Scan any pet</p>
        </div>
        <div className="text-center">
          <div className="text-3xl mb-2">🧠</div>
          <p className="text-gray-400 text-xs">AI personality</p>
        </div>
        <div className="text-center">
          <div className="text-3xl mb-2">🗣️</div>
          <p className="text-gray-400 text-xs">Unique voice</p>
        </div>
      </div>
    </div>
  );
}
