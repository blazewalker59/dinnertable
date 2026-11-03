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

  const toRecipe = () =>
    navigate({
      to: '/recipes/$recipeId',
      params: { recipeId: String(recipe.id) },
    })

  return (
    <main className="page max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">
        Edit recipe
      </h1>
      <RecipeForm
        sections={sections}
        initial={recipe}
        submitLabel="Save changes"
        onCancel={toRecipe}
        onSubmit={async (fields) => {
          await updateRecipe({ data: { id: recipe.id, ...fields } })
          await toRecipe()
        }}
      />
      <section className="mt-12 rounded-2xl border border-petal-deep/40 px-5 py-4">
        <h2 className="font-semibold text-petal-deep">Delete this recipe</h2>
        <p className="mt-1 text-sm text-ink-soft">
          It disappears for everyone. An admin can bring it back.
        </p>
        <button onClick={handleDelete} className="mt-3 btn-danger">
          Delete recipe
        </button>
      </section>
    </main>
  )
}
