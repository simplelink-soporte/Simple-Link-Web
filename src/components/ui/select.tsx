import * as React from "react"
import { useEffect, useRef } from "react"

interface SelectContextType {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}

const SelectContext = React.createContext<SelectContextType>({
  activeId: null,
  setActiveId: () => {},
});

export const SelectProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  return (
    <SelectContext.Provider value={{ activeId, setActiveId }}>
      {children}
    </SelectContext.Provider>
  );
};

interface SelectProps {
  children: React.ReactNode;
  onValueChange: (value: string) => void;
  id: string;
  initialValue?: string;
}

export const Select = ({ children, onValueChange, id, initialValue = "" }: SelectProps) => {
  const [selectedValue, setSelectedValue] = React.useState(initialValue)
  const { activeId, setActiveId } = React.useContext(SelectContext)
  const isOpen = activeId === id
  const selectRef = useRef<HTMLDivElement>(null)

  const handleSelect = (value: string) => {
    setSelectedValue(value)
    onValueChange(value)
    setActiveId(null)
  }

  const toggleOpen = () => {
    if (isOpen) {
      setActiveId(null)
      return
    }
    setActiveId(id)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setActiveId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setActiveId])

  return (
    <div className="relative" ref={selectRef}>
      <button 
        onClick={toggleOpen}
        className="w-full text-left px-4 py-2 flex items-center justify-between bg-gray-50/50 rounded-md"
      >
        <span className="text-sm">{selectedValue || initialValue}</span>
      </button>
      <div className={`
        absolute z-50 w-full transform transition-all duration-200 ease-in-out
        ${isOpen ? 'opacity-100 translate-y-1' : 'opacity-0 translate-y-0 pointer-events-none'}
      `}>
        <div className="bg-white border border-gray-200 rounded-md shadow-lg">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === SelectContent) {
              return React.cloneElement(child as React.ReactElement<any>, { 
                onSelect: handleSelect,
                children: React.Children.map(child.props.children, (contentChild) => {
                  if (React.isValidElement(contentChild) && contentChild.type === SelectItem) {
                    return contentChild;
                  }
                  return null;
                })
              });
            }
            return null;
          })}
        </div>
      </div>
    </div>
  )
}

export const SelectTrigger = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={className}>{children}</div>
)

export const SelectContent = ({ 
  children, 
  onSelect 
}: { 
  children: React.ReactNode, 
  onSelect?: (value: string) => void 
}) => (
  <>
    {React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === SelectItem) {
        return React.cloneElement(child, { onSelect })
      }
      return null
    })}
  </>
)

export const SelectItem = ({ 
  value, 
  children, 
  onSelect 
}: { 
  value: string, 
  children: React.ReactNode, 
  onSelect?: (value: string) => void 
}) => (
  <div 
    onClick={() => onSelect?.(value)} 
    className="px-4 py-2 hover:bg-gray-100 hover:text-black cursor-pointer text-sm text-gray-700"
  >
    {children}
  </div>
)

export const SelectValue = ({ placeholder }: { placeholder: string }) => (
  <span className="text-sm">{placeholder}</span>
)
