'use client';

/**
 * Interfaz para representar una tarjeta almacenada independientemente de la pasarela
 */
export interface StoredCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  customerId?: string; // Opcional para mantener compatibilidad con diferentes pasarelas
}

/**
 * Propiedades base para los componentes de tarjeta
 */
export interface CardItemProps {
  card: StoredCard;
  isSelected?: boolean;
  onClick: () => void;
  onDelete?: () => void;
  theme?: 'light' | 'dark';
  viewType?: 'mobile' | 'desktop';
}

/**
 * Propiedades para el botón de agregar tarjeta
 */
export interface AddCardButtonProps {
  onClick: () => void;
  theme?: 'light' | 'dark';
  viewType?: 'mobile' | 'desktop';
}

/**
 * Propiedades base para la lista de tarjetas, independiente de la pasarela
 */
export interface CardListBaseProps {
  cards: StoredCard[];
  selectedCardId?: string;
  onSelect: (card: StoredCard) => void;
  onAddCard: () => void;
  onDeleteCard?: (cardId: string) => void;
  isExpanded?: boolean;
  isLoading?: boolean;
  showCardForm?: boolean;
  onCardSetupBack?: () => void;
  theme?: 'light' | 'dark';
  viewType?: 'mobile' | 'desktop';
  empresaId?: string; // Importante para determinar la pasarela
}

/**
 * Propiedades específicas para Stripe
 */
export interface StripeCardListProps extends CardListBaseProps {
  onCardSetupSuccess?: (paymentMethodId: string) => void;
  onCardSetupError?: (error: any) => void;
  stripeAccountId?: string;
}

/**
 * Propiedades específicas para MercadoPago
 */
export interface MercadoPagoCardListProps extends CardListBaseProps {
  onCardSetupSuccess?: (paymentMethodId: string) => void;
  onCardSetupError?: (error: any) => void;
  mercadoPagoUserId?: string;
  empresaId: string; // Hacemos que empresaId sea requerido para MercadoPago
  amount?: number; // Monto total de la operación, utilizado para validar la tarjeta
}

/**
 * Propiedades unificadas para el wrapper de CardList
 */
export interface CardListProps extends CardListBaseProps {
  onCardSetupSuccess?: (paymentMethodId: string) => void;
  onCardSetupError?: (error: any) => void;
  stripeAccountId?: string;
  mercadoPagoUserId?: string;
  empresaId?: string; // Esto ya existe en CardBaseProps pero lo aclaramos aquí también
  amount?: number; // Monto total de la operación, pasado desde el componente padre
}
