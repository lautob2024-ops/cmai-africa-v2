import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

type State = { hasError: boolean };

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[UI]", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7f3] p-8">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-[#eb6a3d]" />
          <h1 className="mt-5 font-display text-3xl font-semibold text-[#193f36]">Un problème est survenu</h1>
          <p className="mt-3 text-[#596961]">La page n'a pas pu s'afficher correctement. Rechargez-la ; si le problème persiste, contactez l'équipe CMAI+Africa.</p>
          <button onClick={() => window.location.reload()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#193f36] px-5 py-3 text-sm font-semibold text-white">
            <RotateCcw className="h-4 w-4" /> Recharger la page
          </button>
        </div>
      </div>
    );
  }
}
