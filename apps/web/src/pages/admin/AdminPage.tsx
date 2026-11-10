import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { AuthCard, ErrorMessage, Field, Loading } from "../../components/ui";

type JoinRequest = {
  id: string;
  requested_at: string;
  full_name: string;
  username: string;
  birth_date: string;
  email: string;
  phone: string;
  description: string | null;
};
type Buntai = { id: string; name: string };
type AdminData = {
  requests: JoinRequest[];
  buntais: Buntai[];
  categories: string[];
  roles: string[];
};

export function AdminPage() {
  const { session, loading } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [buntaiName, setBuntaiName] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api<AdminData>("/api/admin/join-requests"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (session?.membership?.roles.includes("Taityo")) void load();
  }, [session, load]);

  async function makeInvite() {
    setNotice("");
    try {
      const result = await api<{ token: string; expiresAt: string }>(
        "/api/admin/invitations",
        { method: "POST", body: "{}" },
      );
      setInviteUrl(`${window.location.origin}/convite/${result.token}`);
      setNotice(
        `Convite criado; expira em ${new Date(result.expiresAt).toLocaleDateString("pt-BR")}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addBuntai(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    try {
      await api("/api/admin/buntais", {
        method: "POST",
        body: JSON.stringify({ name: buntaiName }),
      });
      setBuntaiName("");
      setNotice("Buntai cadastrado.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <Loading />;
  if (!session)
    return (
      <AuthCard
        title="Entre para continuar"
        intro="A administração é restrita a pessoas com permissão de Taityo."
      >
        <Link className="button button-primary button-wide" to="/entrar">
          Entrar
        </Link>
      </AuthCard>
    );
  if (!session.membership?.roles.includes("Taityo"))
    return (
      <AuthCard
        title="Acesso restrito"
        intro="Sua conta não tem permissão de Taityo nesta sede."
      />
    );

  return (
    <section className="admin-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{session.membership.dojotaiName}</p>
          <h1>Administração</h1>
          <p className="lead">Convites e solicitações de entrada.</p>
        </div>
        <button
          onClick={() => void makeInvite()}
          className="button button-primary"
        >
          ＋ Criar convite
        </button>
      </div>
      {inviteUrl && (
        <div className="invite-result">
          <strong>Link de uso único</strong>
          <code>{inviteUrl}</code>
          <button
            className="button button-small"
            onClick={() =>
              void navigator.clipboard
                .writeText(inviteUrl)
                .then(() => setNotice("Link copiado."))
            }
          >
            Copiar link
          </button>
        </div>
      )}
      {notice && <p className="success-message">{notice}</p>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <div className="admin-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Aguardando análise</p>
              <h2>Solicitações</h2>
            </div>
            <button className="text-button" onClick={() => void load()}>
              Atualizar
            </button>
          </div>
          {data?.requests.length ? (
            <div className="request-list">
              {data.requests.map((request) => (
                <ReviewRequest
                  key={request.id}
                  request={request}
                  data={data}
                  onDone={load}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span>✓</span>
              <p>Nenhuma solicitação pendente.</p>
            </div>
          )}
        </section>
        <section className="panel buntais-panel">
          <p className="eyebrow">Organização</p>
          <h2>Buntai</h2>
          <p className="muted">
            Cadastre os grupos disponíveis para atribuição na aprovação.
          </p>
          <form onSubmit={addBuntai} className="inline-form">
            <input
              aria-label="Nome do Buntai"
              required
              minLength={2}
              maxLength={80}
              placeholder="Nome do Buntai"
              value={buntaiName}
              onChange={(e) => setBuntaiName(e.target.value)}
            />
            <button className="button button-small">Adicionar</button>
          </form>
          <ul className="buntai-list">
            {data?.buntais.map((buntai) => (
              <li key={buntai.id}>{buntai.name}</li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

function ReviewRequest({
  request,
  data,
  onDone,
}: {
  request: JoinRequest;
  data: AdminData;
  onDone: () => Promise<void>;
}) {
  const [category, setCategory] = useState(data.categories[0] ?? "");
  const [roles, setRoles] = useState<string[]>([]);
  const [buntaiId, setBuntaiId] = useState(data.buntais[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/join-requests/${request.id}/${action}`, {
        method: "POST",
        body: JSON.stringify(
          action === "approve" ? { category, roles, buntaiId } : {},
        ),
      });
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="request-card">
      <div className="request-person">
        <div className="avatar-placeholder">
          {request.full_name.trim().charAt(0).toUpperCase()}
        </div>
        <div>
          <h3>{request.full_name}</h3>
          <span>
            @{request.username} · {request.birth_date}
          </span>
        </div>
      </div>
      <div className="request-private">
        <span>{request.email}</span>
        <span>{request.phone}</span>
        {request.description && <p>{request.description}</p>}
      </div>
      <div className="approval-fields">
        <Field label="Categoria">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {data.categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Buntai">
          <select
            required
            value={buntaiId}
            onChange={(e) => setBuntaiId(e.target.value)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {data.buntais.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="roles-field">
        <legend>Cargos</legend>
        <div className="role-options">
          {data.roles.map((role) => (
            <label key={role}>
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={(e) =>
                  setRoles((current) =>
                    e.target.checked
                      ? [...current, role]
                      : current.filter((item) => item !== role),
                  )
                }
              />
              {role}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <div className="request-actions">
        <button
          className="button button-quiet"
          disabled={busy}
          onClick={() => void decide("reject")}
        >
          Recusar
        </button>
        <button
          className="button button-primary"
          disabled={busy || !buntaiId || roles.length === 0}
          onClick={() => void decide("approve")}
        >
          {busy ? "Salvando…" : "Aprovar e atribuir"}
        </button>
      </div>
    </article>
  );
}
