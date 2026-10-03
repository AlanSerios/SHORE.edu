import requests
import json
import time
import uuid

BASE_URL = "http://127.0.0.1:5000"

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.total = 0
        self.test_reports = []

    def run_test(self, test_name, func):
        self.total += 1
        print(f"[*] Running: {test_name}...", end=" ", flush=True)
        try:
            func()
            self.passed += 1
            print("PASSED")
            self.test_reports.append({"name": test_name, "status": "PASSED", "error": None})
        except Exception as e:
            import traceback
            self.failed += 1
            print(f"FAILED: {e}")
            traceback.print_exc()
            self.test_reports.append({"name": test_name, "status": "FAILED", "error": str(e)})

runner = TestRunner()

# -------------------------------------------------------------
# 1. AUTHENTICATION & USER MANAGEMENT
# -------------------------------------------------------------
def test_login_invalid():
    res = requests.post(f"{BASE_URL}/api/users/login", json={"email": "nonexistent@test.com", "password": "wrong"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

def test_login_valid_or_upsert():
    test_email = f"student_{uuid.uuid4().hex[:6]}@test.com"
    try:
        # Seed user via PUT
        res = requests.put(f"{BASE_URL}/api/users/{test_email}", json={"name": "Test Student", "password": "Pass123!", "role": "student"})
        assert res.status_code == 200, f"Expected 200 on upsert, got {res.status_code}"
        
        # Login
        res_login = requests.post(f"{BASE_URL}/api/users/login", json={"email": test_email, "password": "Pass123!"})
        assert res_login.status_code == 200, f"Expected 200 on login, got {res_login.status_code}"
        data = res_login.json()
        assert data.get("success") is True
        assert data.get("user", {}).get("email") == test_email
    finally:
        requests.delete(f"{BASE_URL}/api/users/{test_email}")

def test_password_reset():
    test_email = f"student_{uuid.uuid4().hex[:6]}@test.com"
    try:
        requests.put(f"{BASE_URL}/api/users/{test_email}", json={"name": "PIN Student", "password": "OldPass!", "pin": "1234", "role": "student"})
        
        # Reset with wrong PIN -> should fail 400
        res_wrong = requests.post(f"{BASE_URL}/api/users/reset-password", json={"email": test_email, "pin": "9999", "new_password": "NewPass!"})
        assert res_wrong.status_code == 400, f"Expected 400 on wrong PIN, got {res_wrong.status_code}"
        
        # Reset with correct PIN -> should succeed
        res_correct = requests.post(f"{BASE_URL}/api/users/reset-password", json={"email": test_email, "pin": "1234", "new_password": "NewPass!"})
        assert res_correct.status_code == 200, f"Expected 200, got {res_correct.status_code}"
    finally:
        requests.delete(f"{BASE_URL}/api/users/{test_email}")

# -------------------------------------------------------------
# 2. ATTENDANCE WORKFLOW & VALIDATION
# -------------------------------------------------------------
def test_attendance_time_out_without_in():
    test_email = f"ghost_{uuid.uuid4().hex[:6]}@test.com"
    res = requests.post(f"{BASE_URL}/api/attendance", json={
        "email": test_email,
        "event": "Day 1 Orientation",
        "type": "Time Out",
        "session": "Morning"
    })
    assert res.status_code == 400, f"Expected 400 when timing out without timing in, got {res.status_code}"

def test_attendance_full_flow():
    test_email = f"att_student_{uuid.uuid4().hex[:6]}@test.com"
    event_name = "Session 1 Math Review"
    
    # 1. Time In
    res_in = requests.post(f"{BASE_URL}/api/attendance", json={
        "email": test_email,
        "event": event_name,
        "type": "Time In",
        "session": "Morning"
    })
    assert res_in.status_code == 200
    log_in_id = res_in.json().get("log", {}).get("id")
    assert log_in_id is not None
    
    # 2. Time Out
    res_out = requests.post(f"{BASE_URL}/api/attendance", json={
        "email": test_email,
        "event": event_name,
        "type": "Time Out",
        "session": "Morning"
    })
    assert res_out.status_code == 200
    log_out_id = res_out.json().get("log", {}).get("id")
    
    # Cleanup
    requests.delete(f"{BASE_URL}/api/attendance/{log_in_id}")
    requests.delete(f"{BASE_URL}/api/attendance/{log_out_id}")

# -------------------------------------------------------------
# 3. SCHOLARSHIPS & AI AUTO-PARSER
# -------------------------------------------------------------
def test_scholarships_crud_and_autoparse():
    admin_email = f"admin_sch_{uuid.uuid4().hex[:6]}@test.com"
    new_s_id = None
    try:
        # Seed admin user & get JWT token
        requests.put(f"{BASE_URL}/api/users/{admin_email}", json={"name": "Admin Tester", "password": "Pass123!Admin", "role": "admin"})
        login_res = requests.post(f"{BASE_URL}/api/users/login", json={"email": admin_email, "password": "Pass123!Admin"})
        admin_headers = {"Authorization": f"Bearer {login_res.json().get('token')}"}

        # 1. Get scholarships
        res = requests.get(f"{BASE_URL}/api/scholarships")
        assert res.status_code == 200
        
        # 2. Test auto-parse DOST
        parse_res = requests.post(f"{BASE_URL}/api/scholarships/auto-parse", json={
            "url": "https://www.sei.dost.gov.ph/scholarships/stem-merit",
            "content": "DOST-SEI Science and Technology Undergraduate Scholarship for STEM students deadline November 15, 2026."
        })
        assert parse_res.status_code == 200
        parsed = parse_res.json().get("parsed")
        assert "DOST" in parsed.get("title")
        assert len(parsed.get("requirements")) > 0

        # 3. Add custom scholarship with Admin JWT token
        new_s_id = f"test-sch-{uuid.uuid4().hex[:6]}"
        new_s = {
            "id": new_s_id,
            "title": "Automated Test Scholarship",
            "provider": "Test Foundation",
            "location": "Mindanao",
            "deadline": "2026-12-31",
            "requirements": ["Form 137", "PSA Birth Cert"]
        }
        res_add = requests.post(f"{BASE_URL}/api/scholarships", headers=admin_headers, json=new_s)
        assert res_add.status_code == 200
        
        # 4. Delete with Admin JWT token
        res_del = requests.delete(f"{BASE_URL}/api/scholarships/{new_s_id}", headers=admin_headers)
        assert res_del.status_code == 200
    finally:
        if new_s_id:
            requests.delete(f"{BASE_URL}/api/scholarships/{new_s_id}", headers=admin_headers)
        requests.delete(f"{BASE_URL}/api/users/{admin_email}")

# -------------------------------------------------------------
# 4. ANNOUNCEMENTS, COMMENTS & UNREAD TRACKING
# -------------------------------------------------------------
def test_announcements_flow():
    admin_email = f"admin_ann_{uuid.uuid4().hex[:6]}@test.com"
    ann_id = None
    try:
        # Seed admin user & get JWT token
        requests.put(f"{BASE_URL}/api/users/{admin_email}", json={"name": "Admin Announcer", "password": "Pass123!Admin", "role": "admin"})
        login_res = requests.post(f"{BASE_URL}/api/users/login", json={"email": admin_email, "password": "Pass123!Admin"})
        admin_headers = {"Authorization": f"Bearer {login_res.json().get('token')}"}

        # 1. Add announcement
        res_add = requests.post(f"{BASE_URL}/api/announcements", headers=admin_headers, json={
            "title": "Urgent Review Meeting",
            "content": "Please attend the session tomorrow at 8:00 AM.",
            "author": "Admin Officer",
            "audience": "All"
        })
        assert res_add.status_code == 200
        ann_id = res_add.json().get("announcement", {}).get("id")
        
        # 2. Comment validation: empty comment fails 400
        res_empty_c = requests.post(f"{BASE_URL}/api/announcements/{ann_id}/comments", json={"content": "  ", "author": "Tester"})
        assert res_empty_c.status_code == 400
        
        # 3. Valid comment succeeds
        res_c = requests.post(f"{BASE_URL}/api/announcements/{ann_id}/comments", json={"content": "Understood, will be there!", "author": "Tester", "authorEmail": "tester@test.com"})
        assert res_c.status_code == 200
        
        # 4. Mark read
        res_read = requests.post(f"{BASE_URL}/api/announcements/{ann_id}/read", json={"email": "student@test.com"})
        assert res_read.status_code == 200
        
        # 5. Delete announcement
        res_del = requests.delete(f"{BASE_URL}/api/announcements/{ann_id}", headers=admin_headers)
        assert res_del.status_code == 200
    finally:
        if ann_id:
            requests.delete(f"{BASE_URL}/api/announcements/{ann_id}", headers=admin_headers)
        requests.delete(f"{BASE_URL}/api/users/{admin_email}")

# -------------------------------------------------------------
# 5. RECITATIONS & LEADERBOARD
# -------------------------------------------------------------
def test_recitations_flow():
    admin_email = f"admin_rec_{uuid.uuid4().hex[:6]}@test.com"
    student_email = f"rec_student_{uuid.uuid4().hex[:6]}@test.com"
    rec_id = None
    try:
        # Seed admin user & get JWT token
        requests.put(f"{BASE_URL}/api/users/{admin_email}", json={"name": "Teacher Admin", "password": "Pass123!Admin", "role": "admin"})
        login_res = requests.post(f"{BASE_URL}/api/users/login", json={"email": admin_email, "password": "Pass123!Admin"})
        admin_headers = {"Authorization": f"Bearer {login_res.json().get('token')}"}

        res_add = requests.post(f"{BASE_URL}/api/recitations", headers=admin_headers, json={
            "studentEmail": student_email,
            "studentName": "Recitation Student",
            "subject": "Mathematics",
            "score": 10,
            "notes": "Excellent participation in Calculus"
        })
        assert res_add.status_code == 200
        rec_id = res_add.json().get("recitation", {}).get("id")
        
        # Verify in list
        res_list = requests.get(f"{BASE_URL}/api/recitations")
        assert any(r.get("id") == rec_id for r in res_list.json().get("recitations", []))
        
        # Delete
        res_del = requests.delete(f"{BASE_URL}/api/recitations/{rec_id}", headers=admin_headers)
        assert res_del.status_code == 200
    finally:
        if rec_id:
            requests.delete(f"{BASE_URL}/api/recitations/{rec_id}", headers=admin_headers)
        requests.delete(f"{BASE_URL}/api/users/{admin_email}")

# -------------------------------------------------------------
# 6. SUPPORT TICKETS SYSTEM
# -------------------------------------------------------------
def test_tickets_validation_and_resolve():
    # Empty title -> should fail 400
    res_bad = requests.post(f"{BASE_URL}/api/tickets", json={"title": " ", "createdBy": "student@test.com"})
    assert res_bad.status_code == 400
    
    # Valid ticket
    res_good = requests.post(f"{BASE_URL}/api/tickets", json={
        "title": "Cannot access Day 2 materials",
        "description": "The link in announcements shows 404.",
        "category": "Technical",
        "createdBy": "student@test.com"
    })
    assert res_good.status_code == 200
    ticket_id = res_good.json().get("ticket", {}).get("id")
    
    # Resolve ticket
    res_res = requests.put(f"{BASE_URL}/api/tickets/{ticket_id}", json={"reply": "The link has been fixed, thank you!"})
    assert res_res.status_code == 200
    
    # Clean up
    requests.delete(f"{BASE_URL}/api/tickets/{ticket_id}")

# -------------------------------------------------------------
# 7. SHOP, COIN BALANCE & PURCHASE SECURITY
# -------------------------------------------------------------
def test_shop_purchase_coin_validation():
    student_email = f"poor_student_{uuid.uuid4().hex[:6]}@test.com"
    created_att_ids = []
    purchase_id = None
    try:
        # Seed user with student role and 0 points
        requests.put(f"{BASE_URL}/api/users/{student_email}", json={"name": "Zero Coins Student", "role": "student"})
        
        # Attempt to buy Yellow Pad Paper (costs 200 coins) with 0 balance -> MUST fail 400
        res_fail = requests.post(f"{BASE_URL}/api/inventory/purchase", json={
            "userEmail": student_email,
            "itemId": 1
        })
        assert res_fail.status_code == 400, f"Expected 400 for insufficient balance, got {res_fail.status_code}"
        
        # Now earn coins by logging attendance and recitations (20 attendance = 200 coins)
        for i in range(20):
            r = requests.post(f"{BASE_URL}/api/attendance", json={
                "email": student_email,
                "event": f"Mock Class {i}",
                "type": "Time In"
            })
            if r.status_code == 200:
                lid = r.json().get("log", {}).get("id")
                if lid:
                    created_att_ids.append(lid)
        
        # Now attempt purchase -> MUST succeed 200
        res_pass = requests.post(f"{BASE_URL}/api/inventory/purchase", json={
            "userEmail": student_email,
            "itemId": 1
        })
        assert res_pass.status_code == 200, f"Expected 200 for sufficient balance, got {res_pass.status_code}"
        purchase_id = res_pass.json().get("purchase", {}).get("id")
    finally:
        for lid in created_att_ids:
            requests.delete(f"{BASE_URL}/api/attendance/{lid}")
        if purchase_id:
            requests.delete(f"{BASE_URL}/api/purchases/{purchase_id}")
        requests.delete(f"{BASE_URL}/api/users/{student_email}")

# -------------------------------------------------------------
# 8. PDF GENERATION INTEGRITY
# -------------------------------------------------------------
def test_pdf_generation_validation():
    # 1. Non-existent student -> should return 404
    res_404 = requests.post(f"{BASE_URL}/api/generate-pdf", json={"student_name": "NonExistentStudent12345", "report_type": "both"})
    assert res_404.status_code == 404
    
    # 2. Check tracker data
    res_td = requests.get(f"{BASE_URL}/api/tracker_data")
    assert res_td.status_code == 200
    data = res_td.json()
    pre_students = list(data.get("pre", {}).keys())
    if pre_students:
        valid_student = pre_students[0]
        res_pdf = requests.post(f"{BASE_URL}/api/generate-pdf", json={"student_name": valid_student, "report_type": "both"})
        assert res_pdf.status_code == 200
        assert res_pdf.headers.get("content-type") == "application/pdf"
        assert len(res_pdf.content) > 1000  # valid binary PDF payload

# -------------------------------------------------------------
# 9. INJECTION & BOUNDARY ATTACK RESILIENCE
# -------------------------------------------------------------
def test_injection_resilience():
    xss_payload = "<script>alert('xss')</script> & '\" -- DROP TABLE users;"
    res = requests.post(f"{BASE_URL}/api/tickets", json={
        "title": xss_payload,
        "description": "Testing boundary sanitization",
        "createdBy": "tester@safe.com"
    })
    assert res.status_code == 200
    t_id = res.json().get("ticket", {}).get("id")
    
    # Verify title is stored safely as string without executing or crashing
    res_list = requests.get(f"{BASE_URL}/api/tickets")
    t = next((item for item in res_list.json().get("tickets", []) if item.get("id") == t_id), None)
    assert t is not None
    assert "<script>" in t.get("title")
    requests.delete(f"{BASE_URL}/api/tickets/{t_id}")

# -------------------------------------------------------------
# 10. ADVANCED SECURITY: SSRF DEFENSE & SECURITY HEADERS
# -------------------------------------------------------------
def test_ssrf_protection():
    malicious_urls = [
        "http://127.0.0.1:5000/api/users",
        "http://localhost:8080/admin",
        "http://169.254.169.254/latest/meta-data/",
        "http://0.0.0.0/",
        "http://192.168.1.1/router",
        "http://10.0.0.1/internal"
    ]
    for m_url in malicious_urls:
        res = requests.post(f"{BASE_URL}/api/scholarships/auto-parse", json={"url": m_url})
        assert res.status_code == 400, f"Expected 400 for blocked SSRF URL '{m_url}', got {res.status_code}"
        assert "Security restriction" in res.json().get("error", "")

def test_http_security_headers():
    res = requests.get(f"{BASE_URL}/api/scholarships")
    assert res.status_code == 200
    headers = {k.lower(): v for k, v in res.headers.items()}
    assert headers.get("x-content-type-options") == "nosniff", "Missing X-Content-Type-Options"
    assert headers.get("x-frame-options") == "SAMEORIGIN", "Missing X-Frame-Options"
    assert "1; mode=block" in headers.get("x-xss-protection", ""), "Missing X-XSS-Protection"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin", "Missing Referrer-Policy"
    assert "content-security-policy" in headers, "Missing Content-Security-Policy"

def test_jwt_and_rbac_enforcement():
    admin_email = f"admin_{uuid.uuid4().hex[:6]}@test.com"
    student_email = f"student_{uuid.uuid4().hex[:6]}@test.com"
    
    try:
        # 1. Create admin and student accounts
        requests.put(f"{BASE_URL}/api/users/{admin_email}", json={"name": "Admin User", "password": "AdminPass123!", "role": "admin"})
        requests.put(f"{BASE_URL}/api/users/{student_email}", json={"name": "Student User", "password": "StudentPass123!", "role": "student"})
        
        # 2. Login as student -> obtain JWT
        res_stu = requests.post(f"{BASE_URL}/api/users/login", json={"email": student_email, "password": "StudentPass123!"})
        assert res_stu.status_code == 200
        student_token = res_stu.json().get("token")
        assert student_token is not None, "JWT token missing from login response"
        
        # 3. Access /api/users/me with student token
        res_me = requests.get(f"{BASE_URL}/api/users/me", headers={"Authorization": f"Bearer {student_token}"})
        assert res_me.status_code == 200
        assert res_me.json().get("user", {}).get("email") == student_email
        
        # 4. Attempt RBAC protected endpoint with student token -> MUST fail 403 Forbidden
        res_forbidden = requests.post(
            f"{BASE_URL}/api/inventory",
            headers={"Authorization": f"Bearer {student_token}"},
            json=[]
        )
        assert res_forbidden.status_code == 403, f"Expected 403 for student accessing admin endpoint, got {res_forbidden.status_code}"
        
        # 5. Login as admin -> obtain JWT
        res_adm = requests.post(f"{BASE_URL}/api/users/login", json={"email": admin_email, "password": "AdminPass123!"})
        admin_token = res_adm.json().get("token")
        
        # 6. Admin token accessing /api/users/me -> succeeds
        res_adm_me = requests.get(f"{BASE_URL}/api/users/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_adm_me.status_code == 200
        assert res_adm_me.json().get("user", {}).get("role") == "admin"
        
    finally:
        requests.delete(f"{BASE_URL}/api/users/{admin_email}")
        requests.delete(f"{BASE_URL}/api/users/{student_email}")

def test_pwa_assets_and_manifest():
    # 1. Manifest verification
    res_manifest = requests.get(f"{BASE_URL}/manifest.json")
    assert res_manifest.status_code == 200, f"Expected 200 for manifest.json, got {res_manifest.status_code}"
    m_data = res_manifest.json()
    assert "SHORE" in m_data.get("name", "")
    assert m_data.get("display") == "standalone"
    
    # 2. Service Worker verification
    res_sw = requests.get(f"{BASE_URL}/sw.js")
    assert res_sw.status_code == 200, f"Expected 200 for sw.js, got {res_sw.status_code}"
    assert "CACHE_NAME" in res_sw.text

# -------------------------------------------------------------
# RUN ALL SUITE TESTS
# -------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("       SHORE WEB APP COMPREHENSIVE TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Login with Invalid Credentials (401)", test_login_invalid),
        ("User Upsert & Valid Login Flow", test_login_valid_or_upsert),
        ("PIN Password Reset Security", test_password_reset),
        ("Attendance Invalid Time Out Validation", test_attendance_time_out_without_in),
        ("Attendance Full Workflow (In & Out)", test_attendance_full_flow),
        ("Scholarships CRUD & AI Auto-Parser", test_scholarships_crud_and_autoparse),
        ("Announcements, Comments & FCM Read Tracking", test_announcements_flow),
        ("Recitations Participation & Scoring", test_recitations_flow),
        ("Support Tickets Validation & Resolution", test_tickets_validation_and_resolve),
        ("Shop Coin Balance Enforcement & Purchase Security", test_shop_purchase_coin_validation),
        ("PDF Report Generator Validation", test_pdf_generation_validation),
        ("Security: Boundary & Injection Resilience", test_injection_resilience),
        ("Security: Server-Side Request Forgery (SSRF) Defense", test_ssrf_protection),
        ("Security: Modern HTTP Security Headers Enforcement", test_http_security_headers),
        ("Security: JWT Token Generation & RBAC 403 Enforcement", test_jwt_and_rbac_enforcement),
        ("PWA: Web App Manifest & Service Worker Shell Delivery", test_pwa_assets_and_manifest),
    ]
    
    for name, fn in tests:
        runner.run_test(name, fn)
        
    print("=" * 60)
    print(f"RESULTS: {runner.passed}/{runner.total} PASSED ({runner.passed/runner.total*100:.1f}%) | {runner.failed} FAILED")
    print("=" * 60)
