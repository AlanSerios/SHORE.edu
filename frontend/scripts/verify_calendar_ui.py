from pathlib import Path
import re

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
SCREENSHOTS = ROOT / "scratch" / "calendar-ui"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

EVENTS = [
    {
        "id": "range-1",
        "title": "Student applications and shortlisting review with regional coordinators",
        "date": "2026-09-30",
        "endDate": "2026-10-31",
        "allDay": True,
        "type": "activities",
        "audience": "all",
        "location": "SHORE Conference Hall",
        "notes": "Bring the final applicant packets.",
    },
    {
        "id": "meet-1",
        "title": "Volunteer onboarding",
        "date": "2026-10-04",
        "allDay": False,
        "startTime": "09:00",
        "endTime": "10:30",
        "type": "meeting",
        "audience": "volunteers",
        "location": "Room 204",
    },
    {
        "id": "overlap-1",
        "title": "Scholarship interview panel",
        "date": "2026-10-04",
        "allDay": False,
        "startTime": "09:30",
        "endTime": "11:00",
        "type": "events",
        "audience": "staff",
    },
    {
        "id": "due-1",
        "title": "Submit October compliance report",
        "date": "2026-10-03",
        "allDay": False,
        "startTime": "16:00",
        "endTime": "17:00",
        "type": "due",
        "audience": "staff",
        "location": "Online portal",
    },
    {
        "id": "post-1",
        "title": "Publish student success story",
        "date": "2026-10-05",
        "allDay": True,
        "type": "online_post",
        "audience": "all",
    },
    {
        "id": "overflow-1",
        "title": "Campus partner call",
        "date": "2026-10-05",
        "allDay": True,
        "type": "meeting",
        "audience": "all",
    },
    {
        "id": "overflow-2",
        "title": "Application audit",
        "date": "2026-10-05",
        "allDay": True,
        "type": "activities",
        "audience": "staff",
    },
    {
        "id": "overflow-3",
        "title": "Resource deadline",
        "date": "2026-10-05",
        "allDay": True,
        "type": "due",
        "audience": "all",
    },
    {
        "id": "weekly-1",
        "title": "Weekly volunteer huddle",
        "date": "2026-10-07",
        "allDay": False,
        "startTime": "14:00",
        "endTime": "15:00",
        "type": "meeting",
        "audience": "volunteers",
        "recurrence": {"frequency": "weekly", "until": "2026-11-18"},
    },
    {
        "id": "monthly-1",
        "title": "Month-end records check",
        "date": "2026-10-31",
        "allDay": True,
        "type": "due",
        "audience": "staff",
        "recurrence": {"frequency": "monthly", "until": "2027-02-28"},
    },
]


def install_api(page):
    state = {"events": [dict(event) for event in EVENTS]}

    def api(route):
        request = route.request
        path = request.url.split("/api/", 1)[-1].split("?", 1)[0]
        if path == "events" and request.method == "GET":
            route.fulfill(json={"events": state["events"]})
            return
        if path == "events" and request.method == "POST":
            payload = request.post_data_json
            payload.update({"id": "created-ui", "createdAt": "2026-10-04T10:00:00+08:00", "updatedAt": "2026-10-04T10:00:00+08:00"})
            state["events"].append(payload)
            route.fulfill(status=201, json={"event": payload})
            return
        if path.startswith("events/") and request.method == "PUT":
            event_id = path.split("/", 1)[1]
            payload = request.post_data_json
            current = next(event for event in state["events"] if event["id"] == event_id)
            current.update(payload)
            route.fulfill(json={"event": current})
            return
        if path.startswith("events/") and request.method == "DELETE":
            event_id = path.split("/", 1)[1]
            state["events"] = [event for event in state["events"] if event["id"] != event_id]
            route.fulfill(json={"message": "Event deleted"})
            return
        if path == "allowed_students":
            route.fulfill(json={"students": []})
        elif path == "allowed_volunteers":
            route.fulfill(json={"volunteers": []})
        elif path == "unread_counts":
            route.fulfill(json={"announcements": 0})
        elif path == "attendance":
            route.fulfill(json={"attendance": []})
        elif path == "users":
            route.fulfill(json={"users": []})
        else:
            route.fulfill(json={})

    page.route("**/api/**", api)


def open_calendar(page, width, height, view=None):
    page.set_viewport_size({"width": width, "height": height})
    page.add_init_script(
        """
        localStorage.setItem('shore_user', JSON.stringify({
          email: 'admin@shore.test', role: 'admin', name: 'Calendar Admin'
        }));
        localStorage.setItem('shore_token', 'ui-test-token');
        """
    )
    query = f"?calendarDate=2026-10-04{f'&calendarView={view}' if view else ''}#calendar"
    page.goto(f"http://localhost:5173/{query}")
    page.wait_for_load_state("networkidle")
    page.locator("h1").filter(has_text=re.compile("October")).wait_for()


def assert_no_page_overflow(page):
    metrics = page.evaluate(
        """() => ({
          body: document.body.scrollWidth,
          root: document.documentElement.scrollWidth,
          viewport: window.innerWidth
        })"""
    )
    assert metrics["body"] <= metrics["viewport"], metrics
    assert metrics["root"] <= metrics["viewport"], metrics


def assert_month_dates_clear(page):
    collisions = page.evaluate(
        """() => {
          const dates = [...document.querySelectorAll('[data-month-date]')];
          const chips = [...document.querySelectorAll('[data-event-chip]')].filter(node => node.offsetParent !== null);
          return dates.flatMap(date => {
            const a = date.getBoundingClientRect();
            return chips.filter(chip => {
              const b = chip.getBoundingClientRect();
              return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            }).map(chip => ({ date: date.dataset.monthDate, event: chip.title }));
          });
        }"""
    )
    assert collisions == [], collisions


def verify_desktop(browser):
    context = browser.new_context(viewport={"width": 1600, "height": 1000}, service_workers="block")
    page = context.new_page()
    install_api(page)
    open_calendar(page, 1600, 1000, "month")
    assert page.get_by_text("Upcoming", exact=True).is_visible()
    assert page.get_by_text(re.compile(r"\+\d+ more")).count() >= 1
    assert page.get_by_role("button", name="Categories").is_visible()
    assert_no_page_overflow(page)
    assert_month_dates_clear(page)
    page.screenshot(path=SCREENSHOTS / "desktop-month.png", full_page=True)

    page.get_by_role("button", name="Week", exact=True).click()
    page.locator("div", has_text=re.compile(r"^All day$")).wait_for()
    assert page.get_by_text("9 AM", exact=True).is_visible()
    page.screenshot(path=SCREENSHOTS / "desktop-week.png", full_page=True)

    page.get_by_role("button", name="Agenda", exact=True).click()
    page.get_by_text("Volunteer onboarding", exact=True).first.wait_for()
    page.screenshot(path=SCREENSHOTS / "desktop-agenda.png", full_page=True)

    page.get_by_role("button", name="New event").click()
    page.get_by_role("heading", name="New event").wait_for()
    assert page.get_by_label("Location").is_visible()
    assert page.get_by_label("Notes").is_visible()
    assert page.get_by_text("Audience", exact=True).is_visible()
    page.screenshot(path=SCREENSHOTS / "desktop-editor.png", full_page=True)
    page.get_by_role("button", name="Close", exact=True).focus()
    page.keyboard.press("Shift+Tab")
    assert page.get_by_role("button", name="Create event").evaluate("element => element === document.activeElement")
    page.keyboard.press("Escape")
    page.get_by_role("heading", name="New event").wait_for(state="hidden")
    new_event_button = page.get_by_role("button", name="New event").element_handle()
    page.wait_for_function("element => element === document.activeElement", arg=new_event_button)
    context.close()


def verify_laptop(browser):
    context = browser.new_context(viewport={"width": 1536, "height": 768}, service_workers="block")
    page = context.new_page()
    install_api(page)
    open_calendar(page, 1536, 768, "month")
    assert page.get_by_text("Upcoming", exact=True).is_visible()
    assert_no_page_overflow(page)
    assert_month_dates_clear(page)
    page.screenshot(path=SCREENSHOTS / "laptop-month.png", full_page=True)
    context.close()


def verify_tablet(browser):
    context = browser.new_context(viewport={"width": 900, "height": 900}, service_workers="block")
    page = context.new_page()
    install_api(page)
    open_calendar(page, 900, 900, "month")
    assert not page.get_by_text("Upcoming", exact=True).is_visible()
    assert_no_page_overflow(page)
    page.screenshot(path=SCREENSHOTS / "tablet-month.png", full_page=True)
    page.get_by_role("button", name="Week", exact=True).click()
    page.get_by_role("button", name=re.compile(r"^Sun", re.IGNORECASE)).wait_for()
    assert_no_page_overflow(page)
    page.screenshot(path=SCREENSHOTS / "tablet-week.png", full_page=True)
    context.close()


def verify_mobile(browser):
    context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block", reduced_motion="reduce")
    page = context.new_page()
    install_api(page)
    open_calendar(page, 390, 844)
    assert page.get_by_role("button", name="Agenda", exact=True).get_attribute("aria-pressed") == "true"
    for name in ("Month", "Week", "Agenda", "Categories"):
        bounds = page.get_by_role("button", name=name, exact=True).bounding_box()
        assert bounds and bounds["height"] >= 44, (name, bounds)
    assert_no_page_overflow(page)
    page.screenshot(path=SCREENSHOTS / "mobile-agenda.png", full_page=True)

    page.get_by_role("button", name="Month", exact=True).click()
    page.get_by_role("button", name="October 4, 3 events").wait_for()
    assert_no_page_overflow(page)
    page.screenshot(path=SCREENSHOTS / "mobile-month.png", full_page=True)

    page.get_by_role("button", name="Week", exact=True).click()
    assert_no_page_overflow(page)
    page.screenshot(path=SCREENSHOTS / "mobile-week.png", full_page=True)

    page.get_by_role("button", name="New event").click()
    page.get_by_role("heading", name="New event").wait_for()
    page.screenshot(path=SCREENSHOTS / "mobile-editor.png", full_page=True)
    assert_no_page_overflow(page)
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    verify_desktop(browser)
    verify_laptop(browser)
    verify_tablet(browser)
    verify_mobile(browser)
    browser.close()

print(f"Calendar UI verification passed. Screenshots: {SCREENSHOTS}")
