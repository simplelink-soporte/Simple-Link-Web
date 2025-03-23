import { motion } from "framer-motion"
import { useClientOrganizationContext } from "@/contexts/ClientOrganizationContext"
import { cn } from "@/lib/utils"
import { StepComponentProps } from './StepRenderer';

export function NoCreditsStep({ onNext, onPrevious, isLastStep, isFirstStep, progress, viewType }: StepComponentProps) {
  const { organization } = useClientOrganizationContext()

  return (
    <div className="p-6 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex flex-col items-center text-center"
      >
        <img 
          src="/images/Miroodles - Pc storm.png" 
          alt="No Credits" 
          className={cn(
            "mb-6",
            "w-1/3 md:w-1/4 lg:w-1/5", // Responsive image size
            "max-w-[200px]" // Maximum width on larger screens
          )}
        />
        <h2 className="text-lg font-normal text-gray-600 mb-2">
          La Sucursal no posee los créditos para realizar esta reserva
        </h2>
        <p className="text-gray-500 mb-8">
          Por favor, contacta con la sucursal para más información sobre el plan y disponibilidad.
        </p>

        {/* Información de contacto */}
        <div className="space-y-3 text-sm">
          {organization?.business_name && (
            <p className="font-medium text-gray-800">
              {organization.business_name}
            </p>
          )}
          
          <div className="space-y-1.5">
            {organization?.email && (
              <p className="text-gray-600">
                <a 
                  href={`mailto:${organization.email}`}
                  className="hover:text-gray-900 transition-colors"
                >
                  {organization.email}
                </a>
              </p>
            )}
            
            {organization?.phone && (
              <p className="text-gray-600">
                <a 
                  href={`tel:${organization.phone}`}
                  className="hover:text-gray-900 transition-colors"
                >
                  {organization.phone}
                </a>
              </p>
            )}

            {organization?.address && (
              <p className="text-gray-600">
                {organization.address}
                {organization.city && `, ${organization.city}`}
                {organization.state && `, ${organization.state}`}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default NoCreditsStep;
