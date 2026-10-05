import json
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
DOWNLOADS = ROOT / "scratch" / "attendance-functionality"
DOWNLOADS.mkdir(parents=True, exist_ok=True)

USERS = [
    {"email": "alan@example.com", "name": "Alan Student", "role": "student"},
    {"email": "bea@example.com", "name": "Bea Student", "role": "student"},
    {"email": "volunteer@example.com", "name": "Vera Volunteer", "role": "volunteer"},
]

INITIAL_LOGS = [
    {"id": "a1", "email": "alan@example.com", "event": "Onboarding", "session": "Morning", "type": "Time In", "timestamp": "2026-10-05T00:00:00Z"},
    {"id": "a2", "email": "alan@example.com", "event": "Onboarding", "session": "Morning", "type": "Time Out", "timestamp": "2026-10-05T04:00:00Z"},
    {"id": "a3", "email": "alan@example.com", "event": "Onboarding", "session": "Afternoon", "type": "Time In", "timestamp": "2026-10-05T05:00:00Z"},
    {"id": "v1", "email": "volunteer@example.com", "event": "Onboarding", "session": "Morning", "type": "Time In", "timestamp": "2026-10-05T00:15:00Z"},
]


def seed(page):
    page.add_init_script("""
      localStorage.setItem('shore_user', JSON.stringify({email:'admin@shore.test', role:'admin', name:'Admin'}));
      localStorage.setItem('shore_token', 'test-token');
      window.__cameraCalls = 0;
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: async () => {
          window.__cameraCalls += 1;
          const error = new Error('Denied');
          error.name = 'NotAllowedError';
          throw error;
        }}
      });
    """)


def happy_path(browser):
    logs = [dict(log) for log in INITIAL_LOGS]
    requests = []
    context = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce", accept_downloads=True, service_workers="block")
    page = context.new_page()
    seed(page)

    def api(route):
        nonlocal logs
        request = route.request
        path = request.url.split("/api/", 1)[-1].split("?", 1)[0]
        requests.append((request.method, path, request.post_data))
        if path == "attendance" and request.method == "GET":
            route.fulfill(json={"attendance": logs})
        elif path == "attendance" and request.method == "POST":
            payload = json.loads(request.post_data or "{}")
            duplicate = next((log for log in logs if all(log.get(key) == payload.get(key) for key in ("email", "event", "session", "type"))), None)
            if duplicate:
                route.fulfill(status=409, json={"success": False, "error": "Already recorded."})
            else:
                saved = {**payload, "id": f"new-{len(logs)}"}
                logs.append(saved)
                route.fulfill(json={"success": True, "log": saved})
        elif path.startswith("attendance/") and request.method == "DELETE":
            log_id = path.rsplit("/", 1)[-1]
            logs = [log for log in logs if log["id"] != log_id]
            route.fulfill(json={"success": True})
        elif path == "users":
            route.fulfill(json={"users": USERS})
        elif path == "unread_counts":
            route.fulfill(json={"announcements": 0})
        elif path == "tracker_data":
            route.fulfill(json={"pre": {}, "post": {}})
        elif path == "allowed_students":
            route.fulfill(json={"students": []})
        elif path == "allowed_volunteers":
            route.fulfill(json={"volunteers": []})
        else:
            route.fulfill(json={})

    context.route("**/api/**", api)
    page.goto("http://127.0.0.1:5173/#attendance")
    page.get_by_role("heading", name="Event Attendance").wait_for()

    page.get_by_role("button", name="Start scanner").click()
    page.get_by_text("Camera access denied. Please allow permissions.").wait_for()
    page.get_by_role("button", name="Try Again").click()
    page.get_by_text("Camera access denied. Please allow permissions.").wait_for()
    assert page.evaluate("window.__cameraCalls") == 2

    page.get_by_label("Camera unavailable? Record manually").fill("bea@example.com")
    with page.expect_response(lambda response: response.url.endswith("/api/attendance") and response.request.method == "POST") as response_info:
        page.get_by_role("button", name="Record Time In").click()
    assert response_info.value.ok, (response_info.value.status, response_info.value.text(), requests)
    assert json.loads(response_info.value.request.post_data or "{}")["email"] == "bea@example.com"
    assert any(log["email"] == "bea@example.com" for log in logs), requests
    page.get_by_role("tab", name="Session Sheet").click()
    page.get_by_role("table").get_by_text("Bea Student", exact=True).wait_for()

    page.get_by_label("Filter by role").select_option("Volunteer")
    assert page.get_by_role("table").get_by_text("Vera Volunteer", exact=True).is_visible()
    assert page.get_by_role("table").get_by_text("Alan Student", exact=True).count() == 0
    page.get_by_label("Filter by role").select_option("All")

    with page.expect_download() as download_info:
        page.get_by_role("button", name="Export CSV").click()
    download = download_info.value
    assert download.suggested_filename == "Onboarding_Attendance.csv"
    download.save_as(DOWNLOADS / download.suggested_filename)

    page.get_by_role("tab", name="General Report").click()
    page.get_by_text("General Attendance Report", exact=True).wait_for()
    page.get_by_role("tab", name="Statistics").click()
    page.get_by_text("Event Breakdown", exact=True).wait_for()

    page.get_by_role("tab", name="Session Sheet").click()
    delete_button = page.get_by_role("button", name="Delete attendance records for Alan Student")
    delete_button.wait_for()
    bounds = delete_button.bounding_box()
    assert bounds and bounds["x"] + bounds["width"] <= 1280, bounds
    page.screenshot(path=DOWNLOADS / "session-sheet-1280.png", full_page=False)
    page.set_viewport_size({"width": 1024, "height": 768})
    delete_button = page.get_by_role("button", name="Delete attendance records for Alan Student")
    delete_button.wait_for()
    page.screenshot(path=DOWNLOADS / "session-sheet-1024.png", full_page=False)
    page.once("dialog", lambda dialog: dialog.accept())
    delete_button.click()
    page.get_by_text("Alan Student", exact=True).wait_for(state="detached")
    assert not any(log["email"] == "alan@example.com" for log in logs)

    context.close()


def retry_path(browser):
    calls = 0
    recover = False
    context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce", service_workers="block")
    page = context.new_page()
    seed(page)

    def api(route):
        nonlocal calls, recover
        path = route.request.url.split("/api/", 1)[-1].split("?", 1)[0]
        if path == "attendance":
            calls += 1
            if not recover:
                route.fulfill(status=500, json={"error": "temporary"})
            else:
                route.fulfill(json={"attendance": INITIAL_LOGS})
        elif path == "users":
            route.fulfill(json={"users": USERS})
        elif path == "unread_counts":
            route.fulfill(json={"announcements": 0})
        elif path == "tracker_data":
            route.fulfill(json={"pre": {}, "post": {}})
        elif path == "allowed_students":
            route.fulfill(json={"students": []})
        elif path == "allowed_volunteers":
            route.fulfill(json={"volunteers": []})
        else:
            route.fulfill(json={})

    context.route("**/api/**", api)
    page.goto("http://127.0.0.1:5173/#attendance")
    page.get_by_role("alert").wait_for()
    initial_calls = calls
    recover = True
    page.get_by_role("button", name="Retry").click()
    page.get_by_role("alert").wait_for(state="detached")
    assert calls > initial_calls
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    happy_path(browser)
    retry_path(browser)
    browser.close()

print("Attendance functionality verification passed")
