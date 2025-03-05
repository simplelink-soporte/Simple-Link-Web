import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SuccessMessageProps {
  message: string
}

export function SuccessMessage({ message }: SuccessMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 15,
        mass: 0.1
      }}
      className={cn(
        "flex items-center justify-center",
        "h-[120px]"
      )}
    >
      <motion.p
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: 0.1
        }}
        className="text-sm font-medium text-gray-900"
      >
        {message}
      </motion.p>
    </motion.div>
  )
} 