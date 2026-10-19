import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useProgress } from '../store/progress'
import { WelcomePage } from '../pages/Welcome'
import { HomePage } from '../pages/Home'
import { SettingsPage } from '../pages/Settings'
import { FreePlayPage } from '../pages/FreePlay'
import { LibraryPage } from '../pages/Library'
import { PlayAlongPage } from '../pages/PlayAlong'
import { ImportMidiPage } from '../pages/ImportMidi'
import { DrillsPage } from '../pages/Drills'
import { EarPage } from '../pages/Ear'
import { RhythmPage } from '../pages/Rhythm'
import { LessonsPage } from '../pages/Lessons'
import { LessonPage } from '../pages/Lesson'
import { ReferencePage } from '../pages/Reference'
import { DashboardPage } from '../pages/Dashboard'
import { StarsPage } from '../pages/Stars'

function ProgressRoute() {
  const kid = useProgress((s) => s.mode === 'kid')
  return kid ? <StarsPage /> : <DashboardPage />
}

export function AppRoutes() {
  const createdAt = useProgress((s) => s.createdAt)
  const loc = useLocation()
  if (!createdAt && loc.pathname !== '/welcome') return <Navigate to="/welcome" replace />
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/free" element={<FreePlayPage />} />
      <Route path="/songs" element={<LibraryPage />} />
      <Route path="/songs/import" element={<ImportMidiPage />} />
      <Route path="/songs/:id" element={<PlayAlongPage />} />
      <Route path="/drills" element={<DrillsPage />} />
      <Route path="/ear" element={<EarPage />} />
      <Route path="/rhythm" element={<RhythmPage />} />
      <Route path="/lessons" element={<LessonsPage />} />
      <Route path="/lessons/:id" element={<LessonPage />} />
      <Route path="/reference" element={<ReferencePage />} />
      <Route path="/progress" element={<ProgressRoute />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
