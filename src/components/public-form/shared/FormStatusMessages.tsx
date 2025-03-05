import { cn } from '@/lib/utils';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { motion } from 'framer-motion';



interface FormMessageProps {

  theme?: 'light' | 'dark';

  className?: string;

}



export function FormError({ message, theme = 'light', className }: FormMessageProps & { message: string }) {

  return (

    <motion.div

      initial={{ opacity: 0, y: -10 }}

      animate={{ opacity: 1, y: 0 }}

      className={cn(

        "p-4 rounded-lg flex items-center gap-3",

        theme === 'dark' ? "bg-red-950/50 text-red-200" : "bg-red-50 text-red-800",

        className

      )}

    >

      <AlertCircle className="h-5 w-5" />

      <p className="text-sm">{message}</p>

    </motion.div>

  );

}



export function FormSuccess({ message, theme = 'light', className }: FormMessageProps & { message: string }) {

  return (

    <motion.div

      initial={{ opacity: 0, y: -10 }}

      animate={{ opacity: 1, y: 0 }}

      className={cn(

        "p-4 rounded-lg flex items-center gap-3",

        theme === 'dark' ? "bg-green-950/50 text-green-200" : "bg-green-50 text-green-800",

        className

      )}

    >

      <CheckCircle2 className="h-5 w-5" />

      <p className="text-sm">{message}</p>

    </motion.div>

  );

}



export function FormLoading({ message, theme = 'light', className }: FormMessageProps & { message: string }) {

  return (

    <motion.div

      initial={{ opacity: 0, y: -10 }}

      animate={{ opacity: 1, y: 0 }}

      className={cn(

        "p-4 rounded-lg flex items-center gap-3",

        theme === 'dark' ? "bg-blue-950/50 text-blue-200" : "bg-blue-50 text-blue-800",

        className

      )}

    >

      <Loader2 className="h-5 w-5 animate-spin" />

      <p className="text-sm">{message}</p>

    </motion.div>

  );

} 
