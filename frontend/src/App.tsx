import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AuthGuard from './components/AuthGuard'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Dashboard from './pages/Dashboard'
import Monitor from './pages/Monitor'
import Detection from './pages/Detection'
import Tracking from './pages/Tracking'
import PathPlanning from './pages/PathPlanning'
import Mission from './pages/Mission'
import Settings from './pages/Settings'
import Devices from './pages/Devices'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="monitor" element={<Monitor />} />
        <Route path="detection" element={<Detection />} />
        <Route path="tracking" element={<Tracking />} />
        <Route path="path-planning" element={<PathPlanning />} />
        <Route path="mission" element={<Mission />} />
        <Route path="devices" element={<Devices />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
