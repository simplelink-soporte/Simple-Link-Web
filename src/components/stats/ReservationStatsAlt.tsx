import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ReservationStatsAltProps {
 stats: {
   future: number
   past: number
   cancelled: number
 }
}

export function ReservationStatsAlt({ stats }: ReservationStatsAltProps) {
 const total = stats.future + stats.past + stats.cancelled

 const percentages = {
   future: total > 0 ? ((stats.future / total) * 100).toFixed(1) : "0.0",
   past: total > 0 ? ((stats.past / total) * 100).toFixed(1) : "0.0",
   cancelled: total > 0 ? ((stats.cancelled / total) * 100).toFixed(1) : "0.0",
 }

 return (
   <div className="space-y-5">
     <div className="px-0.5">
       <motion.div
         className="relative h-2.5 w-full rounded-lg overflow-hidden bg-gray-100/40"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.4 }}
       >
         <motion.div
           className="absolute left-0 top-0 h-full bg-red-300/100 rounded-r-lg"
           initial={{ width: 0 }}
           animate={{ width: `calc(${percentages.cancelled}% - 2px)` }}
           transition={{ duration: 0.8, ease: "easeOut" }}
         />
         <motion.div
           className="absolute h-full bg-[#2365F1]/60 rounded-lg"
           initial={{ width: 0 }}
           animate={{
             width: `calc(${Number(percentages.past)}% - 4px)`,
             left: `calc(${Number(percentages.cancelled)}% + 2px)`,
           }}
           transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
         />
         <motion.div
           className="absolute h-full bg-[#09C4A3]/60 rounded-l-lg"
           initial={{ width: 0 }}
           animate={{
             width: `calc(${Number(percentages.future)}% - 2px)`,
             left: `calc(${Number(percentages.cancelled) + Number(percentages.past)}% + 4px)`,
           }}
           transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
         />
       </motion.div>
     </div>

     <motion.div
       className="flex justify-center w-full"
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.4, delay: 0.3 }}
     >
       <div className="grid grid-cols-3 gap-16 w-full max-w-[500px]">
         <div className="flex flex-col items-center">
           <span className="text-[12px] font-medium text-gray-400 mb-1">
             Canceladas
           </span>
           <span
             className={cn(
               "text-[14px] font-medium tabular-nums",
               stats.cancelled === 0 ? "text-gray-300" : "text-gray-600"
             )}
           >
             {stats.cancelled}
           </span>
         </div>
         <div className="flex flex-col items-center">
           <span className="text-[12px] font-medium text-gray-400 mb-1">
             Realizadas
           </span>
           <span
             className={cn(
               "text-[14px] font-medium tabular-nums",
               stats.past === 0 ? "text-gray-300" : "text-gray-600"
             )}
           >
             {stats.past}
           </span>
         </div>
         <div className="flex flex-col items-center">
           <span className="text-[12px] font-medium text-gray-400 mb-1">
             Próximas
           </span>
           <span
             className={cn(
               "text-[14px] font-medium tabular-nums",
               stats.future === 0 ? "text-gray-300" : "text-gray-600"
             )}
           >
             {stats.future}
           </span>
         </div>
       </div>
     </motion.div>
   </div>
 );
}