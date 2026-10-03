import type { ReactNode } from 'react'

type DemoLayoutProps = {
  title: string
  description: string
  children: ReactNode
}

export function DemoLayout({ title, description, children }: DemoLayoutProps) {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 mb-8 text-slate-600">{description}</p>
      {children}
    </section>
  )
}
