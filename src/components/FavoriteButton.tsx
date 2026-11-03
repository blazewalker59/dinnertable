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
      className={`icon-btn text-2xl leading-none hover:bg-petal/40 ${
        shown ? 'text-petal-accent' : 'text-line-strong hover:text-petal-accent'
      }`}
    >
      {shown ? '♥' : '♡'}
    </button>
  )
}
