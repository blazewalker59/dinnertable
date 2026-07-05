import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { RecipeForm } from '../components/RecipeForm'
import {
  deleteRecipe,
  getRecipe,
  listSections,
  updateRecipe,
} from '../server/recipes'

export const Route = createFileRoute('/recipes_/$recipeId/edit')({
  loader: async ({ params }) => {
    const id = Number(params.recipeId)
    const [detail, sections] = await Promise.all([
      getRecipe({ data: id }),
      listSections(),
    ])
    return { detail, sections }
  },
  component: EditRecipe,
})

function EditRecipe() {
  const { detail, sections } = Route.useLoaderData()
  const navigate = useNavigate()
  const recipe = detail.recipe

  async function handleDelete() {
    if (!confirm(`Delete "${recipe.title}"? It can be recovered by an admin.`))
      return
    const { sectionId } = await deleteRecipe({ data: recipe.id })
    await navigate({
      to: '/sections/$sectionId',
      params: { sectionId: String(sectionId) },
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Edit recipe
        </h1>
        <button
          onClick={handleDelete}
          className="text-sm font-semibold text-petal-deep hover:text-ink"
        >
          Delete
        </button>
      </div>
      <RecipeForm
        sections={sections}
        initial={recipe}
        submitLabel="Save changes"
        onSubmit={async (fields) => {
          await updateRecipe({ data: { id: recipe.id, ...fields } })
          await navigate({
            to: '/recipes/$recipeId',
            params: { recipeId: String(recipe.id) },
          })
        }}
      />
    </main>
  )
}
