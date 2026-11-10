import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { HomePage } from "../public/HomePage";
import { ErrorMessage, Field } from "../../components/ui";

export function OrganogramPage() {
  const { session } = useAuth();
  const [data, setData] = useState<OrgChartData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [delegateId, setDelegateId] = useState("");
  const [form, setForm] = useState({
    role: "",
    membershipId: "",
    buntaiId: "",
    reportsToPositionId: "",
  });
  const load = useCallback(async () => {
    try {
      setData(await api<OrgChartData>("/api/organograma"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (session?.membership) void load();
  }, [session, load]);
  if (!session?.membership) return <HomePage />;
  const selectedMember = data?.members.find(
    (member) => member.membershipId === form.membershipId,
  );
  const availableRoles = selectedMember?.roles ?? [];
  const isBuntaiRole = ["Buntaityo", "Fukubuntaityo", "Shomu"].includes(
    form.role,
  );
  const availableBuntais = (data?.buntais ?? []).filter(
    (buntai) => !isBuntaiRole || buntai.id === selectedMember?.buntaiId,
  );
  const parentRoles: Record<string, string[]> = {
    Taityo: [],
    Buntaityo: ["Shotaityo", "Fukutaityo", "Taityo"],
    Fukubuntaityo: ["Buntaityo"],
    Shotaityo: ["Fukutaityo", "Taityo"],
    Fukutaityo: ["Taityo"],
    Shomu: [],
  };
  const parents = (data?.positions ?? []).filter(
    (position) =>
      position.id !== editingId &&
      (parentRoles[form.role] ?? []).includes(position.role) &&
      (form.role !== "Fukubuntaityo" || position.buntaiId === form.buntaiId),
  );
  const roots = (data?.positions ?? []).filter(
    (position) => !position.reportsToPositionId,
  );

  function startCreate() {
    setEditingId(null);
    setForm({
      role: "",
      membershipId: "",
      buntaiId: "",
      reportsToPositionId: "",
    });
    setFormOpen(true);
    setError("");
  }
  function startEdit(position: OrgPosition) {
    setEditingId(position.id);
    setForm({
      role: position.role,
      membershipId: position.membershipId,
      buntaiId: position.buntaiId ?? "",
      reportsToPositionId: position.reportsToPositionId ?? "",
    });
    setFormOpen(true);
    setError("");
  }
  async function savePosition(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        role: form.role,
        membershipId: form.membershipId,
        buntaiId: form.buntaiId || null,
        reportsToPositionId: form.reportsToPositionId || null,
      };
      await api(
        editingId
          ? `/api/organograma/positions/${editingId}`
          : "/api/organograma/positions",
        { method: editingId ? "PUT" : "POST", body: JSON.stringify(body) },
      );
      setFormOpen(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function removePosition(position: OrgPosition) {
    setError("");
    try {
      await api(`/api/organograma/positions/${position.id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function addDelegate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/organograma/delegates", {
        method: "POST",
        body: JSON.stringify({ membershipId: delegateId }),
      });
      setDelegateId("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function removeDelegate(membershipId: string) {
    setError("");
    try {
      await api(`/api/organograma/delegates/${membershipId}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="member-content">
      <div className="content-heading heading-with-action">
        <div>
          <p className="eyebrow">{session.membership.dojotaiName}</p>
          <h1>Organograma</h1>
          <p className="lead">
            Cargos e Buntai da sede, conforme a estrutura configurada.
          </p>
        </div>
        {data?.canManage && (
          <button className="button button-primary" onClick={startCreate}>
            ＋ Adicionar posição
          </button>
        )}
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {formOpen && data?.canManage && (
        <form
          className="creation-card org-position-form"
          onSubmit={(e) => void savePosition(e)}
        >
          <div className="section-title-row">
            <h2>
              {editingId ? "Editar posição" : "Nova posição"}
              <button
                type="button"
                className="close-button"
                onClick={() => setFormOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </h2>
          </div>
          <Field label="Pessoa">
            <select
              required
              value={form.membershipId}
              onChange={(e) => {
                const member = data.members.find(
                  (item) => item.membershipId === e.target.value,
                );
                setForm({
                  ...form,
                  membershipId: e.target.value,
                  role: member?.roles[0] ?? "",
                  buntaiId: member?.buntaiId ?? "",
                  reportsToPositionId: "",
                });
              }}
            >
              <option value="">Selecione integrante</option>
              {data.members.map((member) => (
                <option key={member.membershipId} value={member.membershipId}>
                  {member.fullName} · @{member.username}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-row">
            <Field label="Cargo">
              <select
                required
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value,
                    buntaiId: ["Buntaityo", "Fukubuntaityo", "Shomu"].includes(
                      e.target.value,
                    )
                      ? (selectedMember?.buntaiId ?? "")
                      : "",
                    reportsToPositionId: "",
                  })
                }
              >
                <option value="">Selecione cargo</option>
                {availableRoles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </Field>
            <Field label="Buntai">
              <select
                required={isBuntaiRole}
                value={form.buntaiId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    buntaiId: e.target.value,
                    reportsToPositionId: "",
                  })
                }
              >
                <option value="">
                  {isBuntaiRole ? "Selecione Buntai" : "Sem Buntai específico"}
                </option>
                {availableBuntais.map((buntai) => (
                  <option key={buntai.id} value={buntai.id}>
                    {buntai.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {form.role !== "Taityo" && form.role !== "Shomu" && (
            <Field label="Vinculada a">
              <select
                value={form.reportsToPositionId}
                onChange={(e) =>
                  setForm({ ...form, reportsToPositionId: e.target.value })
                }
              >
                <option value="">Sem posição superior</option>
                {parents.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.role} · {position.fullName}
                    {position.buntaiName ? ` · ${position.buntaiName}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {form.role === "Shomu" && (
            <p className="org-hint">
              Shomu deve estar associado a um Buntai. Sua posição não recebe
              superior hierárquico até essa regra ser definida.
            </p>
          )}
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <div className="composer-actions">
            <button
              type="button"
              className="button button-quiet-light"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="button button-primary"
              disabled={busy || !selectedMember || !form.role}
            >
              {busy ? "Salvando…" : "Salvar posição"}
            </button>
          </div>
        </form>
      )}
      {data?.canDelegate && (
        <section className="org-delegates">
          <div>
            <p className="eyebrow">Acesso de gestão</p>
            <h2>Delegar edição do organograma</h2>
            <p>
              O Taityo administra automaticamente; integrantes delegados também
              podem editar as posições.
            </p>
          </div>
          <form
            className="org-delegate-form"
            onSubmit={(e) => void addDelegate(e)}
          >
            <select
              aria-label="Integrante para delegação"
              required
              value={delegateId}
              onChange={(e) => setDelegateId(e.target.value)}
            >
              <option value="">Selecione integrante</option>
              {data.members
                .filter(
                  (member) =>
                    member.membershipId !== data.currentMembershipId &&
                    !data.delegates.some(
                      (item) => item.membership_id === member.membershipId,
                    ),
                )
                .map((member) => (
                  <option key={member.membershipId} value={member.membershipId}>
                    {member.fullName} · @{member.username}
                  </option>
                ))}
            </select>
            <button className="button button-small" disabled={!delegateId}>
              Delegar
            </button>
          </form>
          {data.delegates.length > 0 && (
            <div className="delegate-list">
              {data.delegates.map((delegate) => (
                <span key={delegate.membership_id}>
                  {delegate.full_name}
                  <button
                    onClick={() => void removeDelegate(delegate.membership_id)}
                    aria-label={`Remover delegação de ${delegate.full_name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>
      )}
      {data?.positions.length ? (
        <div className="org-tree">
          {roots.map((root) => (
            <OrgPositionNode
              key={root.id}
              position={root}
              positions={data.positions}
              canEdit={data.canManage}
              onEdit={startEdit}
              onDelete={(position) => void removePosition(position)}
            />
          ))}
        </div>
      ) : (
        <article className="feed-empty">
          <span className="feed-empty-icon">⌘</span>
          <h2>Organograma ainda não configurado</h2>
          <p>
            {data?.canManage
              ? "Adicione posições para começar a montar a estrutura da sede."
              : "As posições e os vínculos da sede aparecerão aqui quando forem configurados."}
          </p>
        </article>
      )}
    </section>
  );
}

type OrgPosition = {
  id: string;
  role: string;
  membershipId: string;
  buntaiId: string | null;
  reportsToPositionId: string | null;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  buntaiName: string | null;
};
type OrgMember = {
  membershipId: string;
  fullName: string;
  username: string;
  buntaiId: string | null;
  buntaiName: string | null;
  roles: string[];
};
type OrgChartData = {
  canManage: boolean;
  canDelegate: boolean;
  currentMembershipId: string;
  positions: OrgPosition[];
  buntais: { id: string; name: string }[];
  members: OrgMember[];
  delegates: { membership_id: string; full_name: string; username: string }[];
};

function OrgPositionNode({
  position,
  positions,
  canEdit,
  onEdit,
  onDelete,
}: {
  position: OrgPosition;
  positions: OrgPosition[];
  canEdit: boolean;
  onEdit: (position: OrgPosition) => void;
  onDelete: (position: OrgPosition) => void;
}) {
  const children = positions.filter(
    (item) => item.reportsToPositionId === position.id,
  );
  return (
    <div className="org-tree-branch">
      <article className="org-position-card">
        <div className="org-position-avatar">
          {position.avatarUrl ? (
            <img src={position.avatarUrl} alt="" />
          ) : (
            position.fullName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="org-position-copy">
          <strong>{position.role}</strong>
          <span>{position.fullName}</span>
          <small>
            @{position.username}
            {position.buntaiName ? ` · ${position.buntaiName}` : ""}
          </small>
        </div>
        {canEdit && (
          <div className="org-position-actions">
            <button
              onClick={() => onEdit(position)}
              aria-label={`Editar ${position.role}`}
            >
              ✎
            </button>
            <button
              onClick={() => onDelete(position)}
              aria-label={`Remover ${position.role}`}
            >
              ×
            </button>
          </div>
        )}
      </article>
      {children.length > 0 && (
        <div className="org-position-children">
          {children.map((child) => (
            <OrgPositionNode
              key={child.id}
              position={child}
              positions={positions}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
