import { describe, it, expect } from 'vitest'
import { joinDetail, parseIngredients, parseSteps } from '@/lib/recipe-text'

describe('joinDetail', () => {
  it('joins present parts and capitalizes the first letter', () => {
    expect(joinDetail([null, '4 servings', 'added by Blaze'])).toBe(
      '4 servings · added by Blaze',
    )
    expect(joinDetail([undefined, null, 'added by Blaze'])).toBe(
      'Added by Blaze',
    )
  })

  it('skips blank parts and returns null when nothing is left', () => {
    expect(joinDetail(['  ', null])).toBeNull()
  })
})

describe('parseSteps', () => {
  it('treats blank-line paragraphs as steps, joining wrapped lines', () => {
    expect(
      parseSteps('Brown the beef\nin a skillet.\n\nAdd the sauce.\n\nSimmer.'),
    ).toEqual(['Brown the beef in a skillet.', 'Add the sauce.', 'Simmer.'])
  })

  it('falls back to one step per line when there are no blank lines', () => {
    expect(parseSteps('Mix.\nBake.\r\nCool.')).toEqual(['Mix.', 'Bake.', 'Cool.'])
  })

  it('drops existing numbering and bullets', () => {
    expect(
      parseSteps('1. Mix\n2) Pour\nStep 3: Bake\n- Cool\n• Serve'),
    ).toEqual(['Mix', 'Pour', 'Bake', 'Cool', 'Serve'])
  })

  it('keeps quantities that only look like numbering', () => {
    expect(parseSteps('1.5 cups milk go in\n1-2 minutes more')).toEqual([
      '1.5 cups milk go in',
      '1-2 minutes more',
    ])
  })

  it('returns nothing for empty text', () => {
    expect(parseSteps(null)).toEqual([])
    expect(parseSteps(' \n ')).toEqual([])
  })
})

describe('parseIngredients', () => {
  it('makes one item per line and a heading for lines ending in a colon', () => {
    expect(parseIngredients('Cake:\n2 eggs\n- 1 cup sugar\n\nFrosting:\nbutter')).toEqual([
      { kind: 'heading', text: 'Cake' },
      { kind: 'item', text: '2 eggs' },
      { kind: 'item', text: '1 cup sugar' },
      { kind: 'heading', text: 'Frosting' },
      { kind: 'item', text: 'butter' },
    ])
  })

  it('returns nothing for empty text', () => {
    expect(parseIngredients(undefined)).toEqual([])
  })
})
