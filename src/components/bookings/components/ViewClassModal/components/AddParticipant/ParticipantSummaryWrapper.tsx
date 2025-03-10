import { ParticipantsSummary } from "./ParticipantsSummary"
import type { Participant } from "@/types/bookings"
import type { ParticipantRoleEnum } from "@/types/bookings"

interface SectionParticipant {
  id: string
  userId: string
  fullName: string
  email?: string
  role: ParticipantRoleEnum
}

interface ParticipantSummaryWrapperProps {
  participants: SectionParticipant[]
  onConfirm: () => void
  onBack: () => void
  date?: string
  startTime?: string
  endTime?: string
}

export function ParticipantSummaryWrapper({
  participants,
  onConfirm,
  onBack,
  date,
  startTime,
  endTime
}: ParticipantSummaryWrapperProps) {
  // Convertir los participantes de la sección al formato esperado por ParticipantsSummary
  const convertedParticipants: Participant[] = participants.map(p => ({
    id: p.id,
    name: p.fullName,
    email: p.email,
    role: p.role,
    memberId: p.userId
  }))

  return (
    <ParticipantsSummary
      participants={convertedParticipants}
      onConfirm={onConfirm}
      onBack={onBack}
      date={date}
      startTime={startTime}
      endTime={endTime}
    />
  )
} 