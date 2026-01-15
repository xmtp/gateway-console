import type { ReactNode } from 'react'
import { ChevronLeft, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'

interface MobileHeaderProps {
  /** Content to display in the Sheet menu */
  menuContent: ReactNode
  /** Title to display - defaults to panel-based title */
  title?: string
}

/**
 * Mobile header with back navigation and hamburger menu.
 * Fixed at top of viewport on mobile.
 * Shows back button when not on conversations view.
 * Menu opens a Sheet with settings/wallet content.
 *
 * Touch targets are 44px minimum (h-11 w-11 = 44px).
 */
export function MobileHeader({ menuContent, title: titleProp }: MobileHeaderProps) {
  const { activePanel, goBack, isMobile } = useResponsiveLayout()

  // Only render on mobile
  if (!isMobile) return null

  // Back button only shows in chat view per spec
  const showBackButton = activePanel === 'chat'

  // Use provided title, or fall back to 'Messages' per spec
  // (spec says "conversation name or 'Messages'")
  const title = titleProp ?? 'Messages'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-3 bg-zinc-950 border-b border-zinc-800/50">
      {/* Left section: Back button or spacer + title */}
      <div className="flex items-center gap-1">
        {showBackButton ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="h-11 w-11 -ml-2 text-zinc-400 hover:text-zinc-100"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          // Empty space to maintain layout consistency when no back button
          <div className="w-1" />
        )}
        <div className="flex items-center gap-2">
          <img src="/x-mark-red.svg" alt="XMTP" className="h-4 w-4" />
          <span className="text-xs font-mono font-medium uppercase tracking-widest text-zinc-100 truncate max-w-[180px]">
            {title}
          </span>
        </div>
      </div>

      {/* Right section: Menu button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 -mr-2 text-zinc-400 hover:text-zinc-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-zinc-950 border-zinc-800">
          <SheetTitle className="sr-only">Settings Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Access wallet settings, faucet, deposit, and test user management
          </SheetDescription>
          <div className="flex flex-col h-full">
            {menuContent}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
