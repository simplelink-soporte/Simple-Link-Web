import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CardBrandIconProps {
  brand: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export function CardBrandIcon({ brand, className, theme = 'light' }: CardBrandIconProps) {
  // Normalizar la marca a minúsculas para hacer la comparación más robusta
  const normalizedBrand = brand?.toLowerCase() || '';
  
  // Objeto para mapear marcas a sus rutas de logotipos
  const brandLogoMap: Record<string, { aspectRatio: string, alt: string }> = {
    mastercard: {
      aspectRatio: 'aspect-[1.6/1]',
      alt: 'MasterCard'
    },
    visa: {
      aspectRatio: 'aspect-[3/1]',
      alt: 'Visa'
    },
    amex: {
      aspectRatio: 'aspect-[1.3/1]',
      alt: 'American Express'
    }
  };
  
  // Función para detectar la marca basada en el nombre normalizado
  const detectBrand = (): string | null => {
    if (normalizedBrand.includes('mastercard')) return 'mastercard';
    if (normalizedBrand.includes('visa')) return 'visa';
    if (normalizedBrand.includes('american express') || normalizedBrand.includes('amex')) return 'amex';
    return null;
  };
  
  // Detectar la marca
  const detectedBrand = detectBrand();
  
  // Si se detectó una marca con logo disponible, mostrarla
  if (detectedBrand && brandLogoMap[detectedBrand]) {
    const logoInfo = brandLogoMap[detectedBrand];
    const logoPath = `/assets/card-brands/${detectedBrand}-${theme}.svg`;
    
    return (
      <div className={cn(
        'relative',  
        'h-5 w-8', 
        logoInfo.aspectRatio,
        className
      )}>
        <Image 
          src={logoPath}
          alt={logoInfo.alt}
          fill
          className="object-contain"
        />
      </div>
    );
  }
  
  // Fallback: usar el icono genérico de tarjeta
  return <CreditCard className={cn('h-4 w-4', className)} />;
} 