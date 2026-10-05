"""Canonical SHORE calendar event normalization and validation helpers."""

from copy import deepcopy
from datetime import date, datetime
import re


EVENT_TYPES = {"events", "meeting", "activities", "due", "online_post"}
EVENT_AUDIENCES = {"all", "students", "volunteers", "staff"}
RECURRENCE_FREQUENCIES = {"weekly", "monthly"}
TIME_RE = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")


def _iso_date(value):
    if not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError:
        return None


def normalize_event(raw):
    event = deepcopy(raw) if isinstance(raw, dict) else {}
    event_type = event.get("type", "events")
    event["type"] = "due" if event_type == "overdue" else event_type
    if event["type"] not in EVENT_TYPES:
        event["type"] = "events"
    audience = event.get("audience")
    if audience not in EVENT_AUDIENCES:
        audience = "staff" if event.get("isHidden") else "all"
    event["audience"] = audience
    event["allDay"] = bool(event.get("allDay", True))
    event["timezone"] = "Asia/Manila"
    event["location"] = str(event.get("location") or "")
    event["notes"] = str(event.get("notes") or "")
    event["completedAt"] = event.get("completedAt") or None
    recurrence = event.get("recurrence")
    if not isinstance(recurrence, dict) or recurrence.get("frequency") not in RECURRENCE_FREQUENCIES:
        event["recurrence"] = None
    else:
        event["recurrence"] = {"frequency": recurrence["frequency"], "until": _iso_date(recurrence.get("until")) if recurrence.get("until") else None}
    if event["allDay"]:
        event["startTime"] = None
        event["endTime"] = None
    else:
        event["startTime"] = event.get("startTime") or None
        event["endTime"] = event.get("endTime") or None
    return event


def validate_event_payload(payload, existing=None):
    if not isinstance(payload, dict):
        return None, "Event payload must be a JSON object."
    merged = deepcopy(existing) if isinstance(existing, dict) else {}
    merged.update(payload)

    if "type" in payload and payload.get("type") not in EVENT_TYPES | {"overdue"}:
        return None, "Invalid event category."
    if "audience" in payload and payload.get("audience") not in EVENT_AUDIENCES:
        return None, "Invalid event audience."
    if "allDay" in payload and not isinstance(payload.get("allDay"), bool):
        return None, "allDay must be a boolean."
    if "recurrence" in payload and payload.get("recurrence") is not None:
        recurrence_input = payload.get("recurrence")
        if not isinstance(recurrence_input, dict) or recurrence_input.get("frequency") not in RECURRENCE_FREQUENCIES:
            return None, "Invalid recurrence frequency."
        if recurrence_input.get("until") and not _iso_date(recurrence_input.get("until")):
            return None, "Recurrence end date must be a valid date."

    event = normalize_event(merged)
    title = str(event.get("title") or "").strip()
    if not title:
        return None, "Event title is required."
    if len(title) > 160:
        return None, "Event title must be 160 characters or fewer."
    event["title"] = title
    start_date = _iso_date(event.get("date"))
    end_date = _iso_date(event.get("endDate")) if event.get("endDate") else None
    if not start_date:
        return None, "A valid start date is required."
    if end_date and end_date < start_date:
        return None, "End date cannot be before the start date."
    event["date"] = start_date
    event["endDate"] = end_date
    if event["type"] not in EVENT_TYPES:
        return None, "Invalid event category."
    if event["audience"] not in EVENT_AUDIENCES:
        return None, "Invalid event audience."
    if not event["allDay"]:
        if not TIME_RE.match(str(event.get("startTime") or "")) or not TIME_RE.match(str(event.get("endTime") or "")):
            return None, "Timed events require valid start and end times."
        if (end_date or start_date) == start_date and event["endTime"] <= event["startTime"]:
            return None, "End time must be after the start time."
    location = str(event.get("location") or "").strip()
    notes = str(event.get("notes") or "").strip()
    if len(location) > 160:
        return None, "Location must be 160 characters or fewer."
    if len(notes) > 2000:
        return None, "Notes must be 2,000 characters or fewer."
    event["location"] = location
    event["notes"] = notes
    recurrence = event.get("recurrence")
    if recurrence:
        until = recurrence.get("until")
        if until and until < start_date:
            return None, "Recurrence end date cannot be before the event start."
        if until and (date.fromisoformat(until) - date.fromisoformat(start_date)).days > 366 * 5:
            return None, "Recurring events cannot span more than five years."
    completed_at = event.get("completedAt")
    if completed_at:
        try:
            datetime.fromisoformat(str(completed_at).replace("Z", "+00:00"))
        except ValueError:
            return None, "completedAt must be an ISO timestamp."
    event.pop("isHidden", None)
    return event, None


def audience_allows(role, audience):
    if role == "admin":
        return True
    if role == "volunteer":
        return audience in {"all", "volunteers", "staff"}
    return audience in {"all", "students"}


def notification_allows(role, audience):
    if audience == "all":
        return True
    if audience == "staff":
        return role in {"admin", "volunteer"}
    return audience == f"{role}s"

