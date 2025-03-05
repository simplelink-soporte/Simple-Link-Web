import { motion } from "framer-motion"

import { IconChevronDown } from "@tabler/icons-react"

import { cn } from "@/lib/utils"



interface AccordionItemProps {

  title: string

  isOpen: boolean

  onToggle: () => void

  children: React.ReactNode

}



export function AccordionItem({ 

  title, 

  isOpen, 

  onToggle, 

  children 

}: AccordionItemProps) {

  return (

    <div className="border rounded-lg overflow-hidden">

      <button

        onClick={onToggle}

        className={cn(

          "w-full px-4 py-3 flex items-center justify-between",

          "text-sm font-medium text-gray-900",

          "hover:bg-gray-50 transition-colors"

        )}

      >

        {title}

        <motion.div

          animate={{ rotate: isOpen ? 180 : 0 }}

          transition={{ duration: 0.2 }}

        >

          <IconChevronDown className="h-4 w-4 text-gray-500" />

        </motion.div>

      </button>



      <motion.div

        initial={false}

        animate={{

          height: isOpen ? "auto" : 0,

          opacity: isOpen ? 1 : 0

        }}

        transition={{

          height: {

            duration: 0.3,

            ease: "easeInOut"

          },

          opacity: {

            duration: 0.2,

            ease: "easeInOut"

          }

        }}

        className="overflow-hidden"

      >

        <div className={cn(

          "px-4 pb-4",

          isOpen ? "animate-in fade-in-50" : "animate-out fade-out-50"

        )}>

          {children}

        </div>

      </motion.div>

    </div>

  )

} 
