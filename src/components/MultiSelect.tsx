import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X, Search } from 'lucide-react'

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = 'Choose from Drop-down',
  label,
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  const removeValue = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedValues.filter((v) => v !== value))
  }

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedLabels = options.filter((opt) => selectedValues.includes(opt.value))

  return (
    <div className="space-y-1.5 w-full relative" ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-slate-700 tracking-wide block uppercase">
          {label}
        </label>
      )}

      {/* Main trigger button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          min-h-[42px] w-full bg-white border rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-sm transition-all cursor-pointer select-none
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-slate-350'}
          ${isOpen ? 'border-primary ring-2 ring-blue-100' : 'border-slate-200'}
          ${error ? 'border-red-500 ring-1 ring-red-550/10' : ''}
        `}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {selectedLabels.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            selectedLabels.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg px-2 py-0.5 text-xs font-medium max-w-[150px] truncate"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => removeValue(opt.value, e)}
                  disabled={disabled}
                  className="hover:bg-indigo-100 p-0.5 rounded-full text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Error Message */}
      {error && <p className="text-xs font-medium text-red-500 pl-1">{error}</p>}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col animate-fade-in">
          {/* Search bar */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-xs text-slate-800 placeholder-slate-400 focus:ring-0 p-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options Checklist */}
          <div className="overflow-y-auto flex-1 py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-450 italic text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.value)
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`
                      flex items-center justify-between px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors
                      ${isChecked ? 'bg-indigo-50/40 text-indigo-700 font-semibold' : ''}
                    `}
                  >
                    <span>{opt.label}</span>
                    {isChecked && <Check size={14} className="text-indigo-600" />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
