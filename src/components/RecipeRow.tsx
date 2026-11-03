import { Link } from '@tanstack/react-router'
import { Sprig } from './Sprig'

/** One recipe in a list: thumbnail, title, and a stacked detail line. */
export function RecipeRow({
  id,
  title,
  imageId,
  detail,
  tag,
  isFavorite,
}: {
  id: number
  title: string
  imageId: string | null
  /** Secondary line under the title, e.g. "Mama · added by Blaze". */
  detail?: string | null
  /** Short label on the right on wide screens (under the title on phones). */
  tag?: string | null
  isFavorite?: boolean
}) {
  return (
    <li>
      <Link
        to="/recipes/$recipeId"
        params={{ recipeId: String(id) }}
        className="flex items-center gap-4 px-4 py-3 transition hover:bg-cream"
      >
        {imageId ? (
          <img
            src={`/img/${imageId}/thumb`}
            alt=""
            loading="lazy"
            className="size-14 shrink-0 rounded-xl border border-line object-cover"
          />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-line bg-cream">
            <Sprig className="h-5 w-10" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-4">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {title}
              {isFavorite && (
                <span
                  className="ml-1.5 text-petal-accent"
                  aria-label="Favorited"
                >
                  ♥
                </span>
              )}
            </span>
            {detail && (
              <span className="block truncate text-sm text-ink-soft">
                {detail}
              </span>
            )}
          </span>
          {tag && (
            <span className="shrink-0 text-sm text-leaf-deep">{tag}</span>
          )}
        </span>
      </Link>
    </li>
  )
}

export function RecipeList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
      {children}
    </ul>
  )
}
