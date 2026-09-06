import uuid
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, text


def _avg_for_window(session: Session, user_id: uuid.UUID, window_days: int) -> tuple[float, float]:
    row = session.exec(
        text(
            """
            SELECT
              COALESCE(AVG(mood_score), 0)::float AS mood_avg,
              COALESCE(AVG(energy_score), 0)::float AS energy_avg
            FROM mood_logs
            WHERE user_id = :uid
              AND created_at >= :since
            """
        ),
        params={"uid": str(user_id), "since": datetime.now(timezone.utc) - timedelta(days=window_days)},
    ).mappings().first()
    return (float(row["mood_avg"]) if row else 0.0, float(row["energy_avg"]) if row else 0.0)


def _top_triggers(session: Session, user_id: uuid.UUID, limit: int = 8) -> list[dict]:
    rows = session.exec(
        text(
            """
            SELECT trigger_value AS trigger_name, COUNT(*) AS occurrence_count
            FROM mood_logs,
                 json_array_elements_text(
                     CASE
                       WHEN triggers IS NULL THEN '[]'::json
                       ELSE triggers::json
                     END
                 ) AS trigger_value
            WHERE user_id = :uid
            GROUP BY trigger_value
            ORDER BY occurrence_count DESC
            LIMIT :lim
            """
        ),
        params={"uid": str(user_id), "lim": limit},
    ).mappings().all()
    return [
        {"trigger": row["trigger_name"], "count": int(row["occurrence_count"])}
        for row in rows
    ]


def _heatmap(session: Session, user_id: uuid.UUID, days: int = 30) -> list[dict]:
    rows = session.exec(
        text(
            """
            SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*) AS count
            FROM mood_logs
            WHERE user_id = :uid
              AND created_at >= :since
            GROUP BY day
            ORDER BY day
            """
        ),
        params={"uid": str(user_id), "since": datetime.now(timezone.utc) - timedelta(days=days)},
    ).mappings().all()
    return [{"date": row["day"], "count": int(row["count"])} for row in rows]


def _total_checkins(session: Session, user_id: uuid.UUID) -> int:
    row = session.exec(
        text("SELECT COUNT(*) AS n FROM mood_logs WHERE user_id = :uid"),
        params={"uid": str(user_id)},
    ).mappings().first()
    return int(row["n"]) if row else 0


def _range_days(session: Session, user_id: uuid.UUID) -> int:
    row = session.exec(
        text(
            """
            SELECT COALESCE(
              EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400, 0
            ) AS days
            FROM mood_logs
            WHERE user_id = :uid
            """
        ),
        params={"uid": str(user_id)},
    ).mappings().first()
    return int(round(float(row["days"]))) if row else 0


def get_metrics(session: Session, user_id: uuid.UUID) -> dict:
    mood_7d, energy_7d = _avg_for_window(session, user_id, 7)
    mood_30d, energy_30d = _avg_for_window(session, user_id, 30)

    return {
        "mood_7d_avg": round(mood_7d, 2),
        "energy_7d_avg": round(energy_7d, 2),
        "mood_30d_avg": round(mood_30d, 2),
        "energy_30d_avg": round(energy_30d, 2),
        "top_triggers": _top_triggers(session, user_id),
        "heatmap": _heatmap(session, user_id),
        "total_checkins": _total_checkins(session, user_id),
        "range_days": _range_days(session, user_id),
    }


def build_stats_summary(session: Session, user_id: uuid.UUID) -> str:
    """Build a short human-readable summary of user stats for the insights model."""
    metrics = get_metrics(session, user_id)
    trigger_text = ", ".join(
        f"{t['trigger']} (x{t['count']})" for t in metrics["top_triggers"][:5]
    )
    if not trigger_text:
        trigger_text = "none logged yet"
    return (
        f"Total check-ins: {metrics['total_checkins']}; "
        f"7-day average mood: {metrics['mood_7d_avg']}/10, energy: {metrics['energy_7d_avg']}/10; "
        f"30-day average mood: {metrics['mood_30d_avg']}/10, energy: {metrics['energy_30d_avg']}/10; "
        f"top triggers: {trigger_text}; "
        f"activity span: {metrics['range_days']} day(s)."
    )