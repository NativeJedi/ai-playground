import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { demos } from './demos/registry'
import { RootLayout } from './layouts/RootLayout'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<HomePage />} />
          {demos.map(({ path, Page }) => (
            <Route key={path} path={path} element={<Page />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
