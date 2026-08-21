import React from 'react';
import { reportAppError } from '../lib/monitoring.js';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    reportAppError(error, { area: 'react', operation: 'render' });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
        <section className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-5xl" aria-hidden="true">🛠️</div>
          <h1 className="text-2xl font-bold">L’application a rencontré un souci</h1>
          <p className="mt-3 text-slate-600">
            L’erreur technique a été signalée automatiquement. Aucun repas, poids ou renseignement de santé n’est envoyé.
          </p>
          <button
            type="button"
            className="mt-6 min-h-12 w-full rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white active:scale-[0.99]"
            onClick={() => window.location.reload()}
          >
            Recharger l’application
          </button>
        </section>
      </main>
    );
  }
}
