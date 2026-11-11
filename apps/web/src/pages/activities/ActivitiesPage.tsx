import { useCallback, useEffect, useMemo, useState } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import { useAuth } from "../../app/auth";
import { ErrorMessage } from "../../components/ui";
import { MediaViewer } from "../../components/media";
import { api } from "../../lib/api";
import { formatEventDate, formatTime, localDate } from "../../lib/format";
import { HomePage } from "../public/HomePage";
import { EventDetailsModal, type FeedEvent } from "../social/SocialPage";

type ActivityEvent = FeedEvent;

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function ActivitiesPage() {
  const { session } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
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
  useEffect(() => {
    if (!selectedEvent) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedEvent(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedEvent]);

  const monthDate = useMemo(() => new Date(`${month}-01T12:00:00Z`), [month]);
  const calendarDays = useMemo(() => {
    const offset = (monthDate.getUTCDay() + 6) % 7;
    const count = new Date(
      Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [monthDate]);
  const eventDateKey = (value: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Campo_Grande",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  const eventDates = useMemo(
    () => new Set(events.map((event) => eventDateKey(event.startsAt))),
    [events],
  );
  const upcomingEvents = events
    .filter((event) => Date.parse(event.startsAt) >= Date.now())
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

  function openEvent(event: ActivityEvent) {
    const date = eventDateKey(event.startsAt);
    setMonth(date.slice(0, 7));
    setSelectedDate(date);
    setSelectedEvent(event);
  }

  return (
    <section className="member-content activities-page">
      <header className="activities-heading">
        <p className="eyebrow">Agenda da comunidade</p>
        <h1>Agenda</h1>
        <p>Eventos e atividades programados para sua sede.</p>
      </header>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      <section className="activities-calendar" aria-label="Calendário da agenda">
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
                <span>{day}</span>
                {hasEvent && <i aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="activities-list" aria-live="polite">
        <div className="activities-list-heading">
          <h2>Próximas atividades</h2>
          <span>{upcomingEvents.length}</span>
        </div>
        {loading ? <p>Carregando atividades…</p> : upcomingEvents.length ? (
          upcomingEvents.map((event) => {
            const poster = event.media.find((item) => item.kind === "image");
            return (
              <button className="activity-upcoming-card" key={event.id} type="button" onClick={() => openEvent(event)}>
                <span className="activity-upcoming-cover">
                  {poster ? <MediaViewer items={[poster]} altPrefix={event.title} /> : <span aria-hidden="true">go!TAI</span>}
                </span>
                <span className="activity-upcoming-copy">
                  <strong>{event.title}</strong>
                  <small>{event.location || "Dojotai"}</small>
                </span>
                <span className="activity-upcoming-date">
                  <strong>{formatTime(event.startsAt)}</strong>
                  <small>{formatEventDate(event.startsAt)}</small>
                </span>
              </button>
            );
          })
        ) : <p className="activities-empty">Nenhuma atividade programada por enquanto.</p>}
      </section>
      {selectedEvent && <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </section>
  );
}
