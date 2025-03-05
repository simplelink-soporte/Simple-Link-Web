export const queryKeys = {
  classes: {
    all: ['classes'] as const,
    lists: () => [...queryKeys.classes.all, 'list'] as const,
    list: (filters: { branchId?: string; empresaId?: string }) => 
      [...queryKeys.classes.lists(), filters] as const,
    details: () => [...queryKeys.classes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.classes.details(), id] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (date?: string, branchId?: string) => 
      ['bookings', { date, branchId }] as const,
    details: () => [...queryKeys.bookings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bookings.details(), id] as const,
  },
  courts: {
    all: ['courts'] as const,
    lists: () => [...queryKeys.courts.all, 'list'] as const,
    list: (filters: { branchId?: string; onlyActive?: boolean }) => 
      [...queryKeys.courts.lists(), filters] as const,
    details: () => [...queryKeys.courts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.courts.details(), id] as const,
  },
  packages: {
    all: ['packages'] as const,
    lists: () => [...queryKeys.packages.all, 'list'] as const,
    list: (filters: { empresaId?: string }) => 
      [...queryKeys.packages.lists(), filters] as const,
    details: () => [...queryKeys.packages.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.packages.details(), id] as const,
  },
  companyLink: {
    all: ['companyLink'] as const,
    byBranch: (branchId: string) => [...queryKeys.companyLink.all, branchId] as const,
  },
  businessHours: {
    all: ['businessHours'] as const,
    byBranch: (branchId: string) => [...queryKeys.businessHours.all, branchId] as const,
    byBranchAndDay: (branchId: string, day: string) => 
      [...queryKeys.businessHours.byBranch(branchId), day] as const,
  },
  forms: {
    all: ['forms'] as const,
    initial: (empresaId?: string) => [...queryKeys.forms.all, 'initial', empresaId] as const,
    published: (empresaId?: string) => [...queryKeys.forms.all, 'published', empresaId] as const,
    draft: (empresaId?: string) => [...queryKeys.forms.all, 'draft', empresaId] as const
  },
  organization: {
    all: ['organization'] as const,
    current: () => [...queryKeys.organization.all, 'current'] as const,
    byId: (id: string) => [...queryKeys.organization.all, 'detail', id] as const
  },
  participants: {
    all: (empresaId?: string) => 
      ['participants', { empresaId }] as const,
    search: (empresaId?: string, searchTerm?: string) => 
      ['participants', 'search', { empresaId, searchTerm }] as const,
    details: (participantId: string) => 
      ['participants', 'details', participantId] as const,
  },
  bookingCount: {
    all: ['bookingCount'] as const,
    status: (empresaId: string, date: string) => 
      [...queryKeys.bookingCount.all, 'status', { empresaId, date }] as const,
  },
  subscription: {
    all: ['subscription'] as const,
    info: (empresaId: string) => 
      [...queryKeys.subscription.all, 'info', empresaId] as const,
  }
} as const

export type QueryKeys = typeof queryKeys 