import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-slate-600 underline">
        Back to home
      </Link>
    </>
  )
}
