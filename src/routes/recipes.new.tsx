import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { RecipeForm } from '../components/RecipeForm'
import { createRecipe, listSections } from '../server/recipes'

export const Route = createFileRoute('/recipes/new')({
  loader: () => listSections(),
  component: NewRecipe,
})

function NewRecipe() {
  const sections = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl font-semibold tracking-tight">
        Add a recipe
      </h1>
      <RecipeForm
        sections={sections}
        submitLabel="Add recipe"
        onSubmit={async (fields) => {
          const { id } = await createRecipe({ data: fields })
          await navigate({
            to: '/recipes/$recipeId',
            params: { recipeId: String(id) },
          })
        }}
      />
    </main>
  )
}
