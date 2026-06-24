import { AppSwitcher } from "@/components/app-switcher"

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <AppSwitcher />
        {children}
      </div>
    </header>
  )
}
