import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { DashboardLayout } from '../layouts/DashboardLayout'

// Lazy loaded page components for optimal load performance
import { Login } from '../pages/Login'
import { Dashboard } from '../pages/Dashboard'
import { CreateEditTest } from '../pages/CreateEditTest'
import { QuestionManagement } from '../pages/QuestionManagement'
import { PreviewPublish } from '../pages/PreviewPublish'
import { NotFound } from '../pages/NotFound'

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages Wrapper */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Authenticated Dashboard Pages Wrapper */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tests/new" element={<CreateEditTest />} />
          <Route path="/tests/tracking" element={<Dashboard />} />
          <Route path="/tests/:id/edit" element={<CreateEditTest />} />
          <Route path="/tests/:id/questions" element={<QuestionManagement />} />
          <Route path="/tests/:id/preview" element={<PreviewPublish />} />
        </Route>
      </Route>

      {/* 404 Page and catch-alls */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}
