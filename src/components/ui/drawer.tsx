import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

const Drawer = ({
  shouldScaleBackground = false,
  noBodyStyles = true,
  repositionInputs = false,
  disablePreventScroll = false,
  handleOnly = false,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => {
  const prevOpenRef = React.useRef<boolean | undefined>(false);

  React.useEffect(() => {
    if (open === true && !prevOpenRef.current) {
      sound.drawerOpen();
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        sound.drawerOpen();
      } else {
        sound.drawerClose();
      }
      onOpenChange?.(isOpen);
    },
    [onOpenChange]
  );

  return (
    <DrawerPrimitive.Root
      shouldScaleBackground={shouldScaleBackground}
      preventScrollRestoration={false}
      noBodyStyles={noBodyStyles}
      repositionInputs={repositionInputs}
      disablePreventScroll={disablePreventScroll}
      handleOnly={handleOnly}
      open={open}
      onOpenChange={handleOpenChange}
      {...props}
    />
  );
};
Drawer.displayName = "Drawer";

const DrawerNestedRoot = ({
  handleOnly = false,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.NestedRoot>) => {
  const prevOpenRef = React.useRef<boolean | undefined>(false);

  React.useEffect(() => {
    if (open === true && !prevOpenRef.current) {
      sound.drawerOpen();
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        sound.drawerOpen();
      } else {
        sound.drawerClose();
      }
      onOpenChange?.(isOpen);
    },
    [onOpenChange]
  );

  return (
    <DrawerPrimitive.NestedRoot
      handleOnly={handleOnly}
      open={open}
      onOpenChange={handleOpenChange}
      {...props}
    />
  );
};
DrawerNestedRoot.displayName = "DrawerNestedRoot";

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

const DrawerHandle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Handle>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Handle>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Handle
    ref={ref}
    className={cn(
      "mx-auto mt-3 h-1.5 w-11 rounded-full bg-muted-foreground/30 shrink-0 cursor-grab active:cursor-grabbing",
      className
    )}
    {...props}
  />
));
DrawerHandle.displayName = "DrawerHandle";

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/60 [backface-visibility:hidden]", className)}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex h-auto flex-col rounded-t-3xl bg-card focus:outline-none max-w-lg mx-auto border-0 [backface-visibility:hidden]",
        className
      )}
      {...props}
    >
      <DrawerHandle />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4 pb-safe pb-12 mb-3", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerNestedRoot,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerHandle,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
