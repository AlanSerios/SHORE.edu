from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scratch" / "ui-system"
OUT.mkdir(parents=True, exist_ok=True)

ROUTES = {
    "dashboard": "Dashboard",
    "announcements": "Announcements",
    "attendance": "Event Attendance",
    "recitations": "Oral Recitations",
    "reports": "Cohort Analytics",
    "manageclass": "Manage Class",
    "manageteam": "Manage Team",
    "accounts": "Account Management",
    "tickets": "Support Tickets",
    "settings": "Manage Account",
}


def api(route):
    path = route.request.url.split("/api/", 1)[-1].split("?", 1)[0]
    payloads = {
        "users": {"users": []},
        "allowed_students": {"students": []},
        "allowed_volunteers": {"volunteers": []},
        "attendance": {"attendance": []},
        "tracker_data": {"pre": {}, "post": {}},
        "announcements": {"announcements": []},
        "recitations": {"recitations": []},
        "tickets": {"tickets": []},
        "events": {"events": []},
        "unread_counts": {"announcements": 0},
    }
    route.fulfill(json=payloads.get(path, {}))


def verify(browser, width, height, label):
    context = browser.new_context(
        viewport={"width": width, "height": height},
        service_workers="block",
        reduced_motion="reduce",
    )
    page = context.new_page()
    page.add_init_script("""
      localStorage.setItem('shore_user', JSON.stringify({email:'admin@shore.test', role:'admin', name:'Admin'}));
      localStorage.setItem('shore_token', 'test-token');
    """)
    page.route("**/api/**", api)

    for route_name, heading in ROUTES.items():
        page.goto(f"http://127.0.0.1:5173/#{route_name}")
        page.get_by_role("heading", name=heading, exact=True).wait_for()
        metrics = page.evaluate("() => ({page: document.documentElement.scrollWidth, viewport: innerWidth})")
        assert metrics["page"] <= metrics["viewport"], (route_name, metrics)
        overflows = page.evaluate("""() => [...document.querySelectorAll('main *')]
          .filter(el => {
            const style = getComputedStyle(el);
            const clipsByDesign = ['hidden', 'clip'].includes(style.overflowX) || style.textOverflow === 'ellipsis';
            return el.getClientRects().length && !clipsByDesign && el.scrollWidth > el.clientWidth + 2;
          })
          .map(el => ({tag: el.tagName, cls: el.className, client: el.clientWidth, scroll: el.scrollWidth, left: el.scrollLeft}))
          .slice(0, 12)""")
        assert not overflows, f"{label}:{route_name}: inner horizontal overflow: {overflows}"
        if route_name in ("dashboard", "announcements", "attendance", "manageclass", "settings"):
            page.screenshot(path=OUT / f"{route_name}-{label}.png", full_page=False)

    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    verify(browser, 1440, 900, "desktop")
    verify(browser, 1024, 768, "laptop")
    verify(browser, 390, 844, "mobile")
    browser.close()

print(f"Shared UI verification passed: {OUT}")
