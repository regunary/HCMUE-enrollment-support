/**
 * English note: Lazy route targets for code splitting; kept separate from router config for Fast Refresh lint.
 */
import { lazy } from 'react'

export const AdmissionPage = lazy(() =>
  import('../features/admission/AdmissionPage').then((m) => ({ default: m.AdmissionPage })),
)
export const CutoffPage = lazy(() =>
  import('../features/admission/CutoffPage').then((m) => ({ default: m.CutoffPage })),
)
export const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
export const CandidatesPage = lazy(() =>
  import('../features/candidates/CandidatesPage').then((m) => ({ default: m.CandidatesPage })),
)
export const CombinationsPage = lazy(() =>
  import('../features/combinations/CombinationsPage').then((m) => ({ default: m.CombinationsPage })),
)
export const CriteriaPage = lazy(() =>
  import('../features/criteria/CriteriaPage').then((m) => ({ default: m.CriteriaPage })),
)
export const AdminDashboardPage = lazy(() =>
  import('../features/dashboard/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
export const CouncilDashboardPage = lazy(() =>
  import('../features/dashboard/CouncilDashboardPage').then((m) => ({ default: m.CouncilDashboardPage })),
)
export const FacultyDashboardPage = lazy(() =>
  import('../features/dashboard/FacultyDashboardPage').then((m) => ({ default: m.FacultyDashboardPage })),
)
export const DistributionPage = lazy(() =>
  import('../features/distribution/DistributionPage').then((m) => ({ default: m.DistributionPage })),
)
export const ExclusionsPage = lazy(() =>
  import('../features/exclusions/ExclusionsPage').then((m) => ({ default: m.ExclusionsPage })),
)
export const MajorsPage = lazy(() => import('../features/majors/MajorsPage').then((m) => ({ default: m.MajorsPage })))
export const PercentilePage = lazy(() =>
  import('../features/percentile/PercentilePage').then((m) => ({ default: m.PercentilePage })),
)
export const ScoringPage = lazy(() => import('../features/scoring/ScoringPage').then((m) => ({ default: m.ScoringPage })))
export const WishesPage = lazy(() => import('../features/wishes/WishesPage').then((m) => ({ default: m.WishesPage })))
export const DashboardRedirectPage = lazy(() =>
  import('../pages/DashboardRedirectPage').then((m) => ({ default: m.DashboardRedirectPage })),
)
export const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
