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
  CandidatePriorityObjectsPage,
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
const withRoles = (allowedRoles: ('admin' | 'council' | 'faculty')[], node: ReactNode) =>
  suspense(<RoleGuard allowedRoles={allowedRoles}>{node}</RoleGuard>)

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
        element: withRoles(['admin'], <CandidatesPage />),
      },
      {
        path: 'imports/candidate-regions',
        element: withRoles(['admin'], <CandidateRegionsPage />),
      },
      {
        path: 'imports/candidate-priority-objects',
        element: withRoles(['admin'], <CandidatePriorityObjectsPage />),
      },
      {
        path: 'imports/combinations',
        element: withRoles(['admin'], <CombinationsPage />),
      },
      {
        path: 'imports/subjects',
        element: withRoles(['admin'], <SubjectsPage />),
      },
      {
        path: 'imports/majors',
        element: withRoles(['admin'], <MajorsPage />),
      },
      {
        path: 'imports/wishes',
        element: withRoles(['admin'], <WishesPage />),
      },
      {
        path: 'imports/exclusions',
        element: withRoles(['admin'], <ExclusionsPage />),
      },
      {
        path: 'imports/criteria',
        element: withRoles(['admin'], <CriteriaPage />),
      },
      {
        path: 'analytics/scoring',
        element: withRoles(['admin', 'council'], <ScoringPage />),
      },
      {
        path: 'analytics/distribution',
        element: withRoles(['admin', 'council', 'faculty'], <DistributionPage />),
      },
      {
        path: 'analytics/percentile',
        element: withRoles(['admin', 'council'], <PercentilePage />),
      },
      {
        path: 'admission/cutoff',
        element: withRoles(['admin', 'council', 'faculty'], <CutoffPage />),
      },
      {
        path: 'admission/results',
        element: withRoles(['admin', 'council'], <AdmissionPage />),
      },
    ],
  },
  { path: '*', element: suspense(<NotFoundPage />) },
])
