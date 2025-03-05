"use client"

import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js"

// Registrar los componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
)

export function AnalyticsChart() {
  const data = {
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    datasets: [
      {
        fill: true,
        label: "Reservas",
        data: [65, 78, 72, 84, 93, 108, 95],
        borderColor: "rgb(0, 0, 0)",
        backgroundColor: "rgba(0, 0, 0, 0.01)",
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgb(0, 0, 0)",
        padding: 8,
        cornerRadius: 4,
        titleFont: {
          size: 13,
        },
        bodyFont: {
          size: 12,
        },
      },
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
      y: {
        border: {
          display: false,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.06)",
        },
        ticks: {
          maxTicksLimit: 5,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  }

  return (
    <div className="w-full h-full">
      <Line data={data} options={options} />
    </div>
  )
} 