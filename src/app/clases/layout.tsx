"use client"

import { AuthProvider } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { ClassRegistrationProvider } from '@/components/classes-registration/context/ClassRegistrationContext'
import { UserBadge } from '@/components/classes-registration/shared/UserBadge'

interface ClassesLayoutProps {
  children: React.ReactNode
}

export default function ClassesLayout({ children }: ClassesLayoutProps) {
  return (
    <AuthProvider>
      <ClassRegistrationProvider empresaId="default">
        <div className="relative min-h-screen">
          <main className={cn(
            "min-h-screen w-full",
            "bg-white",
            "flex flex-col",
            "overflow-hidden",
            "items-center justify-center"
          )}>
            <div className={cn(
              "w-full flex-1",
              "max-w-[var(--container-default)]",
              "mx-auto",
              "flex flex-col",
              "px-[var(--padding-container-mobile)]",
              "sm:px-[var(--padding-container-tablet)]",
              "lg:px-[var(--padding-container-desktop)]",
              "relative",
              "overflow-y-auto scrollbar-none"
            )}>
              <UserBadge />
              {children}
            </div>
          </main>
        </div>
      </ClassRegistrationProvider>
    </AuthProvider>
  )
} 