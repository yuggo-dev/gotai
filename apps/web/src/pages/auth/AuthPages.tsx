import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { AuthCard, ErrorMessage, Field, Loading } from "../../components/ui";

export function LoginPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refresh();
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Que bom ter você por aqui."
      intro="Entre com o e-mail e a senha cadastrados no goTAI."
    >
      <form onSubmit={submit} className="form-stack">
        <Field label="E-mail">
          <input
            autoComplete="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Senha">
          <input
            autoComplete="current-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button className="button button-primary button-wide" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </AuthCard>
  );
}

export function JoinPage() {
  const { token = "" } = useParams();
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [dojoName, setDojoName] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    birthDate: "",
    email: "",
    phone: "",
    password: "",
    description: "",
  });

  useEffect(() => {
    let active = true;
    api<{ valid: boolean; dojotaiName: string }>(
      `/api/invitations/${encodeURIComponent(token)}`,
    )
      .then((info) => {
        if (active) {
          setValid(info.valid);
          setDojoName(info.dojotaiName);
        }
      })
      .catch(() => {
        if (active) setValid(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/join-requests", {
        method: "POST",
        body: JSON.stringify({ ...form, token }),
      });
      await refresh();
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (session?.membership)
    return (
      <AuthCard
        title="Você já entrou em um Dojotai."
        intro="Para mudar de sede, é necessário seguir o fluxo de transferência."
      >
        <Link className="button button-primary button-wide" to="/">
          Voltar ao início
        </Link>
      </AuthCard>
    );
  if (session?.latestRequestStatus === "pending")
    return (
      <AuthCard
        title="Seu pedido já está em análise."
        intro={`A solicitação para entrar no ${dojoName || "Dojotai"} continua pendente.`}
      >
        <Link className="button button-primary button-wide" to="/">
          Ver status
        </Link>
      </AuthCard>
    );
  if (session?.latestRequestStatus === "rejected")
    return <RetryJoinCard token={token} />;
  if (session)
    return (
      <AuthCard
        title="Convite para uma nova solicitação"
        intro="Sua conta já existe. Use o novo convite para solicitar entrada neste Dojotai."
      >
        <RetryJoinCard token={token} />
      </AuthCard>
    );
  if (valid === null) return <Loading />;
  if (!valid)
    return (
      <AuthCard
        title="Convite indisponível"
        intro="Este link expirou, já foi usado ou não existe. Peça um novo convite a alguém autorizado."
      />
    );

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  return (
    <AuthCard
      title="Vamos conhecer você."
      intro={`Preencha seus dados para solicitar entrada no ${dojoName}. A solicitação será revisada por uma pessoa autorizada.`}
    >
      <form onSubmit={submit} className="form-stack">
        <Field label="Nome completo">
          <input
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
          />
        </Field>
        <Field label="Username">
          <div className="username-input">
            <span>@</span>
            <input
              autoComplete="username"
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_.]+"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
            />
          </div>
        </Field>
        <div className="form-row">
          <Field label="Data de nascimento">
            <input
              autoComplete="bday"
              type="date"
              required
              value={form.birthDate}
              onChange={(e) => update("birthDate", e.target.value)}
            />
          </Field>
          <Field label="Telefone">
            <input
              autoComplete="tel"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
        </div>
        <Field label="E-mail">
          <input
            autoComplete="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <Field label="Senha">
          <input
            autoComplete="new-password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
          <small>Use pelo menos 8 caracteres.</small>
        </Field>
        <Field label="Descrição (opcional)">
          <textarea
            rows={3}
            maxLength={280}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
        <p className="privacy-note">
          Seu pedido e seus dados cadastrais serão vistos apenas por pessoas
          autorizadas a aprovar a entrada.
        </p>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button className="button button-primary button-wide" disabled={busy}>
          {busy ? "Enviando…" : "Solicitar entrada"}
        </button>
      </form>
    </AuthCard>
  );
}

function RetryJoinCard({ token }: { token: string }) {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true);
    setError("");
    try {
      await api("/api/join-requests/retry", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      await refresh();
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-stack">
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button
        className="button button-primary button-wide"
        disabled={busy}
        onClick={() => void retry()}
      >
        {busy ? "Enviando…" : "Solicitar entrada novamente"}
      </button>
      <Link className="helper-text" to="/">
        Voltar ao início
      </Link>
    </div>
  );
}
