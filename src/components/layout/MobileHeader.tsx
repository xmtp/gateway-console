import type { ReactNode } from 'react'
import { ChevronLeft, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'

interface MobileHeaderProps {
  /** Content to display in the Sheet menu */
  menuContent: ReactNode
  /** Title to display - defaults to 'Messages' */
  title?: string
}

/**
 * Mobile header with back navigation and hamburger menu.
 * Fixed at top of viewport on mobile.
 * Left: Back button (in chat) or Menu button (elsewhere)
 * Center: Title (conversation name or 'Messages')
 * Right: Menu button
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
  const title = titleProp ?? 'Messages'

  // Sheet content is shared between left menu button and right menu button
  const sheetContent = (
    <>
      <SheetTitle className="sr-only">Settings Menu</SheetTitle>
      <SheetDescription className="sr-only">
        Access wallet settings, faucet, deposit, and test user management
      </SheetDescription>
      <div className="flex flex-col h-full">
        {menuContent}
      </div>
    </>
  )

  return (
    <header className="fixed top-0 left-0 right-0 z-50 grid grid-cols-[auto,1fr,auto] items-center h-14 px-3 bg-zinc-950 border-b border-zinc-800/50">
      {/* Left section: Back button (chat) or Menu button (conversations/settings) */}
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
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 -ml-2 text-zinc-400 hover:text-zinc-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-zinc-950 border-zinc-800">
            {sheetContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Center section: Title */}
      <div className="flex items-center justify-center gap-2 min-w-0">
        <img src="/x-mark-red.svg" alt="XMTP" className="h-4 w-4 shrink-0" />
        <span className="text-xs font-mono font-medium uppercase tracking-widest text-zinc-100 truncate">
          {title}
        </span>
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
        <SheetContent side="right" className="w-72 p-0 bg-zinc-950 border-zinc-800">
          {sheetContent}
        </SheetContent>
      </Sheet>
    </header>
  )
}
