// Exportar todos los servicios de disponibilidad
import availabilityService from './service';
import timeSlotService from './timeSlotService';
import bookingTransformerService from './bookingTransformerService';
import holdReservationService from './holdReservationService';
import pricingService from './pricingService';
import classSessionService from './classSessionService';

export {
  availabilityService,
  timeSlotService,
  bookingTransformerService,
  holdReservationService,
  pricingService,
  classSessionService
};

export default availabilityService;
