import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ManageSections } from '../components/ManageSections'
import { RecipeList, RecipeRow } from '../components/RecipeRow'
import { Sprig } from '../components/Sprig'
import { joinDetail } from '../lib/recipe-text'
import { listSections, recentRecipes } from '../server/recipes'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [sectionList, recent] = await Promise.all([
      listSections(),
      recentRecipes(),
    ])
    return { sectionList, recent }
  },
  component: Home,
})

function Home() {
  const { sectionList, recent } = Route.useLoaderData()
  const [managing, setManaging] = useState(false)
  return (
    <main className="page max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-petal-deep">
            <Sprig className="h-4 w-8" />
            Recipes from Mama
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            The family recipe shelf
          </h1>
        </div>
        <Link to="/recipes/new" className="btn-primary">
          + Add a recipe
        </Link>
      </div>

      <h2 className="mb-3 font-display text-2xl font-semibold tracking-tight">
        Sections
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4">
        {sectionList.map((s) => (
          <li key={s.id}>
            <Link
              to="/sections/$sectionId"
              params={{ sectionId: String(s.id) }}
              className="block h-full rounded-2xl border border-line bg-gradient-to-br from-petal/30 via-card to-leaf/15 px-4 py-4 shadow-sm transition hover:border-leaf hover:shadow sm:px-6 sm:py-6"
            >
              <div className="font-display text-lg font-semibold sm:text-xl">
                {s.name}
              </div>
              <div className="mt-1 text-sm text-ink-soft">
                {s.recipeCount} {s.recipeCount === 1 ? 'recipe' : 'recipes'}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-2 text-center">
        <button
          onClick={() => setManaging((m) => !m)}
          aria-expanded={managing}
          className="link"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-4">
            <path
              d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          {managing ? 'Done editing sections' : 'Edit sections'}
        </button>
        {managing && <ManageSections sections={sectionList} />}
      </div>

      <h2 className="mt-8 mb-3 font-display text-2xl font-semibold tracking-tight">
        Recently added
      </h2>
      {recent.length === 0 ? (
        <p className="text-ink-soft">No recipes yet — add the first one.</p>
      ) : (
        <RecipeList>
          {recent.map((r) => (
            <RecipeRow
              key={r.id}
              id={r.id}
              title={r.title}
              imageId={r.imageId}
              detail={joinDetail([r.attribution, `added by ${r.addedBy}`])}
              tag={r.sectionName}
            />
          ))}
        </RecipeList>
      )}
    </main>
  )
}
