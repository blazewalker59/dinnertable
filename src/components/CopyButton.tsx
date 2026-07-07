import { useRef, useState } from 'react'

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 text-sm font-semibold text-leaf-deep transition hover:text-ink"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
            <path
              d="M4 10.5 8 14.5 16 5.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
            <rect
              x="7"
              y="7"
              width="9"
              height="10"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M13 4.5V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}
