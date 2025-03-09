import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useForm } from "@/contexts/FormContext";
import { MapPinFilled, CalendarFilled, ClockFilled, PackageFilled } from "../icons";

interface DesktopReservationDetailsProps {
  theme: 'light' | 'dark';
  calculations: {
    courtPrice: number;
    selectedItems: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      total: number;
    }>;
  };
}

/**
 * Componente específico para la vista desktop de los detalles de reserva
 * - Elimina el título "Detalles de la reserva"
 * - Agrega bordes al contenedor de elementos
 * - Mejora el espaciado para aprovechar mejor el espacio horizontal
 * - Reduce el tamaño general para adaptarse al contenedor central
 */
export function DesktopReservationDetails({ theme, calculations }: DesktopReservationDetailsProps) {
  const { state } = useForm();
  const { location, shift } = state;

  if (!shift.date || !shift.startTime || !shift.endTime) {
    return null;
  }

  // Calcular la duración en minutos
  const startTime = new Date(`2000/01/01 ${shift.startTime}`);
  const endTime = new Date(`2000/01/01 ${shift.endTime}`);
  const durationInMinutes = differenceInMinutes(endTime, startTime);
  const durationText = durationInMinutes >= 60 
    ? `${durationInMinutes / 60} ${durationInMinutes === 60 ? 'hora' : 'horas'}`
    : `${durationInMinutes} minutos`;

  // Formatear fecha con primera letra mayúscula
  const formattedDate = format(new Date(shift.date), "EEEE d 'de' MMMM", { locale: es })
    .replace(/^\w/, c => c.toUpperCase());

  return (
    <div className={cn(
      "space-y-4 rounded-lg border",
      theme === 'dark' ? "border-neutral-700 bg-neutral-800/20" : "border-gray-200 bg-white/60"
    )}>
      {/* Título del componente */}
      <div className="pt-5 px-5">
        <h3 className={cn(
          "text-sm font-medium",
          theme === 'dark' ? "text-white/80" : "text-gray-700"
        )}>
          Detalles de tu reserva
        </h3>
      </div>
      
      <div className="space-y-4 px-5 pb-5">
        {/* Sección de Lugar y Fecha */}
        <div>
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex items-center justify-center flex-shrink-0",
              "w-10 h-10 rounded-md",
              theme === 'dark' 
                ? "bg-neutral-700" 
                : "bg-gray-100"
            )}>
              <MapPinFilled className={cn(
                "h-4 w-4",
                theme === 'dark' 
                  ? "text-gray-300" 
                  : "text-gray-500"
              )} />
            </div>
            <div className="flex-1">
              <div className="space-y-1 pb-2">
                <p className={cn(
                  "text-sm font-semibold",
                  theme === 'dark' ? "text-white/90" : "text-gray-900"
                )}>
                  Ubicación de la Reserva
                </p>
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )}>
                  {location.branchName || "No seleccionada"}
                </p>
              </div>
              {/* Línea Divisoria para 'Ubicación de la Reserva' */}
              <div className="border-b border-gray-200 dark:border-gray-700 my-2" />
            </div>
          </div>
        </div>

        {/* Fecha */}
        <div className="flex items-start gap-3 mt-2">
          <div className={cn(
            "flex items-center justify-center flex-shrink-0",
            "w-10 h-10 rounded-md",
            theme === 'dark' 
              ? "bg-neutral-700" 
              : "bg-gray-100"
          )}>
            <CalendarFilled className={cn(
              "h-4 w-4",
              theme === 'dark' 
                ? "text-gray-300" 
                : "text-gray-500"
            )} />
          </div>
          <div className="flex-1">
            <div className="space-y-1 pb-2">
              <p className={cn(
                "text-sm font-semibold",
                theme === 'dark' ? "text-white/90" : "text-gray-900"
              )}>
                Fecha Seleccionada
              </p>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                {formattedDate}
              </p>
            </div>
            {/* Línea Divisoria para 'Fecha Seleccionada' */}
            <div className="border-b border-gray-200 dark:border-gray-700 my-2" />
          </div>
        </div>

        {/* Sección de Duración y Pista */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex items-center justify-center flex-shrink-0",
            "w-10 h-10 rounded-md",
            theme === 'dark' 
              ? "bg-neutral-700" 
              : "bg-gray-100"
          )}>
            <ClockFilled className={cn(
              "h-4 w-4",
              theme === 'dark' 
                ? "text-gray-300" 
                : "text-gray-500"
            )} />
          </div>
          <div className="flex-1">
            <div className="space-y-1 pb-2">
              <p className={cn(
                "text-sm font-semibold",
                theme === 'dark' ? "text-white/90" : "text-gray-900"
              )}>
                Pista Seleccionada
              </p>
              <div className="flex items-center justify-between">
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )}>
                  {durationText}
                  <span className="mx-1.5">·</span>
                  {shift.startTime} - {shift.endTime}
                  <span className={cn(
                    "inline-block mx-2 h-3 w-[1px]",
                    theme === 'dark' ? "bg-gray-700" : "bg-gray-200"
                  )} />
                  {shift.courtName}
                </p>
                <p className={cn(
                  "text-sm font-medium",
                  theme === 'dark' ? "text-gray-200" : "text-gray-700"
                )}>
                  €{calculations.courtPrice}
                </p>
              </div>
            </div>
            {/* Línea Divisoria */}
            <div className="border-b border-gray-200 dark:border-gray-700 my-2" />
          </div>
        </div>

        {/* Sección de Items Agregados */}
        <div>
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex items-center justify-center flex-shrink-0",
              "w-10 h-10 rounded-md",
              theme === 'dark' 
                ? "bg-neutral-700" 
                : "bg-gray-100"
            )}>
              <PackageFilled className={cn(
                "h-4 w-4",
                theme === 'dark' 
                  ? "text-gray-300" 
                  : "text-gray-500"
              )} />
            </div>
            <div className="flex-1 space-y-1">
              <p className={cn(
                "text-sm font-semibold",
                theme === 'dark' ? "text-white/90" : "text-gray-900"
              )}>
                Accesorios y Extras
              </p>
              <div className="space-y-2">
                {calculations.selectedItems.length > 0 ? (
                  calculations.selectedItems.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-sm",
                          theme === 'dark' ? "text-gray-300" : "text-gray-600"
                        )}>
                          {item.name}
                        </p>
                        <span className={cn(
                          "text-xs",
                          theme === 'dark' ? "text-gray-400" : "text-gray-500"
                        )}>
                          ({item.quantity} x €{item.price})
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm font-medium",
                        theme === 'dark' ? "text-gray-200" : "text-gray-700"
                      )}>
                        €{item.total}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className={cn(
                    "text-sm",
                    theme === 'dark' ? "text-gray-400" : "text-gray-500"
                  )}>
                    No hay items agregados
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 