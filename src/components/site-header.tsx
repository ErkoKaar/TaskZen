import Image from "next/image"
import Link from "next/link"
import { AccountMenu } from "@/components/account-menu"
import { IS_DEMO } from "@/lib/demo/mode"

// Brand left, page tabs centred, account menu right. Below sm the grid
// collapses to a row: logo, then tabs dropdown and account button.
export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      {IS_DEMO && (
        <p className="border-b border-border bg-primary/10 px-4 py-1.5 text-center text-xs text-muted-foreground">
          Demo with sample data. Your changes are saved in this browser only.
        </p>
      )}
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-5 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-6 sm:py-3">
        <Link
          href="/tasks"
          className="mr-auto flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mr-0 sm:justify-self-start"
        >
          <span className="relative shrink-0">
            {/* Persistent glow — independent of hover/animation state, always lit */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-[-6px]"
              style={{
                background: "radial-gradient(circle, var(--primary), transparent 70%)",
                opacity: 0.35,
              }}
            />
            <Image
              src="/icon.svg"
              alt="TaskZen"
              width={32}
              height={32}
              className="relative h-9 w-9 sm:h-8 sm:w-8"
              priority
            />
          </span>
          <span aria-hidden className="hidden text-base font-semibold tracking-tight text-foreground sm:inline">
            TaskZen
          </span>
        </Link>
        <div className="flex justify-center">{children}</div>
        <div className="sm:justify-self-end">
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}
