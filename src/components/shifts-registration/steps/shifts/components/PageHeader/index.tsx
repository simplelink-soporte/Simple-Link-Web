import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  theme: 'light' | 'dark';
  title: string;
  description: string;
}

export const PageHeader = memo(({ theme, title, description }: PageHeaderProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ duration: 0.4 }} 
    className="space-y-2"
  > 
    <div className="flex items-center justify-between">
      <h1 className={cn(
        "text-2xl font-semibold",
        theme === 'dark' ? "text-white" : "text-gray-900" 
      )}> 
        {title}
      </h1>
    </div>
    
    <p className={cn(
      "text-sm",
      theme === 'dark' ? "text-gray-400" : "text-gray-500" 
    )}> 
      {description}
    </p> 
  </motion.div>
));

PageHeader.displayName = 'PageHeader';
