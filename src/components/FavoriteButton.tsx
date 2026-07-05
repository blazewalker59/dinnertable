import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toggleFavorite } from '../server/favorites'

export function FavoriteButton({
  recipeId,
  isFavorite,
}: {
  recipeId: number
  isFavorite: boolean
}) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const shown = optimistic ?? isFavorite

  async function toggle() {
    setOptimistic(!shown)
    try {
      await toggleFavorite({ data: recipeId })
      await router.invalidate()
    } finally {
      setOptimistic(null)
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={shown ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={shown}
      className={`text-2xl leading-none transition ${
        shown ? 'text-petal-deep' : 'text-line hover:text-petal-deep'
      }`}
    >
      {shown ? '♥' : '♡'}
    </button>
  )
}
