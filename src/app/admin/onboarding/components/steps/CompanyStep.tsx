'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import { useOnboarding } from "../../context/OnboardingContext"
import { Check, ChevronDown, Phone } from "lucide-react"
import * as RPNInput from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import { cn } from "@/lib/utils"
import { forwardRef, useState } from "react"
import 'react-phone-number-input/style.css'
import { organizationService } from "@/services/organizationService"
import { toast } from "sonner"
import { onboardingCompanyService } from '@/services/onboardingCompanyService'
import { useAuth } from '@/contexts/AuthContext'

// Componentes auxiliares para el input de teléfono
const PhoneInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        className={cn("-ms-px rounded-s-none shadow-none focus-visible:z-10", className)}
        ref={ref}
        {...props}
      />
    );
  },
);

PhoneInput.displayName = "PhoneInput";

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  onChange: (value: RPNInput.Country) => void;
  options: { label: string; value: RPNInput.Country | undefined }[];
};

const CountrySelect = ({ disabled, value, onChange, options }: CountrySelectProps) => {
  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as RPNInput.Country);
  };

  return (
    <div className="relative inline-flex items-center self-stretch rounded-s-lg border border-input bg-background py-2 pe-2 ps-3 text-muted-foreground transition-shadow focus-within:z-10 focus-within:border-ring focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/20 hover:bg-accent hover:text-foreground has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50">
      <div className="inline-flex items-center gap-1" aria-hidden="true">
        <FlagComponent country={value} countryName={value} aria-hidden="true" />
        <span className="text-muted-foreground/80">
          <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
      <select
        disabled={disabled}
        value={value}
        onChange={handleSelect}
        className="absolute inset-0 text-sm opacity-0"
        aria-label="Select country"
      >
        <option key="default" value="">
          Seleccionar país
        </option>
        {options
          .filter((x) => x.value)
          .map((option, i) => (
            <option key={option.value ?? `empty-${i}`} value={option.value}>
              {option.label} {option.value && `+${RPNInput.getCountryCallingCode(option.value)}`}
            </option>
          ))}
      </select>
    </div>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="w-5 overflow-hidden rounded-sm">
      {Flag ? <Flag title={countryName} /> : <Phone size={16} aria-hidden="true" />}
    </span>
  );
};

export function CompanyStep() {
  const { formData, updateFormData, completeAndAdvance } = useOnboarding()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    updateFormData({ ...formData, [name]: value })
  }

  const handlePhoneChange = (value: string | undefined) => {
    if (value) {
      updateFormData({ ...formData, phone: value })
    }
  }

  const isFormValid = () => {
    return formData.name && formData.email && formData.phone && formData.country
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      
      if (!user) {
        throw new Error('No hay usuario autenticado')
      }

      // 1. Asegurarnos de que existe una empresa
      const { error: getError } = await onboardingCompanyService.getOrCreateCompany(user.id)
      if (getError) throw getError

      // 2. Actualizar los datos de la empresa
      const { error: updateError } = await onboardingCompanyService.updateCompany(user.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
      })
      
      if (updateError) throw updateError

      if (window.innerWidth >= 768) {
        toast.success('Información de la empresa actualizada correctamente')
      }
      
      completeAndAdvance(0)
    } catch (error: any) {
      console.error('Error al actualizar la empresa:', error)
      toast.error(error.message || 'Error al actualizar la información de la empresa')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-medium">Información de la empresa</h2>
        <p className="text-sm text-muted-foreground">
          Completa los datos básicos de tu empresa
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium">
            Nombre de la empresa *
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Ej: Club Deportivo"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-medium">
            Teléfono *
          </Label>
          <RPNInput.default
            className="flex rounded-lg shadow-sm shadow-black/5"
            international
            flagComponent={FlagComponent}
            countrySelectComponent={CountrySelect}
            inputComponent={PhoneInput}
            id="phone"
            placeholder="Ingresa el número de teléfono"
            value={formData.phone}
            onChange={handlePhoneChange}
            defaultCountry="ES"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">
            Email *
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="empresa@club.com"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="country" className="text-xs font-medium">
            ¿De qué país eres? *
          </Label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Selecciona un país</option>
            <option value="Argentina">Argentina</option>
            <option value="España">España</option>
            <option value="Mexico">México</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid() || isSubmitting}
          className="gap-2"
        >
          <Check className="h-4 w-4" />
          {isSubmitting ? 'Guardando...' : 'Continuar'}
        </Button>
      </div>
    </div>
  )
} 