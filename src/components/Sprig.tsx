// Floral accent motif (ADR-0011): a small botanical sprig.
export function Sprig({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 32"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M4 28 C 20 24, 44 20, 60 6"
        stroke="var(--color-leaf-deep)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 25 C 16 19, 20 15, 25 14 C 25 20, 23 24, 18 25 Z"
        fill="var(--color-leaf)"
      />
      <path
        d="M34 20 C 31 15, 34 10, 39 8 C 40 14, 39 18, 34 20 Z"
        fill="var(--color-leaf)"
      />
      <circle cx="58" cy="6" r="4" fill="var(--color-petal)" />
      <circle cx="58" cy="6" r="1.6" fill="var(--color-petal-deep)" />
    </svg>
  )
}
