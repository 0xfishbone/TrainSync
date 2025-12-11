import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface GeneratingStepProps {
  isGenerating: boolean;
}

const LOADING_MESSAGES = [
  "Analyzing your goals...",
  "Selecting exercises...",
  "Setting intensities...",
  "Calculating nutrition targets...",
  "Creating your program...",
];

export function GeneratingStep({ isGenerating }: GeneratingStepProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1200);

      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  return (
    <div className="p-6 pt-12 min-h-screen flex flex-col items-center justify-center text-center">
      <div className="mb-8">
        {/* Animated circles */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-2 border-4 border-primary/40 rounded-full animate-ping"></div>
          <div className="absolute inset-4 border-4 border-primary rounded-full animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="text-primary animate-spin" size={40} />
          </div>
        </div>

        <h1 className="text-2xl font-display font-bold mb-2">Generating Your Program</h1>
        <p className="text-secondary text-base animate-pulse">
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>

      <div className="max-w-md space-y-1 text-xs text-tertiary">
        <p>⚡ Powered by Gemini 2.0 Flash AI</p>
        <p>This may take 5-10 seconds</p>
      </div>
    </div>
  );
}
