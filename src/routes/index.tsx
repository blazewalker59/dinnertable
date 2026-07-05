import { Link, createFileRoute } from '@tanstack/react-router'
import { Sprig } from '../components/Sprig'
import { listSections } from '../server/recipes'

export const Route = createFileRoute('/')({
  loader: () => listSections(),
  component: Home,
})

function Home() {
  const sectionList = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10 text-center">
        <Sprig className="mx-auto mb-3 h-8 w-16" />
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          The family table
        </h1>
        <p className="mt-3 text-ink-soft">
          Recipes worth keeping, from our kitchen to yours.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {sectionList.map((s) => (
          <li key={s.id}>
            <Link
              to="/sections/$sectionId"
              params={{ sectionId: String(s.id) }}
              className="block rounded-2xl border border-line bg-card px-6 py-6 shadow-sm transition hover:border-leaf hover:shadow"
            >
              <div className="font-display text-xl font-semibold">{s.name}</div>
              <div className="mt-1 text-sm text-ink-soft">
                {s.recipeCount} {s.recipeCount === 1 ? 'recipe' : 'recipes'}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
