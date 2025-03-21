import { TimeRange } from '@/types/availability';

// Duración en milisegundos de una reserva temporal
const HOLD_DURATION = 5 * 60 * 1000; // 5 minutos

interface HoldReservation {
  slotId: string;
  courtId: string;
  date: Date;
  timeRange: TimeRange;
  createdAt: Date;
  expiresAt: Date;
  userId?: string; // Añadimos userId opcional para identificar quién hizo la reserva
}

/**
 * Servicio para gestionar las reservas temporales (holds)
 */
class HoldReservationService {
  private static instance: HoldReservationService;
  private holdReservations: Map<string, HoldReservation> = new Map();

  private constructor() {
    setInterval(() => this.cleanupExpiredHolds(), 60000); // Limpiar cada minuto
  }

  public static getInstance(): HoldReservationService {
    if (!HoldReservationService.instance) {
      HoldReservationService.instance = new HoldReservationService();
    }
    return HoldReservationService.instance;
  }

  /**
   * Genera un ID único para un slot
   */
  public generateSlotId(courtId: string, date: string, startTime: string): string {
    return `${courtId}-${date}-${startTime}`;
  }

  /**
   * Pone un hold en un slot específico
   */
  public async holdSlot(
    slotId: string, 
    courtId: string, 
    date: string, 
    startTime: string, 
    endTime: string, 
    userId: string
  ): Promise<boolean> {
    if (this.holdReservations.has(slotId)) {
      return false;
    }

    const hold: HoldReservation = {
      slotId,
      courtId,
      date: new Date(date),
      timeRange: {
        start: startTime,
        end: endTime
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + HOLD_DURATION),
      userId // Almacenamos el userId para saber quién hizo la reserva
    };

    this.holdReservations.set(slotId, hold);
    return true;
  }

  /**
   * Libera el hold de un slot
   */
  public releaseHold(slotId: string): void {
    this.holdReservations.delete(slotId);
  }

  /**
   * Limpia los holds expirados
   */
  private cleanupExpiredHolds(): void {
    const now = new Date();
    Array.from(this.holdReservations.entries()).forEach(([slotId, hold]) => {
      if (hold.expiresAt <= now) {
        this.holdReservations.delete(slotId);
      }
    });
  }

  /**
   * Verifica si un slot está en hold
   */
  public isSlotOnHold(slotId: string): boolean {
    return this.holdReservations.has(slotId);
  }

  /**
   * Alias de isSlotOnHold para mantener compatibilidad con el código refactorizado
   * Verifica si un slot está en hold
   */
  public isSlotHeld(slotId: string): boolean {
    return this.isSlotOnHold(slotId);
  }

  /**
   * Verifica si un slot está reservado por un usuario específico
   */
  public isSlotHeldByUser(slotId: string, userId: string): boolean {
    const hold = this.holdReservations.get(slotId);
    return hold !== undefined && hold.userId === userId;
  }

  /**
   * Obtiene todos los slots en hold
   */
  public getAllHoldReservations(): HoldReservation[] {
    return Array.from(this.holdReservations.values());
  }

  /**
   * Obtiene todos los ids de slots en hold
   */
  public getAllHoldSlotIds(): string[] {
    return Array.from(this.holdReservations.keys());
  }
}

// Exportar instancia singleton
export default HoldReservationService.getInstance();
