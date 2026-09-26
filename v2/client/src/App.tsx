import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Access from "./pages/Access";
import NotFound from "./pages/NotFound";

// Chaque page est chargée à la demande : le premier affichage télécharge beaucoup moins de code.
const Home = lazy(() => import("./pages/Home"));
const MemberHome = lazy(() => import("./pages/MemberHome"));
const Programs = lazy(() => import("./pages/Programs"));
const CoursePlayer = lazy(() => import("./pages/CoursePlayer"));
const Payment = lazy(() => import("./pages/Payment"));
const StudentApplication = lazy(() => import("./pages/StudentApplication"));
const ContentHub = lazy(() => import("./pages/ContentHub"));
const Discussions = lazy(() => import("./pages/Discussions"));
const Community = lazy(() => import("./pages/Community"));
const Certificate = lazy(() => import("./pages/Certificate"));
const About = lazy(() => import("./pages/About"));
const Admin = lazy(() => import("./pages/Admin"));

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]" role="status" aria-label="Chargement">
    <Loader2 className="h-7 w-7 animate-spin text-[#2f6fed]" />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<Loading />}>
      <Switch>
        <Route path="/" component={Access} />
        <Route path="/access" component={Access} />
        <Route path="/home" component={MemberHome} />
        <Route path="/programmes" component={Programs} />
        <Route path="/programmes/:id" component={CoursePlayer} />
        <Route path="/paiement" component={Payment} />
        <Route path="/demande-etudiant" component={StudentApplication} />
        <Route path="/actualites" component={ContentHub} />
        <Route path="/discussions" component={Discussions} />
        <Route path="/communaute" component={Community} />
        <Route path="/certificat" component={Certificate} />
        <Route path="/a-propos" component={About} />
        <Route path="/decouvrir" component={Home} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ErrorBoundary>
  );
}
