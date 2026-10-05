from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scratch" / "attendance-ui"
OUT.mkdir(parents=True, exist_ok=True)

ATTENDANCE = [
    {"id": "1", "email": "student@shore.test", "event": "Onboarding", "session": "Morning", "type": "Time In", "timestamp": "2026-10-05T08:02:00+08:00"},
    {"id": "2", "email": "student@shore.test", "event": "Onboarding", "session": "Morning", "type": "Time Out", "timestamp": "2026-10-05T11:58:00+08:00"},
]


def verify(browser, width, height, filename):
    context = browser.new_context(viewport={"width": width, "height": height}, service_workers="block")
    page = context.new_page()
    page.add_init_script("""
      localStorage.setItem('shore_user', JSON.stringify({email:'admin@shore.test', role:'admin', name:'Admin'}));
      localStorage.setItem('shore_token', 'test-token');
    """)

    def api(route):
        path = route.request.url.split('/api/', 1)[-1].split('?', 1)[0]
        if path == 'attendance':
            route.fulfill(json={"attendance": ATTENDANCE})
        elif path == 'users':
            route.fulfill(json={"users": [{"email": "student@shore.test", "name": "Long Student Name", "role": "student"}]})
        elif path == 'allowed_students':
            route.fulfill(json={"students": []})
        elif path == 'allowed_volunteers':
            route.fulfill(json={"volunteers": []})
        else:
            route.fulfill(json={})

    page.route('**/api/**', api)
    page.goto('http://localhost:5173/#attendance')
    page.wait_for_load_state('networkidle')
    page.get_by_role('heading', name='Event Attendance').wait_for()
    assert page.get_by_role('button', name='Start scanner').is_visible()
    for label in ('Live Scanner', 'Session Sheet', 'General Report', 'Statistics'):
        tab = page.get_by_role('tab', name=label)
        assert tab.get_attribute('aria-selected') in ('true', 'false')
        assert tab.bounding_box()['height'] >= 44
    metrics = page.evaluate("() => ({width: document.documentElement.scrollWidth, viewport: innerWidth})")
    assert metrics['width'] <= metrics['viewport'], metrics
    page.screenshot(path=OUT / filename, full_page=True)
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    verify(browser, 1536, 864, 'desktop.png')
    verify(browser, 390, 844, 'mobile.png')
    browser.close()

print(f'Attendance UI verification passed: {OUT}')
