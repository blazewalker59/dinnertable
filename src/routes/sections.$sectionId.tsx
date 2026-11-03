import { Link, createFileRoute } from '@tanstack/react-router'
import { RecipeList, RecipeRow } from '../components/RecipeRow'
import { getSection } from '../server/recipes'

export const Route = createFileRoute('/sections/$sectionId')({
  loader: ({ params }) => getSection({ data: Number(params.sectionId) }),
  component: SectionPage,
})

function SectionPage() {
  const { section, recipes } = Route.useLoaderData()
  return (
    <main className="page max-w-3xl">
      <div className="-mx-2 flex items-center justify-between">
        <Link to="/" className="link px-2 font-normal">
          ← All sections
        </Link>
        <Link to="/recipes/new" className="link px-2">
          + Add a recipe
        </Link>
      </div>
      <h1 className="mt-2 mb-6 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {section.name}
      </h1>
      {recipes.length === 0 ? (
        <p className="text-ink-soft">Nothing here yet.</p>
      ) : (
        <RecipeList>
          {recipes.map((r) => (
            <RecipeRow
              key={r.id}
              id={r.id}
              title={r.title}
              imageId={r.imageId}
              detail={r.attribution}
              isFavorite={r.isFavorite}
            />
          ))}
        </RecipeList>
      )}
    </main>
  )
}
