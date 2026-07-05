import { Link, createFileRoute } from '@tanstack/react-router'
import { getRecipe } from '../server/recipes'

export const Route = createFileRoute('/recipes/$recipeId')({
  loader: ({ params }) => getRecipe({ data: Number(params.recipeId) }),
  component: RecipePage,
})

function RecipePage() {
  const { recipe, sectionName, addedBy } = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link
          to="/sections/$sectionId"
          params={{ sectionId: String(recipe.sectionId) }}
          className="text-sm text-leaf-deep hover:text-ink"
        >
          ← {sectionName}
        </Link>
        <Link
          to="/recipes/$recipeId/edit"
          params={{ recipeId: String(recipe.id) }}
          className="text-sm font-semibold text-leaf-deep hover:text-ink"
        >
          Edit
        </Link>
      </div>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {recipe.title}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {recipe.attribution && <>From {recipe.attribution} · </>}
        {recipe.servings && <>{recipe.servings} · </>}
        added by {addedBy}
      </p>

      {recipe.ingredients && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-leaf-deep">
            Ingredients
          </h2>
          <div className="rounded-2xl border border-line bg-card px-6 py-5 whitespace-pre-line leading-relaxed">
            {recipe.ingredients}
          </div>
        </section>
      )}

      {recipe.instructions && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-leaf-deep">
            Instructions
          </h2>
          <div className="whitespace-pre-line leading-relaxed">
            {recipe.instructions}
          </div>
        </section>
      )}

      {recipe.notes && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-petal-deep">
            Notes
          </h2>
          <div className="rounded-2xl border border-petal bg-card px-6 py-5 whitespace-pre-line leading-relaxed">
            {recipe.notes}
          </div>
        </section>
      )}
    </main>
  )
}
