"""Browser-check tracker upload, dashboard publication, and student visibility."""

import json
import os
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright


FRONTEND = Path(__file__).resolve().parents[1]
BASE_URL = os.environ.get("SHORE_TEST_URL", "http://127.0.0.1:5179")
BLUEPRINT = {
    "Mathematics": [("Arithmetic", 8), ("Algebra", 9), ("Geometry", 11), ("Trigonometry", 6), ("Statistics & Probability", 6)],
    "Science": [("Biology", 10), ("Chemistry", 10), ("Physics", 10), ("Earth & Space", 10)],
    "Abstract Reasoning": [("Pattern Series", 11), ("Spatial Reasoning", 10), ("Mechanical Reasoning", 10), ("Logical Reasoning", 9)],
    "English Proficiency": [("Grammar & Syntax", 12), ("Vocabulary", 10), ("Error Identification", 8), ("Reading Comprehension", 10)],
}


def create_workbook(path):
    script = """
      import * as XLSX from 'xlsx';
      import { createPretestTemplate, PRETEST_SUBTOPICS } from './src/utils/assessmentBlueprint.js';
      const workbook = createPretestTemplate(XLSX);
      const worksheet = workbook.Sheets['Pre-Test Data'];
      const perfect = ['Alpha Applicant', 'alpha@example.com', ...PRETEST_SUBTOPICS.map(topic => topic.maxScore)];
      const zero = ['Beta Applicant', 'beta@example.com', ...PRETEST_SUBTOPICS.map(() => 0)];
      XLSX.utils.sheet_add_aoa(worksheet, [perfect, zero], { origin: 'A5' });
      XLSX.writeFile(workbook, process.argv[1]);
    """
    subprocess.run(["node", "--input-type=module", "-e", script, str(path)], cwd=FRONTEND, check=True)


class TrackerApi:
    def __init__(self):
        self.pre = {}
        self.revision = "initial"
        self.post_body = None

    def route_for(self, user):
        session_user = {"value": user}

        def fulfill(route):
            request = route.request
            path = urlparse(request.url).path

            if path == "/api/tracker_data" and request.method == "POST":
                payload = request.post_data_json
                self.post_body = payload
                updated = {}

                for row in payload["rows"]:
                    sections = row["subtopics"]
                    topics = {}
                    subjects = {}
                    total = 0

                    for domain, specs in BLUEPRINT.items():
                        score = 0
                        topics[domain] = {}

                        for name, maximum in specs:
                            value = sections[name]
                            topics[domain][name] = {"score": value, "max": maximum}
                            score += value
                            total += value

                        subjects[domain] = score

                    updated[row["name"]] = {
                        "name": row["name"],
                        "email": row["email"],
                        "total": total,
                        "totalMax": 160,
                        "subjects": subjects,
                        "subjectMax": {domain: 40 for domain in BLUEPRINT},
                        "subtopics": topics,
                    }

                if payload["mode"] == "merge":
                    self.pre.update(updated)
                else:
                    self.pre = updated

                self.revision = "published"
                return route.fulfill(json={
                    "success": True,
                    "revision": self.revision,
                    "savedCount": len(self.pre),
                    "importedCount": len(updated),
                    "removedCount": 0,
                    "tracker": {"pre": self.pre, "post": {}, "revision": self.revision},
                })

            if path == "/api/users/login" and request.method == "POST":
                login_user = {
                    "name": "Beta Applicant",
                    "email": "beta@example.com",
                    "role": "student",
                }
                session_user["value"] = login_user
                return route.fulfill(json={"success": True, "user": login_user, "token": "browser-test-beta-token"})

            if path == "/api/tracker_data":
                response_pre = self.pre
                current_user = session_user["value"]

                if current_user["role"] == "student":
                    matching = next((record for record in self.pre.values() if record["email"] == current_user["email"]), None)
                    response_pre = {current_user["name"]: matching} if matching else {}

                return route.fulfill(json={
                    "schemaVersion": 2 if self.pre else 1,
                    "assessmentId": "shore-pretest-160-v2" if self.pre else "",
                    "revision": self.revision,
                    "metadata": {"filename": "current-diagnostic.xlsx"} if self.pre else {},
                    "legacyDataAvailable": False,
                    "pre": response_pre,
                    "post": {},
                })

            if path == "/api/attendance":
                return route.fulfill(json={"attendance": []})

            if path == "/api/users":
                return route.fulfill(json={"users": [
                    {"name": "Alpha Applicant", "email": "alpha@example.com"},
                    {"name": "Beta Applicant", "email": "beta@example.com"},
                    {"name": "Off-Sheet Applicant", "email": "offsheet@example.com"},
                ]})

            return route.fulfill(json={})

        return fulfill


def open_as(context, user, api):
    context.add_init_script(
        "localStorage.setItem('shore_user', " + json.dumps(json.dumps(user)) + ");"
        "localStorage.setItem('shore_token', 'tracker-flow-browser-check');"
    )
    page = context.new_page()
    page.route("**/api/**", api.route_for(user))
    page.goto(BASE_URL + "/#dashboard", wait_until="networkidle")
    return page


def main():
    api = TrackerApi()
    page_errors = []

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as file:
        workbook_path = Path(file.name)

    try:
        create_workbook(workbook_path)

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            admin = {"name": "SHORE Admin", "email": "admin@example.com", "role": "admin"}
            admin_context = browser.new_context(viewport={"width": 1365, "height": 850}, service_workers="block")
            admin_page = open_as(admin_context, admin, api)
            admin_page.on("pageerror", lambda error: page_errors.append(str(error)))

            admin_page.get_by_role("heading", name="No Student Selected").wait_for()
            admin_page.get_by_role("button", name="Upload Excel Tracker").click()
            dialog = admin_page.get_by_role("dialog", name="Import student results")
            dialog.wait_for()
            admin_page.locator("input[aria-label='Choose pre-test score workbook']").set_input_files(str(workbook_path))
            dialog.get_by_text("2 scored students found", exact=False).wait_for()
            dialog.get_by_text("160/160", exact=True).wait_for()
            assert dialog.get_by_text("Mathematics", exact=True).count() >= 1
            assert dialog.get_by_text("Abstract Reasoning", exact=True).count() >= 1
            dialog.get_by_role("button", name="Import 2 results").click()
            admin_page.get_by_role("heading", name="Cohort Analytics").wait_for()
            admin_page.get_by_text("Performance summary and cohort rankings for 2 students", exact=False).wait_for()
            admin_page.get_by_role("button", name="Dashboard", exact=True).click()

            selector = admin_page.get_by_label("Select student for analytics")
            selector.wait_for()
            options = selector.locator("option").all_text_contents()
            assert options == ["Select Student (2)", "Alpha Applicant", "Beta Applicant"], options
            admin_total = admin_page.get_by_role("button", name="Open total score details")
            admin_total.wait_for()
            assert "160" in admin_total.inner_text()
            assert "/ 160" in admin_total.inner_text()
            assert "Off-Sheet Applicant" not in options
            assert api.post_body["assessmentId"] == "shore-pretest-160-v2"
            assert len(api.post_body["rows"]) == 2

            with tempfile.TemporaryDirectory() as screenshot_dir:
                admin_page.screenshot(path=str(Path(screenshot_dir) / "admin-dashboard.png"), full_page=True)

            admin_page.get_by_role("button", name="Open profile options").click()
            admin_page.get_by_role("menuitem", name="Sign Out").click()
            admin_page.get_by_role("heading", name="Welcome Back").wait_for()
            assert "Alpha Applicant" not in admin_page.locator("body").inner_text()
            admin_page.get_by_placeholder("email@example.com").fill("beta@example.com")
            admin_page.get_by_placeholder("Enter your password").fill("browser-test-password")
            admin_page.get_by_role("button", name="Sign In to Hub").click()
            admin_page.get_by_role("button", name="Total Score").wait_for()
            assert "Beta Applicant" in admin_page.locator("body").inner_text()
            assert "Alpha Applicant" not in admin_page.locator("body").inner_text()

            student_context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
            student = open_as(student_context, {"name": "Beta Applicant", "email": "beta@example.com", "role": "student"}, api)
            student.on("pageerror", lambda error: page_errors.append(str(error)))
            student_total = student.get_by_role("button", name="Open total score details")
            student_total.wait_for()
            assert "0" in student_total.inner_text()
            assert "/ 160" in student_total.inner_text()
            assert "Beta Applicant" in student.locator("body").inner_text()
            assert "Alpha Applicant" not in student.locator("body").inner_text()
            assert student.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            with tempfile.TemporaryDirectory() as screenshot_dir:
                student.screenshot(path=str(Path(screenshot_dir) / "student-dashboard-mobile.png"), full_page=True)

            outsider_context = browser.new_context(viewport={"width": 1280, "height": 800}, service_workers="block")
            outsider = open_as(outsider_context, {"name": "Off-Sheet Applicant", "email": "offsheet@example.com", "role": "student"}, api)
            outsider.get_by_role("heading", name="Your pre-test score is not published yet").wait_for()
            assert "Alpha Applicant" not in outsider.locator("body").inner_text()
            assert "Beta Applicant" not in outsider.locator("body").inner_text()

            assert not page_errors, page_errors
            browser.close()

        print("Tracker dashboard flow passed: admin upload, roster isolation, same-tab account switch, own-score view, off-sheet empty state, and mobile layout.")
    finally:
        workbook_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
