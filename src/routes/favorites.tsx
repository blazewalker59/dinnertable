import { Link, createFileRoute } from '@tanstack/react-router'
import { RecipeList, RecipeRow } from '../components/RecipeRow'
import { myFavorites } from '../server/favorites'

export const Route = createFileRoute('/favorites')({
  loader: () => myFavorites(),
  component: FavoritesPage,
})

function FavoritesPage() {
  const favoritesList = Route.useLoaderData()
  return (
    <main className="page max-w-3xl">
      <Link to="/" className="link -ml-2 px-2 font-normal">
        ← All recipes
      </Link>
      <h1 className="mt-2 mb-6 font-display text-3xl font-semibold tracking-tight">
        My favorites
      </h1>
      {favoritesList.length === 0 ? (
        <p className="text-ink-soft">
          No favorites yet — tap the ♡ on any recipe.
        </p>
      ) : (
        <RecipeList>
          {favoritesList.map((r) => (
            <RecipeRow
              key={r.id}
              id={r.id}
              title={r.title}
              imageId={r.imageId}
              detail={r.attribution}
              tag={r.sectionName}
            />
          ))}
        </RecipeList>
      )}
    </main>
  )
}
