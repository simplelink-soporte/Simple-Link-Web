import { memo } from 'react';
import { cn } from '@/lib/utils';
import { SearchBar } from './SearchBar';
import { Button } from '@/components/ui/button';
import { LayoutGrid, LayoutList } from 'lucide-react';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  layout: 'list' | 'grid';
  onLayoutChange: (layout: 'list' | 'grid') => void;
  theme?: 'light' | 'dark';
  className?: string;
}

export const Toolbar = memo(function Toolbar({
  searchQuery,
  onSearchChange,
  layout,
  onLayoutChange,
  theme = 'light',
  className
}: ToolbarProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center gap-3 w-full",
      className
    )}>
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        theme={theme}
        className="flex-1"
      />
      
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant={layout === 'list' ? 'default' : 'outline'}
          onClick={() => onLayoutChange('list')}
          className={cn(
            "h-9 w-9",
            theme === 'dark' && layout !== 'list' && "border-neutral-700 hover:bg-neutral-800"
          )}
        >
          <LayoutList className="h-4 w-4" />
        </Button>
        
        <Button
          size="icon"
          variant={layout === 'grid' ? 'default' : 'outline'}
          onClick={() => onLayoutChange('grid')}
          className={cn(
            "h-9 w-9",
            theme === 'dark' && layout !== 'grid' && "border-neutral-700 hover:bg-neutral-800"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
