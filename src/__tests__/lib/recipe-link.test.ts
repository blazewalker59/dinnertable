import { describe, expect, it } from 'vitest'
import {
  decodeEntities,
  htmlToText,
  recipeFromJsonLd,
  sectionForCategories,
} from '@/lib/recipe-link'

const page = (jsonLd: unknown, extra = '') => `<!doctype html><html><head>
<title>Best Chili | A Blog</title>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head><body>${extra}</body></html>`

describe('recipeFromJsonLd', () => {
  it('reads a schema.org Recipe inside an @graph', () => {
    const html = page({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'Best Chili' },
        {
          '@type': ['Recipe'],
          name: 'Best Chili &amp; Cornbread',
          author: { '@type': 'Person', name: 'Ree' },
          recipeYield: ['6', '6 servings'],
          description: 'A <b>cozy</b> pot.',
          recipeCategory: 'Main Course',
          recipeCuisine: ['Tex-Mex'],
          recipeIngredient: ['1 lb beef', ' 2&frac12; cups beans '],
          recipeInstructions: [
            {
              '@type': 'HowToSection',
              name: 'Chili',
              itemListElement: [
                { '@type': 'HowToStep', text: 'Brown the beef.' },
                { '@type': 'HowToStep', text: 'Add beans.' },
              ],
            },
            { '@type': 'HowToStep', text: 'Serve hot.' },
          ],
        },
      ],
    })
    expect(recipeFromJsonLd(html)).toEqual({
      title: 'Best Chili & Cornbread',
      servings: '6 servings',
      attribution: 'Ree',
      ingredients: '1 lb beef\n2½ cups beans',
      instructions: 'Chili:\n\nBrown the beef.\n\nAdd beans.\n\nServe hot.',
      notes: 'A cozy pot.',
      categories: ['Main Course', 'Tex-Mex'],
    })
  })

  it('accepts instructions as one HTML string and a numeric yield', () => {
    const html = page([
      {
        '@type': 'Recipe',
        name: 'Toast',
        recipeYield: 2,
        recipeInstructions: '<p>Toast bread.</p><p>Butter it.</p>',
      },
    ])
    expect(recipeFromJsonLd(html)).toMatchObject({
      servings: '2',
      instructions: 'Toast bread.\n\nButter it.',
      ingredients: null,
      attribution: null,
    })
  })

  it('returns null without a Recipe, or with broken JSON', () => {
    expect(recipeFromJsonLd(page({ '@type': 'Article', name: 'News' }))).toBeNull()
    expect(
      recipeFromJsonLd(
        '<script type="application/ld+json">{not json</script>',
      ),
    ).toBeNull()
    expect(recipeFromJsonLd('<p>no data</p>')).toBeNull()
  })
})

describe('htmlToText', () => {
  it('keeps the visible text as lines, dropping scripts, styles and nav', () => {
    const text = htmlToText(
      '<nav>Home</nav><style>p{}</style><h1>Pie</h1><p>2 eggs<br>1 cup&nbsp;milk</p><script>x()</script><ul><li>Bake</li></ul>',
    )
    expect(text).toBe('Pie\n2 eggs\n1 cup milk\nBake')
  })
})

describe('decodeEntities', () => {
  it('decodes named and numeric entities, leaving unknown ones', () => {
    expect(decodeEntities('&amp; &#39; &#x2013; &deg; &bogus;')).toBe(
      "& ' – ° &bogus;",
    )
  })
})

describe('sectionForCategories', () => {
  const sections = ["Mama's Classics", 'Soups and Dips', 'Brunch and Breakfast', 'Desserts']

  it('files by a shared word, ignoring plurals', () => {
    expect(sectionForCategories(['Dessert'], sections)).toBe('Desserts')
    expect(sectionForCategories(['Breakfast', 'American'], sections)).toBe(
      'Brunch and Breakfast',
    )
    expect(sectionForCategories(['Soup'], sections)).toBe('Soups and Dips')
  })

  it('returns null when nothing matches', () => {
    expect(sectionForCategories(['Main Course'], sections)).toBeNull()
    expect(sectionForCategories([], sections)).toBeNull()
  })
})
