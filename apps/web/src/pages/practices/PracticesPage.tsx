import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { HomePage } from "../public/HomePage";
import { ErrorMessage } from "../../components/ui";
import { addDays, formatDay, formatLongDate } from "../../lib/format";
import { practiceNames, type PracticeLog } from "../../lib/practices";

export function PracticesPage() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [today, setToday] = useState("");
  const [month, setMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loadingPractices, setLoadingPractices] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await api<{ today: string; logs: PracticeLog[] }>(
        "/api/me/practices",
      );
      setToday(result.today);
      setMonth((current) => current || result.today.slice(0, 7));
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
  if (!session?.membership) return <HomePage />;
  const first = month ? new Date(`${month}-01T12:00:00Z`) : new Date();
  const offset = first.getUTCDay();
  const calendarDays = month
    ? Array.from({ length: 42 }, (_, index) => {
        const date = new Date(first);
        date.setUTCDate(index - offset + 1);
        return date.toISOString().slice(0, 10);
      })
    : [];
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
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function shiftMonth(amount: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + amount);
    setMonth(date.toISOString().slice(0, 7));
  }
  return (
    <section className="member-content practice-page">
      <div className="content-heading">
        <div>
          <p className="eyebrow">Sua caminhada</p>
          <h1>Minhas Práticas</h1>
          <p className="lead">
            Registre e consulte suas práticas no calendário.
          </p>
        </div>
      </div>
      <div className="practice-page-grid">
        <section className="practice-calendar-card">
          <div className="calendar-heading">
            <button
              className="calendar-arrow"
              onClick={() => shiftMonth(-1)}
              aria-label="Mês anterior"
            >
              ‹
            </button>
            <h2>
              {month &&
                new Intl.DateTimeFormat("pt-BR", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(first)}
            </h2>
            <button
              className="calendar-arrow"
              onClick={() => shiftMonth(1)}
              aria-label="Próximo mês"
              disabled={month >= today.slice(0, 7)}
            >
              ›
            </button>
          </div>
          <div className="calendar-grid calendar-weekdays">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((date) => {
              const currentMonth = date.slice(0, 7) === month;
              const hasPractice = logs.some((log) => log.date === date);
              return (
                <button
                  key={date}
                  disabled={!currentMonth || date > today}
                  className={`calendar-day${currentMonth ? "" : " outside"}${date === selectedDate ? " selected" : ""}${hasPractice ? " has-practice" : ""}${!editable(date) ? " locked" : ""}`}
                  onClick={() => setSelectedDate(date)}
                  aria-label={`${formatDay(date)}${hasPractice ? ", prática registrada" : ""}`}
                >
                  <span>{Number(date.slice(8, 10))}</span>
                  {hasPractice && <i />}
                </button>
              );
            })}
          </div>
          <p className="calendar-legend">
            <span className="legend-dot" /> Dia com prática registrada{" "}
            <span>·</span> Só hoje e os dois dias anteriores podem ser editados
          </p>
        </section>
        <section className="practice-day-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Práticas do dia</p>
              <h2>
                {selectedDate === today ? "Hoje" : formatLongDate(selectedDate)}
              </h2>
            </div>
            <span
              className={
                editable(selectedDate) ? "editable-tag" : "readonly-tag"
              }
            >
              {editable(selectedDate) ? "Editável" : "Somente consulta"}
            </span>
          </div>
          {loadingPractices ? (
            <p className="muted">Carregando práticas…</p>
          ) : (
            <div className="practice-checklist">
              {Object.entries(practiceNames).map(([key, label]) => {
                const done = logs.some(
                  (log) => log.practiceKey === key && log.date === selectedDate,
                );
                return (
                  <div className="practice-check-row" key={key}>
                    <span>
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
          )}
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </section>
      </div>
    </section>
  );
}
