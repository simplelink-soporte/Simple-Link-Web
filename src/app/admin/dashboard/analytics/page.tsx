"use client"

import { AnalyticsChart } from "@/components/analytics/AnalyticsChart"
import { AnalyticsWidgets } from "@/components/analytics/AnalyticsWidgets"
import { Button } from "@/components/ui/button"

export default function AnalyticsPage() {
  return (
    <div className="-mx-14 flex flex-col gap-28">
      {/* Sección del gráfico principal */}
      <section className="w-full h-[400px] px-2">
        <div className="flex justify-end mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">7 días</Button>
            <Button variant="outline" size="sm">30 días</Button>
            <Button variant="outline" size="sm">12 meses</Button>
          </div>
        </div>
        <AnalyticsChart />
      </section>

      {/* Sección de widgets */}
      <section className="w-full px-2">
        <AnalyticsWidgets />
      </section>
    </div>
  )
} 