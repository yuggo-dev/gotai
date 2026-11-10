import type { ReactNode } from "react";

export function AuthCard({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children?: ReactNode;
}) {
  return (
    <section className="auth-card">
      <p className="eyebrow">goTAI · Dojotai</p>
      <h1>{title}</h1>
      <p className="lead">{intro}</p>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p className="error-message" role="alert">
      {children}
    </p>
  );
}

export function Loading() {
  return (
    <div className="loading-state">
      <span className="loader" /> Carregando o goTAI…
    </div>
  );
}
