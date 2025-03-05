import { motion } from "framer-motion"
import { STEPS_CONFIG } from "../config/steps"

interface ModalHeaderProps {
  currentStep: number
  mode: 'create' | 'edit'
}

export function ModalHeader({ currentStep, mode }: ModalHeaderProps) {
  const stepConfig = STEPS_CONFIG[currentStep as keyof typeof STEPS_CONFIG]

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        delay: 0.1,
        duration: 0.3,
        ease: "easeOut"
      }}
      className="p-6 border-b"
    >
      <motion.h2 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="text-xl font-semibold"
      >
        {stepConfig.title}
      </motion.h2>
      <motion.p 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-sm text-gray-500 mt-1"
      >
        {stepConfig.description}
      </motion.p>
    </motion.div>
  )
}