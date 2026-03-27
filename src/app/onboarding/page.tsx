'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { savePet } from '@/lib/client-store';

const QUIZ_QUESTIONS = [
  {
    question: "Your pet sees a stranger at the door. They...",
    optionA: "Lose their mind with joy",
    optionB: "Judge silently from across the room",
    axis: "sociability",
  },
  {
    question: "It's 3 AM. Your pet is...",
    optionA: "Zooming around the house",
    optionB: "Dead asleep, snoring",
    axis: "energy",
  },
  {
    question: "If your pet could text you, the vibe would be...",
    optionA: "ALL CAPS EXCITEMENT",
    optionB: "One-word replies",
    axis: "communication",
  },
  {
    question: "Your pet's sense of humor is...",
    optionA: "Class clown, total goofball",
    optionB: "Dry wit, deadpan delivery",
    axis: "sass",
  },
];

type Step = 'camera' | 'scanning' | 'quiz' | 'generating' | 'result';

interface PetResult {
  petId: string;
  name: string;
  personality: Record<string, string>;
  systemPrompt: string;
  voiceId: string;
}

export default function Onboarding() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>('camera');
  const [petInfo, setPetInfo] = useState<{ species: string; breed: string; traits: string[] } | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>('');
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PetResult | null>(null);
  const [error, setError] = useState('');

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError('Camera access is required. Please allow camera permissions.');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [startCamera]);

  // Capture frame and identify
  const captureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setAvatarDataUrl(dataUrl);
    setStep('scanning');
    setError('');

    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const data = await res.json();

      if (data.species === 'unknown' || data.confidence === 'none') {
        setError('No animal detected! Try pointing at a pet.');
        setStep('camera');
        return;
      }

      setPetInfo(data);
      setStep('quiz');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan. Try again!');
      setStep('camera');
    }
  };

  // Handle quiz answer
  const handleQuizAnswer = async (answer: string) => {
    const currentQ = QUIZ_QUESTIONS[quizStep];
    const newAnswers = { ...quizAnswers, [currentQ.question]: answer };
    setQuizAnswers(newAnswers);

    if (quizStep < QUIZ_QUESTIONS.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      // Generate personality
      setStep('generating');
      setError('');

      try {
        const res = await fetch('/api/personality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            species: petInfo?.species,
            breed: petInfo?.breed,
            traits: petInfo?.traits,
            quizAnswers: newAnswers,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server error (${res.status})`);
        }

        const data = await res.json();

        if (!data.petId || !data.name) {
          throw new Error('Invalid response from personality generator');
        }

        // Save pet to localStorage for chat page
        savePet({
          id: data.petId,
          name: data.name,
          species: petInfo?.species || '',
          breed: petInfo?.breed || '',
          traits: petInfo?.traits || [],
          personality: data.personality,
          systemPrompt: data.systemPrompt,
          voiceId: data.voiceId,
          avatarDataUrl,
        });

        setResult(data);
        setStep('result');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate personality. Try again!');
        setStep('quiz');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between z-20 relative">
        <button onClick={() => router.push('/')} className="text-gray-400 text-sm">
          &larr; Back
        </button>
        <span className="text-purple-400 font-bold text-sm">RAWR</span>
        <div className="w-12" />
      </div>

      {error && (
        <div className="mx-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* CAMERA STEP */}
      {(step === 'camera' || step === 'scanning') && (
        <div className="flex-1 relative viewfinder">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {step === 'scanning' && <div className="scan-line" />}

          <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 z-20">
            {step === 'scanning' ? (
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Scanning...</p>
              </div>
            ) : (
              <>
                <p className="text-white/70 text-sm mb-4">Point at a pet and tap to scan</p>
                <button
                  onClick={captureAndIdentify}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* QUIZ STEP */}
      {step === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="mb-8 text-center animate-fade-in-up">
            <div className="text-4xl mb-2">
              {petInfo?.species === 'cat' ? '\uD83D\uDC31' : petInfo?.species === 'bird' ? '\uD83D\uDC26' : '\uD83D\uDC15'}
            </div>
            <p className="text-purple-300 font-medium">
              {petInfo?.breed} {petInfo?.species} detected!
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Let&apos;s figure out their personality
            </p>
          </div>

          <div className="flex gap-2 mb-8">
            {QUIZ_QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1 w-12 rounded-full transition-colors ${
                  i <= quizStep ? 'bg-purple-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          <div className="w-full max-w-sm animate-fade-in-up" key={quizStep}>
            <h2 className="text-xl font-bold text-center mb-8">
              {QUIZ_QUESTIONS[quizStep].question}
            </h2>

            <div className="space-y-4">
              <button
                onClick={() => handleQuizAnswer(QUIZ_QUESTIONS[quizStep].optionA)}
                className="quiz-option w-full p-5 rounded-2xl border-2 border-gray-700 text-left hover:border-purple-500 hover:bg-purple-500/10 transition-colors"
              >
                <span className="text-2xl mr-3">A</span>
                <span className="text-white font-medium">{QUIZ_QUESTIONS[quizStep].optionA}</span>
              </button>

              <button
                onClick={() => handleQuizAnswer(QUIZ_QUESTIONS[quizStep].optionB)}
                className="quiz-option w-full p-5 rounded-2xl border-2 border-gray-700 text-left hover:border-pink-500 hover:bg-pink-500/10 transition-colors"
              >
                <span className="text-2xl mr-3">B</span>
                <span className="text-white font-medium">{QUIZ_QUESTIONS[quizStep].optionB}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATING STEP */}
      {step === 'generating' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-xl font-bold mb-2">Generating personality...</h2>
          <p className="text-gray-400 text-sm">Creating a unique voice for your pet</p>
        </div>
      )}

      {/* RESULT STEP */}
      {step === 'result' && result && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in-up">
          <div className="text-6xl mb-4">
            {petInfo?.species === 'cat' ? '\uD83D\uDC31' : petInfo?.species === 'bird' ? '\uD83D\uDC26' : '\uD83D\uDC15'}
          </div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            {result.name}
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            {petInfo?.breed} {petInfo?.species}
          </p>

          <div className="w-full max-w-xs space-y-3 mb-8">
            {Object.entries(result.personality).map(([axis, value]) => (
              <div key={axis} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm capitalize">{axis}</span>
                <span className="text-purple-300 text-sm font-medium capitalize">{value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push(`/chat?petId=${result.petId}`)}
            className="w-full max-w-xs py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-lg text-white active:scale-95 transition-transform pulse-glow"
          >
            Start Talking 🎙️
          </button>
        </div>
      )}
    </div>
  );
}
