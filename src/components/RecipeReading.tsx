// The recipe page's "at the stove" pieces: big type, numbered steps, a
// tick-off ingredient list, and a keep-the-screen-on switch.
import { parseIngredients, parseSteps } from '../lib/recipe-text'
import { useWakeLock } from '../lib/useWakeLock'
import { Sprig } from './Sprig'

export function SectionHeading({
  children,
  action,
  tone = 'leaf',
}: {
  children: React.ReactNode
  action?: React.ReactNode
  tone?: 'leaf' | 'petal'
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-2">
      <h2
        className={`flex items-center gap-2 font-display text-xl font-semibold sm:text-2xl ${
          tone === 'petal' ? 'text-petal-deep' : 'text-leaf-deep'
        }`}
      >
        <Sprig className="h-3 w-6" />
        {children}
      </h2>
      {action}
    </div>
  )
}

/** One tickable row per ingredient. Ticks live only while the page is open. */
export function IngredientChecklist({ text }: { text: string }) {
  const lines = parseIngredients(text)
  return (
    <ul className="divide-y divide-line">
      {lines.map((line, i) =>
        line.kind === 'heading' ? (
          <li
            key={i}
            className="pt-4 pb-1 font-display text-lg font-semibold text-ink first:pt-0"
          >
            {line.text}
          </li>
        ) : (
          <li key={i}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-lg leading-7 has-checked:text-ink-soft has-checked:line-through">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-leaf-deep"
              />
              <span>{line.text}</span>
            </label>
          </li>
        ),
      )}
    </ul>
  )
}

export function Steps({ text }: { text: string }) {
  const steps = parseSteps(text)
  return (
    <ol className="space-y-5">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4">
          <span
            aria-hidden
            className="w-7 shrink-0 text-right font-display text-2xl leading-8 font-semibold text-leaf-deep tabular-nums"
          >
            {i + 1}
          </span>
          <p className="max-w-[65ch] text-lg leading-8">
            <span className="sr-only">Step {i + 1}: </span>
            {step}
          </p>
        </li>
      ))}
    </ol>
  )
}

export function KeepScreenOn() {
  const { supported, on, setOn } = useWakeLock()
  if (!supported) return null
  return (
    <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-full border border-line bg-card py-1.5 pr-4 pl-1.5 text-sm font-semibold select-none">
      <input
        type="checkbox"
        role="switch"
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-7 w-12 rounded-full bg-line-strong/50 transition peer-checked:bg-leaf-deep peer-focus-visible:ring-2 peer-focus-visible:ring-leaf-deep peer-focus-visible:ring-offset-2 after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
      {on ? 'Screen stays on' : 'Keep screen on'}
    </label>
  )
}
