/**
 * English note: Central route registry for app layouts, auth, and role-guarded pages.
 */
import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { PageLoading } from '../components/PageLoading'
import { RoleGuard } from '../components/RoleGuard'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import {
  AdminDashboardPage,
  AdmissionPage,
  CandidatesPage,
  CandidateRegionsPage,
  CombinationsPage,
  CouncilDashboardPage,
  CriteriaPage,
  CutoffPage,
  DashboardRedirectPage,
  DistributionPage,
  ExclusionsPage,
  FacultyDashboardPage,
  LoginPage,
  MajorsPage,
  NotFoundPage,
  PercentilePage,
  ScoringPage,
  SubjectsPage,
  WishesPage,
} from './lazyPages'

const suspense = (node: ReactNode) => <Suspense fallback={<PageLoading />}>{node}</Suspense>

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: suspense(<LoginPage />) }],
  },
  {
    path: '/',
    element: (
      <RoleGuard>
        <AppLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: suspense(<DashboardRedirectPage />) },
      {
        path: 'dashboard/admin',
        element: suspense(
          <RoleGuard allowedRoles={['admin']}>
            <AdminDashboardPage />
          </RoleGuard>,
        ),
      },
      {
        path: 'dashboard/council',
        element: suspense(
          <RoleGuard allowedRoles={['council']}>
            <CouncilDashboardPage />
          </RoleGuard>,
        ),
      },
      {
        path: 'dashboard/faculty',
        element: suspense(
          <RoleGuard allowedRoles={['faculty']}>
            <FacultyDashboardPage />
          </RoleGuard>,
        ),
      },
      {
        path: 'imports/candidates',
        element: suspense(<CandidatesPage />),
      },
      {
        path: 'imports/candidate-regions',
        element: suspense(<CandidateRegionsPage />),
      },
      {
        path: 'imports/combinations',
        element: suspense(<CombinationsPage />),
      },
      {
        path: 'imports/subjects',
        element: suspense(<SubjectsPage />),
      },
      {
        path: 'imports/majors',
        element: suspense(<MajorsPage />),
      },
      {
        path: 'imports/wishes',
        element: suspense(<WishesPage />),
      },
      {
        path: 'imports/exclusions',
        element: suspense(<ExclusionsPage />),
      },
      {
        path: 'imports/criteria',
        element: suspense(<CriteriaPage />),
      },
      {
        path: 'analytics/scoring',
        element: suspense(<ScoringPage />),
      },
      {
        path: 'analytics/distribution',
        element: suspense(<DistributionPage />),
      },
      {
        path: 'analytics/percentile',
        element: suspense(<PercentilePage />),
      },
      {
        path: 'admission/cutoff',
        element: suspense(<CutoffPage />),
      },
      {
        path: 'admission/results',
        element: suspense(<AdmissionPage />),
      },
    ],
  },
  { path: '*', element: suspense(<NotFoundPage />) },
])
