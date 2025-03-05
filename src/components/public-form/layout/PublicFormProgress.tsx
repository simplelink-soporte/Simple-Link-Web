import { cn } from '@/lib/utils';

interface PublicFormProgressProps {
  currentStep: number;
  totalSteps: number;
  theme: 'light' | 'dark';
}

export function PublicFormProgress({ 
  currentStep, 
  totalSteps,
  theme 
}: PublicFormProgressProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-sm font-medium",
          theme === 'dark' ? "text-gray-400" : "text-gray-600"
        )}>
          Paso {currentStep + 1} de {totalSteps}
        </span>
        <span className={cn(
          "text-sm font-medium",
          theme === 'dark' ? "text-gray-400" : "text-gray-600"
        )}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className={cn(
        "h-2 rounded-full overflow-hidden",
        theme === 'dark' ? "bg-gray-800" : "bg-gray-200"
      )}>
        <div 
          className={cn(
            "h-full transition-all duration-300 ease-in-out",
            theme === 'dark' ? "bg-white" : "bg-black"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
} 