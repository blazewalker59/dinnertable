import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { asc } from 'drizzle-orm'
import { db } from '../db'
import { sections } from '../db/schema'

const getSections = createServerFn().handler(async () => {
  return db().select().from(sections).orderBy(asc(sections.sortOrder))
})

export const Route = createFileRoute('/')({
  loader: () => getSections(),
  component: Home,
})

function Home() {
  const sectionList = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-2 text-4xl font-bold tracking-tight">dinnertable</h1>
      <p className="mb-10 text-neutral-500">The family recipe shelf.</p>
      <ul className="space-y-2">
        {sectionList.map((s) => (
          <li key={s.id} className="rounded-lg border border-neutral-200 px-4 py-3">
            {s.name}
          </li>
        ))}
      </ul>
    </main>
  )
}
