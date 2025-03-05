import * as React from "react"

interface ScrollBarProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>
}

export function ScrollBar({ scrollContainerRef }: ScrollBarProps) {
  const [scrollPercentage, setScrollPercentage] = React.useState(0)

  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const percentage = (scrollTop / (scrollHeight - clientHeight)) * 100
      setScrollPercentage(percentage)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [scrollContainerRef])

  return (
    <div className="absolute right-0 top-0 bottom-0 w-1.5 z-10">
      <div className="h-full bg-gray-100 rounded-full">
        <div
          className="w-full bg-gray-900 rounded-full transition-all duration-200 ease-out"
          style={{
            height: `${scrollPercentage}%`,
            transform: `translateY(${scrollPercentage}%)`,
          }}
        />
      </div>
    </div>
  )
}
