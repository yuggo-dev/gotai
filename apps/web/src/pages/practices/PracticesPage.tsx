import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCheckLine } from "react-icons/ri";
import { GiFlame } from "react-icons/gi";
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
  const [calendarMonth, setCalendarMonth] = useState(() => localDate().slice(0, 7));
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
  const activeDate = selectedDate || today || localDate();
  const viewedMonth = new Date(`${calendarMonth}-01T12:00:00Z`);
  const monthDayCount = new Date(
    Date.UTC(viewedMonth.getUTCFullYear(), viewedMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const monthOffset = (viewedMonth.getUTCDay() + 6) % 7;
  const calendarDays: Array<string | null> = [
    ...Array.from({ length: monthOffset }, () => null),
    ...Array.from({ length: monthDayCount }, (_, index) =>
      `${calendarMonth}-${String(index + 1).padStart(2, "0")}`,
    ),
  ];
  const editable = (date: string) =>
    Boolean(today && date <= today && date >= addDays(today, -2));
  const registrationDates = [
    today || localDate(),
    addDays(today || localDate(), -1),
    addDays(today || localDate(), -2),
  ];
  const practicesForDate = (date: string) =>
    new Set(logs.filter((log) => log.date === date).map((log) => log.practiceKey));
  const qualifiesForGeneralStreak = (date: string) => {
    const dailyPractices = practicesForDate(date);
    return dailyPractices.has("okiyome") && dailyPractices.size >= 2;
  };
  const currentStreakAnchor = qualifiesForGeneralStreak(today || localDate())
    ? today || localDate()
    : addDays(today || localDate(), -1);
  let currentStreak = 0;
  for (let cursor = currentStreakAnchor; qualifiesForGeneralStreak(cursor); cursor = addDays(cursor, -1)) {
    currentStreak += 1;
  }
  let longestStreak = 0;
  let runningStreak = 0;
  const practiceDates = [...new Set(logs.map((log) => log.date))].sort();
  let previousPracticeDate = "";
  for (const date of practiceDates) {
    if (qualifiesForGeneralStreak(date)) {
      runningStreak = previousPracticeDate && addDays(previousPracticeDate, 1) === date
        ? runningStreak + 1
        : 1;
      longestStreak = Math.max(longestStreak, runningStreak);
      previousPracticeDate = date;
    } else {
      runningStreak = 0;
      previousPracticeDate = "";
    }
  }
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(viewedMonth);
  function changeCalendarMonth(amount: number) {
    const nextMonth = new Date(
      Date.UTC(viewedMonth.getUTCFullYear(), viewedMonth.getUTCMonth() + amount, 1),
    );
    const monthKey = nextMonth.toISOString().slice(0, 7);
    if (monthKey > (today || localDate()).slice(0, 7)) return;
    setCalendarMonth(monthKey);
    setSelectedDate(`${monthKey}-01`);
  }
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
            <div className="practice-month-heading">
              <button type="button" onClick={() => changeCalendarMonth(-1)} aria-label="Mês anterior">
                <RiArrowLeftSLine aria-hidden="true" />
              </button>
              <h2>{monthLabel}</h2>
              <button
                type="button"
                onClick={() => changeCalendarMonth(1)}
                disabled={calendarMonth >= (today || localDate()).slice(0, 7)}
                aria-label="Próximo mês"
              >
                <RiArrowRightSLine aria-hidden="true" />
              </button>
            </div>
            <div className="practice-month-weekdays" aria-hidden="true">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="practice-month-grid" aria-label="Calendário mensal de práticas">
              {calendarDays.map((date, index) => {
                if (!date) return <span className="practice-month-empty" key={`empty-${index}`} />;
                const dayLogs = practicesForDate(date);
                const count = dayLogs.size;
                const complete = count === Object.keys(practiceNames).length;
                const partial = count > 0 && !complete;
                const level = count / Object.keys(practiceNames).length;
                const disabled = date > (today || localDate());
                return (
                  <button
                    className={`practice-month-day${date === activeDate ? " selected" : ""}${date === today ? " today" : ""}${complete ? " complete" : partial ? " partial" : " empty"}`}
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    disabled={disabled}
                    aria-label={`${formatLongDate(date)}: ${count} de ${Object.keys(practiceNames).length} práticas${complete ? ", completa" : partial ? ", parcial" : ", sem registros"}`}
                    aria-pressed={date === activeDate}
                    style={{ "--practice-level": level, "--practice-opacity": 0.3 + level * 0.7 } as CSSProperties}
                  >
                    <span className="practice-month-day-number">{Number(date.slice(8, 10))}</span>
                    <span className="practice-month-status">{count > 0 && <RiCheckLine aria-hidden="true" />}</span>
                  </button>
                );
              })}
            </div>
            <div className="practice-month-legend">
              <span><i className="partial" /> Parcial</span>
              <span><i className="complete" /> Completa</span>
              <span><i className="empty" /> Sem registro</span>
            </div>
            <div className="practice-streak-card">
              <span className="practice-streak-flame"><GiFlame aria-hidden="true" /></span>
              <div className="practice-streak-copy">
                <strong>{currentStreak > 0 ? `${currentStreak} ${currentStreak === 1 ? "dia" : "dias"} de constância` : "Sua próxima sequência começa hoje"}</strong>
                <p>{currentStreak > 0 ? "Okiyome e mais uma prática por dia. Continue assim!" : "Registre Okiyome e mais uma prática para iniciar sua streak geral."}</p>
                <small>Maior sequência: {longestStreak} {longestStreak === 1 ? "dia" : "dias"}</small>
              </div>
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
            <div className="practice-date-field">
              <span>Data da prática</span>
              <div className="practice-date-options" role="group" aria-label="Escolher data da prática">
                {registrationDates.map((date, index) => (
                  <button
                    className={selectedDate === date ? "selected" : ""}
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    aria-pressed={selectedDate === date}
                  >
                    <strong>{["Hoje", "Ontem", "Anteontem"][index]}</strong>
                    <small>{formatDay(date)}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="practice-checklist">
              {Object.entries(practiceNames).map(([key, label]) => {
                const done = logs.some(
                  (log) => log.practiceKey === key && log.date === selectedDate,
                );
                const PracticeIcon = practiceIcons[key];

                return (
                  <button
                    className={`practice-check-row${done ? " checked" : ""}`}
                    key={key}
                    type="button"
                    aria-pressed={done}
                    aria-label={`${label}: ${done ? "registrada, toque para desfazer" : "não registrada, toque para marcar"}`}
                    disabled={!editable(selectedDate)}
                    onClick={() => void togglePractice(key)}
                  >
                    <i className={done ? "practice-check checked" : "practice-check"} aria-hidden="true">
                      {done ? "✓" : ""}
                    </i>
                    <PracticeIcon className="practice-stimulus-icon" aria-hidden="true" focusable="false" />
                    <span className="practice-task-copy">
                      <strong>{label}</strong>
                      <small>{done ? "Prática concluída · toque para desfazer" : "Toque para marcar como realizada"}</small>
                    </span>
                    <span className="practice-task-state">{done ? "Feita" : ""}</span>
                  </button>
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
