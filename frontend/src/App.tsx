import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { ComparePage } from './pages/ComparePage'
import { RefinePage } from './pages/RefinePage'
import { FinalRecommendationPage } from './pages/FinalRecommendationPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>
        <Route element={<AppLayout fullHeight />}>
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/refine" element={<RefinePage />} />
          <Route path="/recommendation" element={<FinalRecommendationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
