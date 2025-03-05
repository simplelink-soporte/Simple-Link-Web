import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { motion } from "framer-motion"
import { Lock } from "lucide-react"

export function UserSettings() {
  const { user } = useAuth()

  const handlePasswordReset = async () => {
    // TODO: Implementar recuperación de contraseña
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium">Datos de Usuario</h3>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[800px]"
      >
        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "border border-gray-200 bg-gray-50/50",
                    "text-sm text-gray-700"
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-600">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value="••••••••"
                    disabled
                    className={cn(
                      "w-full px-3 py-2 rounded-lg",
                      "border border-gray-200 bg-gray-50/50",
                      "text-sm"
                    )}
                  />
                  <Button
                    onClick={handlePasswordReset}
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2"
                  >
                    <Lock className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
                    <span className="text-xs text-gray-600">Cambiar</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Separador e información de contacto */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-900">
                ¿Necesitas ayuda con tu cuenta?
              </p>
              <div className="text-sm text-gray-500">
                <p>Contáctenos en:</p>
                <div className="mt-1 space-y-1">
                  <p className="text-gray-600">
                    <a 
                      href="mailto:soportesimplelink@gmail.com"
                      className="hover:text-gray-900 transition-colors"
                    >
                      soportesimplelink@gmail.com
                    </a>
                  </p>
                  <p className="text-gray-600">
                    <a 
                      href="https://www.simple-link.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gray-900 transition-colors"
                    >
                      www.simple-link.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 