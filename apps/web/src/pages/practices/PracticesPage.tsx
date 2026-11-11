import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { HomePage } from "../public/HomePage";
import { ErrorMessage } from "../../components/ui";
import {
  addDays,
  formatDay,
  formatLongDate,
  localDate,
} from "../../lib/format";
import {
  practiceIcons,
  practiceNames,
  type PracticeLog,
} from "../../lib/practices";

const encouragements = [
  "Cada prática fortalece sua caminhada. Continue no seu ritmo.",
  "Um passo de cada vez: sua constância faz diferença.",
  "Sua dedicação de hoje é motivo de orgulho. Siga em frente!",
  "Que esta prática renove sua determinação para o próximo passo.",
];

export function PracticesPage() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [encouragement, setEncouragement] = useState("");
  const [registerOpen, setRegisterOpen] = useState(
    searchParams.get("registrar") === "1",
  );
  const [loadingPractices, setLoadingPractices] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await api<{ today: string; logs: PracticeLog[] }>(
        "/api/me/practices",
      );
      setToday(result.today);
      setSelectedDate((current) => current || result.today);
      setLogs(result.logs);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingPractices(false);
    }
  }, []);
  useEffect(() => {
    if (session?.membership) void load();
  }, [session, load]);
  useEffect(() => {
    const shouldOpen = searchParams.get("registrar") === "1";
    setRegisterOpen(shouldOpen);
    if (shouldOpen) setSelectedDate(today || localDate());
  }, [searchParams, today]);
  useEffect(() => {
    if (!registerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRegisterOpen(false);
        setSearchParams({}, { replace: true });
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [registerOpen, setSearchParams]);
  if (!session?.membership) return <HomePage />;
  const selected = new Date(
    `${selectedDate || today || localDate()}T12:00:00Z`,
  );
  const weekday = selected.getUTCDay();
  const weekStart = new Date(selected);
  weekStart.setUTCDate(selected.getUTCDate() - ((weekday + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(weekStart.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const currentWeekStart = (() => {
    const current = new Date(`${today || localDate()}T12:00:00Z`);
    current.setUTCDate(current.getUTCDate() - ((current.getUTCDay() + 6) % 7));
    return current.toISOString().slice(0, 10);
  })();
  const earliestLogDate = logs.reduce(
    (earliest, log) => (log.date < earliest ? log.date : earliest),
    addDays(today || localDate(), -70),
  );
  const firstWeekStart = new Date(`${earliestLogDate}T12:00:00Z`);
  firstWeekStart.setUTCDate(
    firstWeekStart.getUTCDate() - ((firstWeekStart.getUTCDay() + 6) % 7),
  );
  const weekOptions: string[] = [];
  for (
    const week = new Date(firstWeekStart);
    week.toISOString().slice(0, 10) <= currentWeekStart;
    week.setUTCDate(week.getUTCDate() + 7)
  ) {
    weekOptions.push(week.toISOString().slice(0, 10));
  }
  weekOptions.reverse();
  const selectedWeekStart = weekStart.toISOString().slice(0, 10);
  const editable = (date: string) =>
    Boolean(today && date <= today && date >= addDays(today, -2));
  async function togglePractice(practiceKey: string) {
    if (!selectedDate || !editable(selectedDate)) return;
    const performed = !logs.some(
      (log) => log.practiceKey === practiceKey && log.date === selectedDate,
    );
    setError("");
    try {
      await api("/api/me/practices", {
        method: "POST",
        body: JSON.stringify({ practiceKey, date: selectedDate, performed }),
      });
      await load();
      setEncouragement(
        performed
          ? encouragements[Math.floor(Math.random() * encouragements.length)]
          : "Registro atualizado. Sua caminhada continua.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function closeRegistration() {
    setRegisterOpen(false);
    setSearchParams({}, { replace: true });
  }
  return (
    <section className="member-content practice-page">
      <div className="content-heading">
        <div className="practice-page-title">
          <div className="practice-page-avatar" aria-hidden="true">
            {session.user.avatarUrl ? (
              <img src={session.user.avatarUrl} alt="" />
            ) : (
              session.user.fullName.trim().charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1>Minhas Práticas</h1>
            <p>{session.user.fullName}</p>
          </div>
        </div>
      </div>
      <div className="practice-page-grid history-mode">
        <section className="practice-calendar-card performance-calendar">
            <div className="performance-date-heading">
              <div>
                <p className="eyebrow">
                  {new Intl.DateTimeFormat("pt-BR", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(selected)}
                </p>
                <h2>
                  {selectedDate === today
                    ? "Hoje"
                    : formatLongDate(selectedDate)}
                </h2>
              </div>
            </div>
            <label className="performance-week-select">
              <span>Semana</span>
              <select
                value={selectedWeekStart}
                aria-label="Selecionar semana"
                onChange={(event) => {
                  const nextWeekStart = event.target.value;
                  const nextWeekEnd = addDays(nextWeekStart, 6);
                  setSelectedDate((current) =>
                    current >= nextWeekStart && current <= nextWeekEnd
                      ? current
                      : nextWeekStart,
                  );
                }}
              >
                {weekOptions.map((weekStartDate) => {
                  const weekEndDate = addDays(weekStartDate, 6);
                  const endLabel = new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    timeZone: "UTC",
                  }).format(new Date(`${weekEndDate}T12:00:00Z`));

                  return (
                    <option key={weekStartDate} value={weekStartDate}>
                      {formatDay(weekStartDate)} – {endLabel}
                    </option>
                  );
                })}
              </select>
            </label>
            <div
              className="performance-week-strip"
              aria-label="Dias da semana"
            >
              {weekDays.map((date) => {
                const dayName = new Intl.DateTimeFormat("pt-BR", {
                  weekday: "short",
                  timeZone: "UTC",
                }).format(new Date(`${date}T12:00:00Z`));
                const hasPractice = logs.some((log) => log.date === date);

                return (
                  <button
                    key={date}
                    className={`${date === selectedDate ? "selected" : ""}${date === today ? " today" : ""}`}
                    onClick={() => setSelectedDate(date)}
                    disabled={date > today}
                    aria-label={`${dayName} ${formatDay(date)}${hasPractice ? ", com práticas registradas" : ""}`}
                    aria-pressed={date === selectedDate}
                  >
                    <span>{dayName.replace(".", "")}</span>
                    <strong>{Number(date.slice(8, 10))}</strong>
                    {hasPractice && <i aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </section>
        <section className="practice-day-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Práticas do dia</p>
              <h2>
                {selectedDate === today ? "Hoje" : formatLongDate(selectedDate)}
              </h2>
            </div>
          </div>
          {loadingPractices ? (
            <p className="muted">Carregando práticas…</p>
          ) : (
            <ul
              className="practice-todo-list"
              aria-label={`Práticas de ${formatLongDate(selectedDate)}`}
            >
              {Object.entries(practiceNames).map(([key, label]) => {
                const PracticeIcon = practiceIcons[key];
                const done = logs.some(
                  (log) => log.practiceKey === key && log.date === selectedDate,
                );

                return (
                  <li
                    className={
                      done
                        ? "practice-todo-item completed"
                        : "practice-todo-item pending"
                    }
                    key={key}
                  >
                    <PracticeIcon
                      className="practice-todo-icon"
                      aria-hidden="true"
                      focusable="false"
                    />
                    <span className="practice-todo-name">{label}</span>
                    <span
                      className={
                        done
                          ? "practice-todo-status completed"
                          : "practice-todo-status"
                      }
                    >
                      {done ? "Realizada" : "Não registrada"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </section>
      </div>
      {registerOpen && (
        <div
          className="practice-modal-backdrop"
          onClick={closeRegistration}
          role="presentation"
        >
          <section
            className="practice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="practice-modal-header">
              <div>
                <p className="eyebrow">Sua caminhada</p>
                <h2 id="practice-modal-title">Registrar práticas</h2>
              </div>
              <button
                className="close-button"
                onClick={closeRegistration}
                aria-label="Fechar janela"
              >
                ×
              </button>
            </header>
            <p className="practice-modal-description">
              Marque o que realizou hoje ou nos dois dias anteriores.
            </p>
            <label className="practice-date-field">
              <span>Data da prática</span>
              <input
                type="date"
                value={selectedDate}
                min={today ? addDays(today, -2) : undefined}
                max={today}
                disabled={!today}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>
            <div className="practice-checklist">
              {Object.entries(practiceNames).map(([key, label]) => {
                const done = logs.some(
                  (log) => log.practiceKey === key && log.date === selectedDate,
                );
                const PracticeIcon = practiceIcons[key];

                return (
                  <div className="practice-check-row" key={key}>
                    <span className="practice-check-label">
                      <PracticeIcon
                        className="practice-stimulus-icon"
                        aria-hidden="true"
                        focusable="false"
                      />
                      <i
                        className={
                          done ? "practice-check checked" : "practice-check"
                        }
                      >
                        {done ? "✓" : ""}
                      </i>
                      {label}
                    </span>
                    <button
                      disabled={!editable(selectedDate)}
                      className={
                        done ? "practice-toggle done" : "practice-toggle"
                      }
                      onClick={() => void togglePractice(key)}
                    >
                      {done ? "Feita · desfazer" : "Marcar como feita"}
                    </button>
                  </div>
                );
              })}
            </div>
            {encouragement && (
              <p className="practice-encouragement" aria-live="polite">
                {encouragement}
              </p>
            )}
            {error && <ErrorMessage>{error}</ErrorMessage>}
          </section>
        </div>
      )}
    </section>
  );
}
