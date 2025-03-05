import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { IconAlertCircle } from "@tabler/icons-react"

interface TimeErrorAlertProps {
  error: string | null
}

export function TimeErrorAlert({ error }: TimeErrorAlertProps) {
  if (!error) return null

  return (
    <Alert variant="destructive" className="mb-4">
      <IconAlertCircle className="h-4 w-4" />
      <AlertTitle>Error en los horarios</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
} 