// Exportar todos los servicios de disponibilidad
import availabilityService from './service';
import timeSlotService from './timeSlotService';
import bookingTransformerService from './bookingTransformerService';
import holdReservationService from './holdReservationService';
import pricingService from './pricingService';

export {
  availabilityService,
  timeSlotService,
  bookingTransformerService,
  holdReservationService,
  pricingService
};

export default availabilityService;
