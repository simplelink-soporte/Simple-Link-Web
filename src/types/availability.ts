export interface AvailabilitySlot {
  id: string;
  startTime: string;
  endTime: string;
  courtId: string;
  courtName: string;
  courtType: string;
  price: number | null;
  status: 'available' | 'popular' | 'lastCall';
}

export interface AvailabilityParams {
  date: Date;
  duration: number;
  courtType?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'night';
  branchId: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface HoldReservation {
  slotId: string;
  courtId: string;
  date: Date;
  timeRange: TimeRange;
  createdAt: Date;
  expiresAt: Date;
}

export interface BranchSchedule {
  schedule: OpeningHours;
  timezone: string;
}

export interface OpeningHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  timeRanges: TimeRangeSchedule[];
  timezone?: string;
}

export interface TimeRangeSchedule {
  openTime: string;
  closeTime: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  isAvailable: boolean;
}