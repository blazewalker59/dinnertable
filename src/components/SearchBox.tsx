import { useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { searchRecipes } from '../server/recipes'

type Result = {
  id: number
  title: string
  attribution: string | null
  sectionName: string
}

export function SearchBox() {
  const navigate = useNavigate()
  const boxRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<Result>>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [searching, setSearching] = useState(false)
  // Phones: a search icon that expands the field across the header row.
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced live search — results appear inline, no route hop.
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setOpen(false)
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const { results: found } = await searchRecipes({ data: q })
        setResults(found)
        setActive(-1)
        setOpen(true)
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  // Click outside closes the dropdown.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setExpanded(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  function choose(r: Result) {
    setOpen(false)
    setExpanded(false)
    setQuery('')
    navigate({ to: '/recipes/$recipeId', params: { recipeId: String(r.id) } })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') {
        setOpen(false)
        setExpanded(false)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active === -1 ? 0 : active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const optionId = (i: number) => `${listId}-${i}`

  return (
    // Not positioned on phones, so the expanded field can span the header
    // row (which is the positioned ancestor).
    <div ref={boxRef} className="sm:relative">
      {!expanded && (
        <span className="sm:hidden">
          <button
            type="button"
            onClick={() => {
              // Show and focus in the same tap: iOS only raises the
              // keyboard for focus() inside the user gesture.
              flushSync(() => setExpanded(true))
              inputRef.current?.focus()
            }}
            aria-label="Search recipes"
            className="icon-btn text-leaf-deep hover:bg-cream"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-5">
              <circle
                cx="8.5"
                cy="8.5"
                r="5.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M13 13l4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </span>
      )}
      <div
        className={
          expanded
            ? 'absolute inset-0 z-10 flex items-center gap-2 bg-card px-4 sm:static sm:p-0'
            : 'relative hidden sm:block'
        }
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && results.length && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search recipes…"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && active >= 0 ? optionId(active) : undefined
            }
            aria-label="Search recipes"
            className="min-h-11 w-full rounded-full border border-line-strong bg-cream px-4 py-2 text-base focus-visible:border-leaf-deep focus-visible:ring-3 focus-visible:ring-leaf/50 focus-visible:outline-none pointer-fine:text-sm sm:w-56"
          />
          {searching && (
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-soft">
              …
            </span>
          )}
        </div>
        {expanded && (
          <button
            type="button"
            onClick={() => {
              setExpanded(false)
              setOpen(false)
              setQuery('')
            }}
            className="link px-1 sm:hidden"
          >
            Cancel
          </button>
        )}
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching recipes"
          className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.5rem)] z-40 max-h-[60dvh] overflow-y-auto rounded-2xl border border-line bg-card py-1 shadow-lg sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:max-h-96 sm:w-96"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-soft">
              No recipes match.
            </li>
          ) : (
            results.map((r, i) => (
              // Options aren't focusable themselves: focus stays in the
              // combobox and arrow keys move aria-activedescendant.
              <li
                key={r.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onClick={() => choose(r)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${
                  i === active ? 'bg-cream' : ''
                }`}
              >
                <span>
                  <span className="font-semibold">{r.title}</span>
                  {r.attribution && (
                    <span className="ml-2 text-ink-soft">{r.attribution}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-leaf-deep">
                  {r.sectionName}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
