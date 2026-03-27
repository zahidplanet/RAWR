'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#0F0A1A]">
      <div className="text-5xl mb-4">🐾</div>
      <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-xs">
        {error.message || 'An unexpected error occurred. Try again!'}
      </p>
      <div className="space-y-3">
        <button
          onClick={reset}
          className="block w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-white active:scale-95 transition-transform"
        >
          Try Again
        </button>
        <a
          href="/"
          className="block text-purple-400 text-sm underline"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
