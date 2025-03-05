"use client"

import * as React from "react"

import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"



const Tabs = TabsPrimitive.Root



const TabsList = React.forwardRef<

  React.ElementRef<typeof TabsPrimitive.List>,

  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>

>(({ className, ...props }, ref) => {

  const [indicatorStyle, setIndicatorStyle] = React.useState({

    width: 0,

    left: 0,

  })



  const listRef = React.useRef<HTMLDivElement>(null)



  const updateIndicator = React.useCallback(() => {

    if (!listRef.current) return

    const activeTab = listRef.current.querySelector('[data-state="active"]') as HTMLElement

    if (activeTab) {

      setIndicatorStyle({

        width: activeTab.offsetWidth,

        left: activeTab.offsetLeft,

      })

    }

  }, [])



  React.useEffect(() => {

    updateIndicator()
    
    const observer = new MutationObserver((mutations) => {

      mutations.forEach((mutation) => {

        if (mutation.attributeName === 'data-state') {

          updateIndicator()

        }

      })

    })



    if (listRef.current) {

      const tabs = listRef.current.querySelectorAll('[role="tab"]')

      tabs.forEach(tab => {

        observer.observe(tab, { attributes: true })

      })

    }



    window.addEventListener('resize', updateIndicator)

    return () => {

      observer.disconnect()

      window.removeEventListener('resize', updateIndicator)

    }

  }, [updateIndicator])

  return (
    <TabsPrimitive.List
      ref={(node) => {
        if (typeof ref === 'function') ref(node);
        else if (ref && 'current' in ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
        if (listRef.current !== node) {
          (listRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }}
      className={cn(
        "relative flex h-10 items-center justify-start",
        className ?? ""
      )}
      {...props}
    >
      {props.children}
      <div className="absolute bottom-0 left-0 right-0 h-[2px]">
        {/* Línea gris base */}
        <div className="absolute inset-0 bg-zinc-200 rounded-full" />
      </div>
      {/* Línea negra indicadora */}
      <div 
        className="absolute bottom-0 h-[2px] bg-black transition-all duration-300 ease-out rounded-full"
        style={{
          width: `${indicatorStyle.width}px`,
          transform: `translateX(${indicatorStyle.left}px)`,
        }}
      />
    </TabsPrimitive.List>
  )

})

TabsList.displayName = TabsPrimitive.List.displayName



const TabsTrigger = React.forwardRef<

  React.ElementRef<typeof TabsPrimitive.Trigger>,

  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>

>(({ className, ...props }, ref) => (

  <TabsPrimitive.Trigger

    ref={ref}

    className={cn(

      "inline-flex items-center justify-center text-sm font-medium relative",

      "text-muted-foreground transition-colors duration-300",

      "hover:text-foreground data-[state=active]:text-foreground",

      "px-4 py-2",

      className ?? ""

    )}

    asChild

    {...props}

  >

    <div role="button" tabIndex={0}>

      {props.children}

    </div>

  </TabsPrimitive.Trigger>

))

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName



const TabsContent = React.forwardRef<

  React.ElementRef<typeof TabsPrimitive.Content>,

  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>

>(({ className, ...props }, ref) => (

  <TabsPrimitive.Content

    ref={ref}

    className={cn(

      "mt-4 ring-offset-background focus-visible:outline-none",

      className ?? ""

    )}

    {...props}

  />

))

TabsContent.displayName = TabsPrimitive.Content.displayName



export { Tabs, TabsList, TabsTrigger, TabsContent }


