import { cn } from '@/lib/utils';

interface PublicFormHeaderProps {
  title: string;
  description?: string;
  theme: 'light' | 'dark';
}

export function PublicFormHeader({ 
  title, 
  description,
  theme 
}: PublicFormHeaderProps) {
  return (
    <header className={cn(
      "py-8 border-b transition-colors",
      theme === 'dark' 
        ? "border-gray-800 bg-gray-950" 
        : "border-gray-200 bg-white"
    )}>
      <div className="container max-w-2xl mx-auto px-4">
        <div className="text-center space-y-2">
          <h1 className={cn(
            "text-2xl font-semibold",
            theme === 'dark' ? "text-white" : "text-gray-900"
          )}>
            {title}
          </h1>
          {description && (
            <p className={cn(
              "text-sm",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              {description}
            </p>
          )}
        </div>
      </div>
    </header>
  );
} 