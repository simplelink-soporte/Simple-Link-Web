import { useState } from "react";
import { FormStepField } from "@/types/form-steps";
import { PreviewContainer } from "../layout/PreviewContainer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, UserCircle2, LogIn, Mail, Lock, Phone, CreditCard, CreditCard2, CalendarDays, MapPin } from "lucide-react";
import { UserSettings } from '@/types/form-steps';
import { DEFAULT_USER_SETTINGS } from '@/components/steps/users/defaults';

interface UsersPreviewProps {
  field: {
    id: string;
    settings: UserSettings;
  };
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  onStepChange?: (stepId: string, data: any) => void;
}

type ViewType = 'main' | 'login' | 'register';

export function UsersPreview({ 
  field, 
  theme, 
  viewType, 
  onNext, 
  onPrev, 
  isFirstStep, 
  isLastStep,
  onStepChange 
}: UsersPreviewProps) {
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    gender: '',
    birthday: ''
  });

  const handleLogin = () => {
    console.log('Login data:', formData);
    
    // Notificar cambio de datos (mantenemos esto para debugging)
    if (onStepChange) {
      onStepChange(field.id, {
        type: 'login',
        email: formData.email,
        password: formData.password
      });
    }
    
    // Avanzar al siguiente paso sin validaciones
    onNext();
  };

  const handleRegister = () => {
    console.log('Register data:', formData);
    
    // Notificar cambio de datos (mantenemos esto para debugging)
    if (onStepChange) {
      onStepChange(field.id, {
        type: 'register',
        ...formData
      });
    }
    
    // Avanzar al siguiente paso sin validaciones
    onNext();
  };

  // Aseguramos que settings tenga la estructura correcta
  const settings = {
    ...DEFAULT_USER_SETTINGS,
    ...field.settings,
    login: {
      ...DEFAULT_USER_SETTINGS.login,
      ...(field.settings?.login || {})
    },
    register: {
      ...DEFAULT_USER_SETTINGS.register,
      ...(field.settings?.register || {})
    }
  };

  const inputStyles = cn(
    "flex h-9 w-full rounded-lg px-9 py-2 text-sm",
    "border-0",
    "placeholder:text-xs",
    "focus-visible:outline-none focus-visible:ring-1",
    "transition-all duration-200",
    theme === 'dark' 
      ? "bg-neutral-900 text-white placeholder:text-gray-600 focus-visible:ring-zinc-800"
      : "bg-gray-50 hover:bg-gray-100/50 placeholder:text-gray-400 focus-visible:ring-gray-200"
  );

  const iconStyles = cn(
    "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
    theme === 'dark' ? "text-gray-600" : "text-gray-400"
  );

  const selectStyles = cn(
    inputStyles,
    "appearance-none cursor-pointer pr-8",
    "[&>option]:text-gray-900",
    theme === 'dark' 
      ? "[&>option]:bg-neutral-900" 
      : "[&>option]:bg-white"
  );

  const MainView = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="text-center space-y-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className={cn(
            "text-2xl font-semibold transition-colors",
            theme === 'dark' ? "text-white" : "text-gray-900"
          )}>
            ¡Bienvenido!
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-1"
        >
          <p className={cn(
            "text-xs transition-colors",
            theme === 'dark' ? "text-gray-400" : "text-gray-500"
          )}>
            Reserva y accede a beneficios exclusivos
          </p>
        </motion.div>
      </div>

      <motion.div 
        className="space-y-3 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={() => setCurrentView('login')}
          className={cn(
            "w-full h-11 text-sm font-medium rounded-xl",
            "transition-all duration-200 ease-in-out",
            theme === 'dark' 
              ? "bg-zinc-800 hover:bg-neutral-800 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-900"
          )}
        >
          Iniciar Sesión
        </Button>

        <Button
          onClick={() => setCurrentView('register')}
          className={cn(
            "w-full h-11 text-sm font-medium rounded-xl",
            "transition-all duration-200 ease-in-out",
            theme === 'dark' 
              ? "bg-neutral-900 hover:bg-neutral-800 text-gray-200"
              : "bg-gray-50 hover:bg-gray-100 text-gray-800"
          )}
        >
          Crear Cuenta
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <p className={cn(
          "text-xs transition-colors",
          theme === 'dark' ? "text-gray-500" : "text-gray-400"
        )}>
          Al continuar, aceptas nuestros términos y condiciones
        </p>
      </motion.div>
    </motion.div>
  );

  const LoginView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-1.5">
        <h1 className={cn(
          "text-xl font-semibold transition-colors",
          theme === 'dark' ? "text-white" : "text-gray-900"
        )}>
          Iniciar Sesión
        </h1>
        <p className={cn(
          "text-sm transition-colors",
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          Ingresa tus datos para continuar
        </p>
      </div>

      <div className="space-y-3">
        {settings.login.showEmail && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative">
              <Input 
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                type="email" 
                placeholder="Correo electrónico"
                className={inputStyles}
              />
              <Mail className={iconStyles} strokeWidth={1.5} />
            </div>
          </motion.div>
        )}

        {settings.login.showDNI && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="relative">
              <Input 
                type="text" 
                placeholder="DNI"
                className={inputStyles}
              />
              <CreditCard className={iconStyles} strokeWidth={1.5} />
            </div>
          </motion.div>
        )}

        {settings.login.showPhone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <Input 
                type="tel" 
                placeholder="Teléfono"
                className={inputStyles}
              />
              <Phone className={iconStyles} strokeWidth={1.5} />
            </div>
          </motion.div>
        )}
        
        {settings.login.showPassword && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="relative">
              <Input 
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                type="password" 
                placeholder="Contraseña"
                className={inputStyles}
              />
              <Lock className={iconStyles} strokeWidth={1.5} />
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        <Button
          onClick={handleLogin}
          className={cn(
            "w-full h-11 text-sm font-medium rounded-xl",
            "transition-all duration-200 ease-in-out",
            theme === 'dark' 
              ? "bg-zinc-800 hover:bg-neutral-800 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-900"
          )}
        >
          Acceder
        </Button>

        <button
          onClick={() => setCurrentView('main')}
          className={cn(
            "w-full text-xs transition-colors",
            theme === 'dark' 
              ? "text-gray-400 hover:text-gray-200"
              : "text-gray-500 hover:text-gray-900"
          )}
        >
          Volver
        </button>
      </div>
    </motion.div>
  );

  const RegisterView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-1.5">
        <h1 className={cn(
          "text-lg font-semibold transition-colors",
          theme === 'dark' ? "text-white" : "text-gray-900"
        )}>
          Crear Cuenta
        </h1>
        <p className={cn(
          "text-xs transition-colors",
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          Completa tus datos para registrarte
        </p>
      </div>

      <div className="space-y-3">
        {settings.register.showName && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative">
              <Input 
                type="text"
                placeholder="Nombre completo *"
                className={inputStyles}
              />
              <UserCircle2 className={iconStyles} strokeWidth={1.5} />
            </div>
          </motion.div>
        )}

        {settings.register.showDNI && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="relative">
              <Input 
                type="text"
                placeholder="DNI *"
                className={inputStyles}
              />
              <CreditCard className={iconStyles} strokeWidth={1.5} />
            </div>
          </motion.div>
        )}

        {settings.register.showPhone && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <Input 
                type="tel"
                placeholder="Teléfono *"
                className={inputStyles}
              />
              <Phone className={iconStyles} strokeWidth={1.5} />
            </div>
          </motion.div>
        )}

        {settings.register.showEmail && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="relative">
              <Input 
                type="email"
                placeholder="Correo electrónico"
                className={inputStyles}
              />
              <Mail className={iconStyles} strokeWidth={1.5} />
            </div>
          </motion.div>
        )}

        {settings.register.showPassword && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="relative">
              <Input 
                type="password"
                placeholder="Contraseña *"
                className={inputStyles}
              />
              <Lock className={iconStyles} strokeWidth={1.5} />
            </div>
          </motion.div>
        )}

        {settings.register.showLocation && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-2"
          >
            <div className="relative">
              <select
                className={cn(
                  inputStyles,
                  "appearance-none cursor-pointer",
                  theme === 'dark' 
                    ? "[&>option]:bg-neutral-900" 
                    : "[&>option]:bg-white"
                )}
              >
                <option value="" disabled selected>País</option>
                <option value="AR">Argentina</option>
                <option value="CL">Chile</option>
                <option value="UY">Uruguay</option>
                <option value="PY">Paraguay</option>
                <option value="BR">Brasil</option>
              </select>
              <MapPin className={iconStyles} strokeWidth={1.5} />
              <ChevronRight className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 rotate-90 pointer-events-none",
                theme === 'dark' ? "text-gray-600" : "text-gray-400"
              )} />
            </div>

            <div className="relative">
              <select
                className={cn(
                  inputStyles,
                  "appearance-none cursor-pointer",
                  theme === 'dark' 
                    ? "[&>option]:bg-neutral-900" 
                    : "[&>option]:bg-white"
                )}
              >
                <option value="" disabled selected>Región</option>
                <option value="BA">Buenos Aires</option>
                <option value="CF">Capital Federal</option>
                <option value="CB">Córdoba</option>
                <option value="ST">Santa Fe</option>
              </select>
              <MapPin className={iconStyles} strokeWidth={1.5} />
              <ChevronRight className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 rotate-90 pointer-events-none",
                theme === 'dark' ? "text-gray-600" : "text-gray-400"
              )} />
            </div>
          </motion.div>
        )}

        {settings.register.showGender && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <select
              className={cn(
                inputStyles,
                "appearance-none cursor-pointer",
                theme === 'dark' 
                  ? "[&>option]:bg-neutral-900" 
                  : "[&>option]:bg-white"
              )}
            >
              <option value="" disabled selected>Género</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="prefer-not-say">Prefiero no decirlo</option>
            </select>
            <UserCircle2 className={iconStyles} strokeWidth={1.5} />
            <ChevronRight className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 rotate-90 pointer-events-none",
              theme === 'dark' ? "text-gray-600" : "text-gray-400"
            )} />
          </motion.div>
        )}

        {settings.register.showBirthday && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="relative">
              <Input 
                type="date"
                placeholder="Fecha de nacimiento"
                className={cn(
                  inputStyles,
                  "[&::-webkit-calendar-picker-indicator]:opacity-0",
                  "[&::-webkit-calendar-picker-indicator]:absolute",
                  "[&::-webkit-calendar-picker-indicator]:inset-0",
                  "[&::-webkit-calendar-picker-indicator]:cursor-pointer"
                )}
              />
              <CalendarDays className={iconStyles} strokeWidth={1.5} />
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        <Button
          onClick={handleRegister}
          className={cn(
            "w-full h-11 text-sm font-medium rounded-xl",
            "transition-all duration-200 ease-in-out",
            theme === 'dark' 
              ? "bg-zinc-800 hover:bg-neutral-800 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-900"
          )}
        >
          Registrarme
        </Button>

        <button
          onClick={() => setCurrentView('main')}
          className={cn(
            "w-full text-xs transition-colors",
            theme === 'dark' 
              ? "text-gray-400 hover:text-gray-200"
              : "text-gray-500 hover:text-gray-900"
          )}
        >
          Volver
        </button>
      </div>
    </motion.div>
  );

  return (
    <PreviewContainer viewType={viewType} theme={theme}>
      <div className="min-h-full flex flex-col p-4">
        <AnimatePresence mode="wait">
          {currentView === 'main' && <MainView />}
          {currentView === 'login' && <LoginView />}
          {currentView === 'register' && <RegisterView />}
        </AnimatePresence>
      </div>
    </PreviewContainer>
  );
} 