"use client"

import type { ReactNode } from "react"
import { createContext, useContext } from "react"
import * as React from "react"

export type SiteHeaderSetter = (content: ReactNode | null) => void

interface SiteHeaderContextValue {
  setTitleAfter: SiteHeaderSetter
}

export const SiteHeaderContext = createContext<SiteHeaderContextValue | null>(
  null
)

interface SiteHeaderProviderProps {
  children: ReactNode
  setTitleAfter: SiteHeaderSetter
}

export function SiteHeaderProvider({
  children,
  setTitleAfter,
}: SiteHeaderProviderProps) {
  return (
    <SiteHeaderContext.Provider value={{ setTitleAfter }}>
      {children}
    </SiteHeaderContext.Provider>
  )
}

export function useSiteHeader() {
  const context = useContext(SiteHeaderContext)

  if (!context) {
    throw new Error("useSiteHeader must be used within a SiteHeaderProvider")
  }

  return context
}

interface SiteHeaderResetProps {
  pathname: string
}

export function SiteHeaderRouteReset({ pathname }: SiteHeaderResetProps) {
  const { setTitleAfter } = useSiteHeader()

  React.useEffect(() => {
    setTitleAfter(null)
  }, [pathname, setTitleAfter])

  return null
}

