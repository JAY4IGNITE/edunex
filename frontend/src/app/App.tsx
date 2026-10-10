import { Component, Suspense, lazy, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query";
import { AuthGate } from "@/components/auth/DemoAuth";
import { PageSkeleton } from "@/components/skeletons";
import { EmptyState, ErrorState } from "@/components/states/States";
const LandingPage = lazy(() => import("@/pages/Landing"));
const Shell = lazy(() => import("@/components/layout/Shell"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Students = lazy(() => import("@/pages/Students"));
const Risks = lazy(() => import("@/pages/Risks"));
const StudentProfile = lazy(() => import("@/pages/StudentProfile"));
const Segments = lazy(() => import("@/pages/Segments"));
const Insights = lazy(() => import("@/pages/Insights"));
const DataIntegration = lazy(() => import("@/pages/DataIntegration"));
const Priority = lazy(() => import("@/pages/Priority"));
const Interventions = lazy(() => import("@/pages/Interventions"));
const Model = lazy(() => import("@/pages/Model"));
const Login = lazy(() => import("@/pages/Login"));
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <ErrorState
        message="This view could not be displayed."
        retry={() => window.location.reload()}
      />
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="initial-loading">
                <PageSkeleton />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              <Route element={<AuthGate><Shell /></AuthGate>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="priority" element={<Priority />} />
                <Route path="interventions" element={<Interventions />} />
                <Route path="model" element={<Model />} />
                <Route path="students" element={<Students />} />
                <Route
                  path="students/:studentId"
                  element={<StudentProfile />}
                />
                <Route path="risks" element={<Risks />} />
                <Route path="segments" element={<Segments />} />
                <Route path="insights" element={<Insights />} />
                <Route path="data" element={<DataIntegration />} />
                <Route
                  path="*"
                  element={
                    <div className="panel">
                      <EmptyState
                        title="Page not found"
                        description="Choose a destination from the navigation."
                      />
                      <Link className="text-link" to="/">
                        Return to overview
                      </Link>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
