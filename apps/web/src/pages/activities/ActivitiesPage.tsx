import { useCallback, useEffect, useMemo, useState } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import { useAuth } from "../../app/auth";
import { ErrorMessage } from "../../components/ui";
import { MediaViewer, type MediaAsset } from "../../components/media";
import { api } from "../../lib/api";
import { formatEventDate, formatTime, localDate } from "../../lib/format";
import { HomePage } from "../public/HomePage";

type ActivityEvent = {
  id: string;
  title: string;
  description: string;
  media: MediaAsset[];
  startsAt: string;
  location: string;
};

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function ActivitiesPage() {
  const { session } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(() => localDate());

  const load = useCallback(async () => {
    try {
      const result = await api<{ events: ActivityEvent[] }>("/api/informativo");
      setEvents(result.events);
      setError("");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.membership) void load();
  }, [session, load]);

  const monthDate = useMemo(() => new Date(`${month}-01T12:00:00Z`), [month]);
  const calendarDays = useMemo(() => {
    const offset = (monthDate.getUTCDay() + 6) % 7;
    const count = new Date(
      Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [monthDate]);
  const eventDates = useMemo(
    () => new Set(events.map((event) => event.startsAt.slice(0, 10))),
    [events],
  );
  const selectedEvents = events
    .filter((event) => event.startsAt.slice(0, 10) === selectedDate)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthDate);

  if (!session?.membership) return <HomePage />;

  function changeMonth(amount: number) {
    const next = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + amount, 1));
    const nextMonth = next.toISOString().slice(0, 7);
    setMonth(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  }

  return (
    <section className="member-content activities-page">
      <header className="activities-heading">
        <p className="eyebrow">Agenda da comunidade</p>
        <h1>Atividades</h1>
        <p>Consulte os eventos e atividades programados para sua sede.</p>
      </header>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      <section className="activities-calendar" aria-label="Calendário de atividades">
        <div className="activities-calendar-header">
          <h2>{monthLabel}</h2>
          <div>
            <button onClick={() => changeMonth(-1)} aria-label="Mês anterior">
              <RiArrowLeftSLine />
            </button>
            <button onClick={() => changeMonth(1)} aria-label="Próximo mês">
              <RiArrowRightSLine />
            </button>
          </div>
        </div>
        <div className="activities-calendar-grid">
          {weekdays.map((day) => <span className="activities-weekday" key={day}>{day}</span>)}
          {calendarDays.map((day, index) => {
            if (!day) return <span className="activities-calendar-empty" key={`empty-${index}`} />;
            const date = `${month}-${String(day).padStart(2, "0")}`;
            const hasEvent = eventDates.has(date);
            return (
              <button
                className={`activities-calendar-day${selectedDate === date ? " selected" : ""}${hasEvent ? " has-event" : ""}`}
                key={date}
                onClick={() => setSelectedDate(date)}
                aria-pressed={selectedDate === date}
                aria-label={`${day}${hasEvent ? ", há atividade" : ""}`}
              >
                {day}
                {hasEvent && <i aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="activities-list" aria-live="polite">
        <h2>{selectedDate === localDate() ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${selectedDate}T12:00:00Z`))}</h2>
        {loading ? <p>Carregando atividades…</p> : selectedEvents.length ? (
          selectedEvents.map((event) => (
            <article className="activity-event-card" key={event.id}>
              <div className="activity-event-time">
                <strong>{formatTime(event.startsAt)}</strong>
                <span>{formatEventDate(event.startsAt)}</span>
              </div>
              <div className="activity-event-content">
                <h3>{event.title}</h3>
                {event.location && <p className="activity-event-location">{event.location}</p>}
                {event.description && <p>{event.description}</p>}
                {event.media.length > 0 && <MediaViewer items={event.media} />}
              </div>
            </article>
          ))
        ) : <p className="activities-empty">Nenhuma atividade nesta data.</p>}
      </section>
    </section>
  );
}
