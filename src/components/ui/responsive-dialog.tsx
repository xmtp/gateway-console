import * as React from "react"
import { useIsMobile } from "@/hooks/useResponsiveLayout"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

interface ResponsiveDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function ResponsiveDialog({ children, ...props }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <Drawer {...props}>{children}</Drawer>
  }
  return <Dialog {...props}>{children}</Dialog>
}

function ResponsiveDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerTrigger {...props}>{children}</DrawerTrigger>
  }
  return <DialogTrigger {...props}>{children}</DialogTrigger>
}

function ResponsiveDialogClose({
  children,
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerClose {...props}>{children}</DrawerClose>
  }
  return <DialogClose {...props}>{children}</DialogClose>
}

interface ResponsiveDialogContentProps
  extends React.ComponentProps<typeof DialogContent> {
  showCloseButton?: boolean
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ResponsiveDialogContentProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <DrawerContent
        className={cn("max-h-[90vh] overflow-y-auto", className)}
        {...props}
      >
        <div
          className="overflow-y-auto p-4"
          style={{ paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </DrawerContent>
    )
  }
  return (
    <DialogContent className={className} showCloseButton={showCloseButton} {...props}>
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerHeader className={className} {...props} />
  }
  return <DialogHeader className={className} {...props} />
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerFooter className={className} {...props} />
  }
  return <DialogFooter className={className} {...props} />
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerTitle className={className} {...props} />
  }
  return <DialogTitle className={className} {...props} />
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerDescription className={className} {...props} />
  }
  return <DialogDescription className={className} {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
}
