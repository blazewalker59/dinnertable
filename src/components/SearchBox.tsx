import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
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
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  function choose(r: Result) {
    setOpen(false)
    setQuery('')
    navigate({ to: '/recipes/$recipeId', params: { recipeId: String(r.id) } })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') setOpen(false)
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

  return (
    <div ref={boxRef} className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && results.length && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search…"
        role="combobox"
        aria-expanded={open}
        aria-label="Search recipes"
        className="w-32 rounded-full border border-line bg-cream px-4 py-1.5 text-sm focus:border-leaf-deep focus:outline-none sm:w-56"
      />
      {searching && (
        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-soft">
          …
        </span>
      )}
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-40 mt-2 max-h-96 w-[min(24rem,90vw)] overflow-y-auto rounded-2xl border border-line bg-card py-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-soft">
              No recipes match.
            </li>
          ) : (
            results.map((r, i) => (
              <li key={r.id} role="option" aria-selected={i === active}>
                <button
                  onClick={() => choose(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left text-sm ${
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
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
