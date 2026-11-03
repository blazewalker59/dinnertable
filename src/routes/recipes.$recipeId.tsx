import { Link, createFileRoute } from '@tanstack/react-router'
import { CopyButton } from '../components/CopyButton'
import { FavoriteButton } from '../components/FavoriteButton'
import {
  IngredientChecklist,
  KeepScreenOn,
  SectionHeading,
  Steps,
} from '../components/RecipeReading'
import { RecipeImages } from '../components/RecipeImages'
import { joinDetail } from '../lib/recipe-text'
import { getRecipe } from '../server/recipes'

export const Route = createFileRoute('/recipes/$recipeId')({
  loader: ({ params }) => getRecipe({ data: Number(params.recipeId) }),
  component: RecipePage,
})

function RecipePage() {
  const { recipe, sectionName, addedBy, images, isFavorite } =
    Route.useLoaderData()
  return (
    <main className="page max-w-2xl">
      <div className="-ml-2 flex items-center justify-between">
        <Link
          to="/sections/$sectionId"
          params={{ sectionId: String(recipe.sectionId) }}
          className="link px-2 font-normal"
        >
          ← {sectionName}
        </Link>
        <span className="flex items-center gap-1">
          <FavoriteButton recipeId={recipe.id} isFavorite={isFavorite} />
          <Link
            to="/recipes/$recipeId/edit"
            params={{ recipeId: String(recipe.id) }}
            className="link px-3"
          >
            Edit
          </Link>
        </span>
      </div>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {recipe.title}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {joinDetail([
          recipe.attribution && `From ${recipe.attribution}`,
          recipe.servings,
          `added by ${addedBy}`,
        ])}
      </p>
      <KeepScreenOn />

      <RecipeImages recipeId={recipe.id} title={recipe.title} images={images} />

      {recipe.ingredients && (
        <section className="mt-10">
          <SectionHeading
            action={
              <CopyButton text={recipe.ingredients} label="Copy ingredients" />
            }
          >
            Ingredients
          </SectionHeading>
          <IngredientChecklist text={recipe.ingredients} />
        </section>
      )}

      {recipe.instructions && (
        <section className="mt-10">
          <SectionHeading>Instructions</SectionHeading>
          <Steps text={recipe.instructions} />
        </section>
      )}

      {recipe.notes && (
        <section className="mt-10">
          <SectionHeading tone="petal">Notes</SectionHeading>
          <div className="rounded-2xl bg-petal/35 px-5 py-4 text-lg leading-8 whitespace-pre-line sm:px-6">
            {recipe.notes}
          </div>
        </section>
      )}
    </main>
  )
}
