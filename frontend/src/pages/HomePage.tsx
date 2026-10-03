import { Link } from 'react-router-dom'
import { demos } from '../demos/registry'

export function HomePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">AI Playground</h1>
      <p className="mt-2 text-slate-600">
        A collection of small AI demos. Each demo is a page here and a service in the backend.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {demos.map((demo) => (
          <li key={demo.path}>
            <Link
              to={demo.path}
              className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
            >
              <h2 className="font-medium">{demo.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{demo.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
