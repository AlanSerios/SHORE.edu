import os
import io
import re
import json
import time
import socket
import hmac
import ipaddress
import urllib.parse
import threading
from functools import wraps
import jwt
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from pdf_generator import generate_pdf_bytes

# Serve from frontend/dist — uses pathlib so this works from any CWD
import pathlib
_BASE_DIR = pathlib.Path(__file__).parent  # directory containing this server.py
app = Flask(__name__, static_folder=str(_BASE_DIR / 'frontend' / 'dist'), static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max payload
CORS(app)

# -------------------------------------------------------------
# HTTP SECURITY HEADERS & ERROR HANDLERS
# -------------------------------------------------------------
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(self)'
    if 'Content-Security-Policy' not in response.headers:
        response.headers['Content-Security-Policy'] = (
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; "
            "img-src 'self' data: https: blob:; "
            "font-src 'self' https: data:; "
            "connect-src 'self' https: wss:; "
            "frame-ancestors 'self';"
        )
    return response

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "Payload too large. Maximum allowed size is 16MB."}), 413

@app.errorhandler(429)
def ratelimit_handler(error):
    return jsonify({"error": "Too many requests. Please slow down and try again later."}), 429

# -------------------------------------------------------------
# SECURITY UTILITIES (RATE LIMITING, SSRF DEFENSE, TIMING ATTACKS)
# -------------------------------------------------------------
class RateLimiter:
    """Thread-safe in-memory sliding window rate limiter."""
    def __init__(self):
        self._records = {}
        self._lock = threading.Lock()

    def is_allowed(self, key: str, max_requests: int, window_seconds: float) -> tuple:
        now = time.time()
        with self._lock:
            timestamps = self._records.get(key, [])
            valid_timestamps = [t for t in timestamps if now - t < window_seconds]
            
            if len(valid_timestamps) >= max_requests:
                oldest = valid_timestamps[0]
                retry_after = max(1, int(window_seconds - (now - oldest)))
                self._records[key] = valid_timestamps
                return False, retry_after
            
            valid_timestamps.append(now)
            self._records[key] = valid_timestamps
            return True, 0

_RATE_LIMITER = RateLimiter()

def safe_str_compare(val1, val2) -> bool:
    """Constant-time string comparison to prevent timing side-channel attacks."""
    if val1 is None or val2 is None:
        return False
    return hmac.compare_digest(str(val1), str(val2))

def is_safe_url(url_str: str) -> tuple:
    """Validates that a URL does not target internal/private/loopback/cloud metadata IP addresses (SSRF defense)."""
    try:
        parsed = urllib.parse.urlparse(url_str)
        if parsed.scheme not in ('http', 'https'):
            return False, "Only HTTP and HTTPS URLs are allowed."
        
        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid URL hostname."
            
        hostname_lower = hostname.lower()
        blocked_hostnames = {
            'localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal',
            'instance-data', '169.254.169.254'
        }
        if hostname_lower in blocked_hostnames or hostname_lower.endswith('.local') or hostname_lower.endswith('.internal'):
            return False, "Access to local or internal network hostnames is prohibited."
            
        try:
            addr_info = socket.getaddrinfo(hostname, None)
        except Exception:
            return False, "Could not resolve hostname."
            
        for item in addr_info:
            ip_str = item[4][0]
            try:
                ip = ipaddress.ip_address(ip_str)
                if (
                    ip.is_private or
                    ip.is_loopback or
                    ip.is_link_local or
                    ip.is_multicast or
                    ip.is_reserved or
                    ip.is_unspecified or
                    str(ip) == '169.254.169.254'
                ):
                    return False, f"Access to private/internal IP address ({ip_str}) is prohibited."
            except ValueError:
                return False, "Invalid resolved IP address."
                
        return True, ""
    except Exception as e:
        return False, f"URL validation failed: {str(e)}"

def sanitize_text(text: str, max_length: int = 10000) -> str:
    """Sanitizes user input strings to strip null bytes and non-printable control characters."""
    if not isinstance(text, str):
        return text
    cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    return cleaned[:max_length]

# -------------------------------------------------------------
# JWT & ROLE-BASED ACCESS CONTROL (RBAC)
# -------------------------------------------------------------
JWT_SECRET = os.environ.get('JWT_SECRET', 'shore-skwela-secret-jwt-key-production-change-in-env-98234791283749')

def create_jwt_token(user_dict: dict) -> str:
    """Generates a secure signed JWT token valid for 30 days."""
    email = (user_dict.get('email') or '').strip().lower()
    role = user_dict.get('role', 'student')
    name = user_dict.get('name', '')
    payload = {
        'email': email,
        'role': role,
        'name': name,
        'iat': int(time.time()),
        'exp': int(time.time()) + (86400 * 30)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token

def decode_jwt_token(token_str: str) -> dict:
    """Decodes and validates a JWT token signature and expiration."""
    if not token_str:
        return None
    try:
        return jwt.decode(token_str, JWT_SECRET, algorithms=['HS256'])
    except Exception:
        return None

def get_current_user():
    """Extracts user information from the Authorization header or fallback payload."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1].strip()
        decoded = decode_jwt_token(token)
        if decoded:
            return decoded
    return None

def token_required(optional=False):
    """Decorator requiring a valid JWT token."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = get_current_user()
            if not user and not optional:
                return jsonify({"error": "Authentication token missing or invalid. Please log in again."}), 401
            request.current_user = user
            return f(*args, **kwargs)
        return decorated
    return decorator

def require_role(*allowed_roles):
    """Decorator enforcing Role-Based Access Control (RBAC)."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = get_current_user()
            if not user:
                # Backwards-compatibility fallback: inspect userEmail/email in payload
                user_email = (request.json.get('userEmail') or request.json.get('email') or '') if request.is_json and request.json else ''
                if user_email:
                    all_users = load_json(USERS_FILE)
                    u = next((x for x in all_users if (x.get('email') or '').strip().lower() == user_email.strip().lower()), None)
                    if u and u.get('role') in allowed_roles:
                        request.current_user = {'email': u.get('email'), 'role': u.get('role'), 'name': u.get('name', '')}
                        return f(*args, **kwargs)
                return jsonify({"error": "Authentication required. Please provide a valid session token."}), 401
            
            user_role = user.get('role', 'student')
            if user_role not in allowed_roles:
                return jsonify({"error": f"Forbidden. Role '{user_role}' is not authorized to perform this action."}), 403
            
            request.current_user = user
            return f(*args, **kwargs)
        return decorated
    return decorator

import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase
firebase_creds_json = os.environ.get('FIREBASE_CREDENTIALS')
if firebase_creds_json:
    cred_dict = json.loads(firebase_creds_json)
    cred = credentials.Certificate(cred_dict)
else:
    cred = credentials.Certificate('firebase_key.json')

# Prevent re-initialization if Flask reloads
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://shore-edu-db-default-rtdb.asia-southeast1.firebasedatabase.app/'
    })

EVENTS_FILE = 'events'
USERS_FILE = 'users'
STUDENTS_FILE = 'students'
VOLUNTEERS_FILE = 'volunteers'
ATTENDANCE_FILE = 'attendance'
ANNOUNCEMENTS_FILE = 'announcements'
RECITATIONS_FILE = 'recitations'
TRACKER_DATA_FILE = 'tracker_data'
TICKETS_FILE = 'tickets'
INVENTORY_FILE = 'inventory'
PURCHASES_FILE = 'purchases'
SCHOLARSHIPS_FILE = 'scholarships'

_CACHE = {}
_CACHE_LOCK = threading.Lock()
CACHE_TTL_SECONDS = 10.0  # In-memory TTL cache for ultra-low latency bursts
_DB_EXECUTOR = ThreadPoolExecutor(max_workers=4)

def _async_save_firebase(collection_name, data):
    try:
        ref = db.reference(collection_name)
        ref.set(data)
    except Exception as e:
        print(f"Firebase Async Save Error ({collection_name}):", e)

def load_json(collection_name, bypass_cache=False):
    now = time.time()
    if not bypass_cache:
        with _CACHE_LOCK:
            if collection_name in _CACHE:
                cached_data, timestamp = _CACHE[collection_name]
                if now - timestamp < CACHE_TTL_SECONDS:
                    return list(cached_data) if isinstance(cached_data, list) else (dict(cached_data) if isinstance(cached_data, dict) else cached_data)

    with _CACHE_LOCK:
        if not bypass_cache and collection_name in _CACHE:
            cached_data, timestamp = _CACHE[collection_name]
            if now - timestamp < CACHE_TTL_SECONDS:
                return list(cached_data) if isinstance(cached_data, list) else (dict(cached_data) if isinstance(cached_data, dict) else cached_data)

        try:
            ref = db.reference(collection_name)
            data = ref.get()
            result = []
            if data is None:
                result = []
            elif isinstance(data, dict):
                result = [v for k, v in data.items() if v is not None]
            elif isinstance(data, list):
                result = [v for v in data if v is not None]
            else:
                result = data
                
            _CACHE[collection_name] = (result, time.time())
            return result
        except Exception as e:
            print(f"Firebase Load Error ({collection_name}):", e)
            if collection_name in _CACHE:
                return _CACHE[collection_name][0]
            return []

def load_dict(collection_name, bypass_cache=False):
    now = time.time()
    if not bypass_cache:
        with _CACHE_LOCK:
            if collection_name in _CACHE:
                cached_data, timestamp = _CACHE[collection_name]
                if now - timestamp < CACHE_TTL_SECONDS:
                    return dict(cached_data) if isinstance(cached_data, dict) else cached_data

    with _CACHE_LOCK:
        if not bypass_cache and collection_name in _CACHE:
            cached_data, timestamp = _CACHE[collection_name]
            if now - timestamp < CACHE_TTL_SECONDS:
                return dict(cached_data) if isinstance(cached_data, dict) else cached_data

        try:
            ref = db.reference(collection_name)
            data = ref.get()
            result = data if data is not None else {}
            _CACHE[collection_name] = (result, time.time())
            return result
        except Exception as e:
            print(f"Firebase Load Error ({collection_name}):", e)
            if collection_name in _CACHE:
                return _CACHE[collection_name][0]
            return {}

def save_json(collection_name, data):
    now = time.time()
    with _CACHE_LOCK:
        _CACHE[collection_name] = (data, now)
    _DB_EXECUTOR.submit(_async_save_firebase, collection_name, data)

def _prewarm_cache():
    collections = [
        USERS_FILE, EVENTS_FILE, ANNOUNCEMENTS_FILE, TICKETS_FILE,
        SCHOLARSHIPS_FILE, INVENTORY_FILE, RECITATIONS_FILE,
        TRACKER_DATA_FILE, STUDENTS_FILE, VOLUNTEERS_FILE
    ]
    for col in collections:
        try:
            if col == TRACKER_DATA_FILE:
                load_dict(col)
            else:
                load_json(col)
        except Exception as e:
            pass

threading.Thread(target=_prewarm_cache, daemon=True).start()

def load_events():
    return load_json(EVENTS_FILE)

def save_events(events):
    save_json(EVENTS_FILE, events)

@app.route('/api/users/register', methods=['POST'])
def register():
    users = load_json(USERS_FILE)
    new_user = request.json
    
    allowed_students = load_json(STUDENTS_FILE)
    allowed_volunteers = load_json(VOLUNTEERS_FILE)
    
    role = new_user.get('role', 'student')
    name = new_user.get('name')
    
    if role == 'student' and name not in allowed_students:
        return {"error": "Your name is not in the allowed students list."}, 400
    elif role == 'volunteer' and name not in allowed_volunteers:
        return {"error": "Your name is not in the allowed volunteers list."}, 400
        
    for user in users:
        if user.get('email') == new_user.get('email'):
            return {"error": "Email already registered."}, 400
            
    new_user['role'] = role
    users.append(new_user)
    save_json(USERS_FILE, users)
    
    safe_user = {k: v for k, v in new_user.items() if k != 'password'}
    return {"success": True, "user": safe_user}

@app.route('/api/users/login', methods=['POST'])
def login():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1').split(',')[0].strip()
    allowed, retry_after = _RATE_LIMITER.is_allowed(f"login_{client_ip}", max_requests=30, window_seconds=60)
    if not allowed:
        return jsonify({"error": f"Too many login attempts. Please try again in {retry_after} seconds.", "retry_after": retry_after}), 429

    creds = request.json or {}
    email = (creds.get('email') or '').strip().lower()
    password = creds.get('password')

    users = load_json(USERS_FILE)
    for user in users:
        user_email = (user.get('email') or '').strip().lower()
        if user_email == email and safe_str_compare(user.get('password'), password):
            safe_user = {k: v for k, v in user.items() if k != 'password'}
            token = create_jwt_token(user)
            return jsonify({"success": True, "user": safe_user, "token": token}), 200
    return jsonify({"error": "Invalid credentials."}), 401

@app.route('/api/users/me', methods=['GET'])
@token_required(optional=False)
def get_current_user_profile():
    email = request.current_user.get('email')
    users = load_json(USERS_FILE)
    user = next((u for u in users if (u.get('email') or '').strip().lower() == email), None)
    if not user:
        return jsonify({"error": "User not found"}), 404
    safe_user = {k: v for k, v in user.items() if k != 'password'}
    return jsonify({"user": safe_user, "token_payload": request.current_user}), 200

@app.route('/api/users', methods=['GET'])
def get_all_users():
    users = load_json(USERS_FILE)
    return {"users": users}

@app.route('/api/users/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1').split(',')[0].strip()
    
    # Brute-force lockout for PIN attempts
    rate_key = f"pin_reset_{email}_{client_ip}"
    allowed, retry_after = _RATE_LIMITER.is_allowed(rate_key, max_requests=10, window_seconds=300)
    if not allowed:
        return jsonify({"error": f"Too many PIN reset attempts for this account. Please wait {retry_after} seconds before trying again.", "retry_after": retry_after}), 429

    users = load_json(USERS_FILE)
    for user in users:
        user_email = (user.get('email') or '').strip().lower()
        if user_email == email:
            if user.get('pin') and safe_str_compare(user.get('pin'), data.get('pin')):
                user['password'] = data.get('new_password')
                save_json(USERS_FILE, users)
                return jsonify({"success": True}), 200
            return jsonify({"error": "Invalid PIN."}), 400
    return jsonify({"error": "Account not found."}), 404

@app.route('/api/users/<email>', methods=['PUT'])
def update_user(email):
    users = load_json(USERS_FILE)
    updated_data = request.json
    for i, user in enumerate(users):
        if user.get('email') == email:
            # Cannot change email to one that already exists (unless it's the same)
            if updated_data.get('email') and updated_data.get('email') != email:
                if any(u.get('email') == updated_data.get('email') for u in users):
                    return {"error": "Email already in use by another account."}, 400
            
            users[i].update(updated_data)
            save_json(USERS_FILE, users)
            safe_user = {k: v for k, v in users[i].items() if k != 'password'}
            return {"success": True, "user": safe_user}

    # Upsert user if not existing
    new_user = {
        'email': email,
        'role': 'student',
        'name': email.split('@')[0],
        **updated_data
    }
    users.append(new_user)
    save_json(USERS_FILE, users)
    safe_user = {k: v for k, v in new_user.items() if k != 'password'}
    return {"success": True, "user": safe_user}

@app.route('/api/users/<email>', methods=['DELETE'])
def delete_user(email):
    users = load_json(USERS_FILE)
    new_users = [u for u in users if u.get('email') != email]
    if len(users) == len(new_users):
        return {"error": "User not found."}, 404
    save_json(USERS_FILE, new_users)
    return {"success": True}

@app.route('/api/allowed_students', methods=['GET'])
def get_allowed_students():
    data = {"students": load_json(STUDENTS_FILE)}
    response = jsonify(data)
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return response

@app.route('/api/allowed_students', methods=['POST'])
@require_role('admin')
def update_allowed_students():
    new_students = request.json.get('students', [])
    save_json(STUDENTS_FILE, new_students)
    return {"success": True}

@app.route('/api/allowed_volunteers', methods=['GET'])
def get_allowed_volunteers():
    return {"volunteers": load_json(VOLUNTEERS_FILE)}

@app.route('/api/allowed_volunteers', methods=['POST'])
@require_role('admin')
def update_allowed_volunteers():
    new_volunteers = request.json.get('volunteers')
    if new_volunteers is None:
        new_volunteers = request.json.get('Volunteers', [])
    save_json(VOLUNTEERS_FILE, new_volunteers)
    return {"success": True}

@app.route('/api/tracker_data', methods=['GET'])
def get_tracker_data():
    data = load_dict(TRACKER_DATA_FILE)
    if isinstance(data, str):
        import json
        try:
            data = json.loads(data)
        except:
            data = {}
    if not data or not isinstance(data, dict):
        data = {}
    if 'pre' not in data:
        data['pre'] = {}
    if 'post' not in data:
        data['post'] = {}
    response = jsonify(data)
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return response

@app.route('/api/tracker_data', methods=['POST'])
@require_role('admin')
def update_tracker_data():
    new_data = request.json
    import json
    save_json(TRACKER_DATA_FILE, json.dumps(new_data))
    return {"success": True}

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/events', methods=['GET'])
def get_events():
    return {"events": load_events()}

@app.route('/api/events', methods=['POST'])
@require_role('admin', 'volunteer')
def add_event():
    events = load_events()
    new_event = request.json
    events.append(new_event)
    save_events(events)
    return {"success": True, "event": new_event}

@app.route('/api/events/<event_id>', methods=['DELETE'])
@require_role('admin', 'volunteer')
def delete_event(event_id):
    events = load_events()
    events = [e for e in events if e.get('id') != event_id]
    save_events(events)
    return {"success": True}

@app.route('/api/events/<event_id>', methods=['PUT'])
@require_role('admin', 'volunteer')
def update_event(event_id):
    events = load_events()
    updated_data = request.json
    for i, e in enumerate(events):
        if e.get('id') == event_id:
            events[i].update(updated_data)
            save_events(events)
            return {"success": True, "event": events[i]}
    return {"error": "Event not found"}, 404

SCHOLARSHIPS_FILE = 'scholarships'

OFFICIAL_SEEDED_SCHOLARSHIPS = [
    {
        "id": "dost-sei-undergrad",
        "title": "DOST-SEI S&T Undergraduate Scholarship",
        "provider": "Department of Science and Technology (DOST-SEI)",
        "location": "Nationwide / Mindanao",
        "deadline": "2026-11-15",
        "applyLink": "https://www.sei.dost.gov.ph",
        "verified": True,
        "officialDomain": "sei.dost.gov.ph",
        "description": "Government scholarship for graduating Grade 12 STEM students (and non-STEM in top 5%) pursuing priority S&T college programs.",
        "benefits": "₱7,000/month stipend, ₱40,000/year tuition subsidy, ₱10,000/year book allowance, health insurance",
        "requirements": [
            "Online DOST-SEI Application Form",
            "Certificate of Good Moral Character",
            "Form 137 / 138 (Grade 12 STEM or Top 5% Certification)",
            "PSA Authenticated Birth Certificate",
            "Parents' 2025/2026 ITR or BIR Certificate of Tax Exemption / Indigency",
            "Certificate of Residency (Barangay)",
            "2x2 Recent Passport-style ID Photo"
        ]
    },
    {
        "id": "ched-merit-program",
        "title": "CHED State & Private Merit Scholarship (CMSP)",
        "provider": "Commission on Higher Education (CHED Region 10/11/12)",
        "location": "Mindanao Regional Priority",
        "deadline": "2026-10-31",
        "applyLink": "https://ched.gov.ph",
        "verified": True,
        "officialDomain": "ched.gov.ph",
        "description": "Financial assistance for graduating high school students with general weighted average (GWA) of 93% to 96%+ enrolling in recognized HEIs.",
        "benefits": "Up to ₱120,000/year for Private HEIs or ₱80,000/year for SUCs/LUCs + book/stipend allowances",
        "requirements": [
            "Duly Accomplished CHED CMSP Application Form",
            "Certified True Copy of High School Report Card (GWA ≥ 93%)",
            "PSA Birth Certificate",
            "Proof of Income (ITR of parents with combined gross income ≤ ₱400,000)",
            "Certificate of Good Moral Character",
            "Barangay Certificate of Indigency (if applicable)"
        ]
    },
    {
        "id": "sm-college-scholarship",
        "title": "SM Foundation College Scholarship",
        "provider": "SM Foundation Inc.",
        "location": "Mindanao Partner Cities (CDO, Davao, Gensan, Zamboanga)",
        "deadline": "2026-12-31",
        "applyLink": "https://www.sm-foundation.org",
        "verified": True,
        "officialDomain": "sm-foundation.org",
        "description": "For underprivileged youth excelling in academics aiming to pursue Computer Science, Engineering, Accountancy, or Education.",
        "benefits": "100% Full Tuition & Miscellaneous Fees + Monthly Living Allowance + Summer/Holiday job opportunities",
        "requirements": [
            "Online SM Foundation Application",
            "Grade 12 Report Card (GWA of 88%+ in Grade 12 first semester)",
            "Parents' Latest BIR Form 2316 or Certificate of Indigency (Annual income ≤ ₱250,000)",
            "Sketch of Residence from nearest SM Mall / Landmark",
            "2x2 ID Photo with white background",
            "Certificate of Good Moral Character"
        ]
    },
    {
        "id": "aboitiz-future-leaders",
        "title": "Aboitiz Future Leaders College Scholarship",
        "provider": "Aboitiz Foundation",
        "location": "Mindanao (Davao, Bukidnon, Iligan, Cotabato)",
        "deadline": "2026-11-30",
        "applyLink": "https://aboitizfoundation.org",
        "verified": True,
        "officialDomain": "aboitizfoundation.org",
        "description": "Full scholarship for promising students pursuing Engineering, IT, Finance, and Agriculture in partner state universities.",
        "benefits": "Full tuition coverage + ₱8,000/month living stipend + laptop grant & internship placement in Aboitiz companies",
        "requirements": [
            "Official Transcript of Records or Grade 12 Report Card (GWA ≥ 88%)",
            "PSA Birth Certificate",
            "Parents' Proof of Annual Income or Barangay Indigency",
            "Certificate of Good Moral Character",
            "One-page Essay on Community Leadership",
            "2 Recommendation Letters from Teachers"
        ]
    },
    {
        "id": "owwa-edsp-odsp",
        "title": "OWWA Education for Development Scholarship (EDSP)",
        "provider": "Overseas Workers Welfare Administration (OWWA)",
        "location": "Nationwide / Mindanao Regional OWWA Centers",
        "deadline": "2026-11-20",
        "applyLink": "https://owwa.gov.ph",
        "verified": True,
        "officialDomain": "owwa.gov.ph",
        "description": "Educational assistance for qualified dependents of active OWWA Member-OFWs intending to enroll in college degree courses.",
        "benefits": "₱60,000.00 per school year financial assistance until college graduation",
        "requirements": [
            "Proof of Active OWWA Membership (OFW Info Sheet / OR)",
            "PSA Birth Certificate of Applicant and OFW Member",
            "Form 137 / 138 (GWA of at least 85% or top 20% of class)",
            "Certificate of Good Moral Character",
            "2 Copies of 2x2 ID Pictures",
            "Valid Passport Copy of OFW"
        ]
    },
    {
        "id": "landbank-gawad-patnubay",
        "title": "Landbank Gawad Patnubay Scholarship",
        "provider": "Land Bank of the Philippines",
        "location": "Mindanao Partner State Universities & Colleges",
        "deadline": "2026-12-15",
        "applyLink": "https://www.landbank.com",
        "verified": True,
        "officialDomain": "landbank.com",
        "description": "Scholarship dedicated to children of agrarian reform beneficiaries, small farmers, and fisherfolk taking Agriculture/Agri-business.",
        "benefits": "100% Tuition & School Fees + ₱5,000/month stipend + Thesis grant & ₱10,000 board exam incentive",
        "requirements": [
            "Proof of Agrarian Beneficiary / Fisherfolk Certification",
            "Grade 12 High School Report Card (GWA ≥ 85%)",
            "PSA Birth Certificate",
            "Certificate of Residency (Barangay)",
            "Certificate of Good Moral Character",
            "Letter of Intent to serve the agricultural sector"
        ]
    }
]

def load_scholarships():
    data = load_json(SCHOLARSHIPS_FILE)
    if not data or len(data) == 0:
        save_json(SCHOLARSHIPS_FILE, OFFICIAL_SEEDED_SCHOLARSHIPS)
        return OFFICIAL_SEEDED_SCHOLARSHIPS
    return data

def save_scholarships(data):
    save_json(SCHOLARSHIPS_FILE, data)

@app.route('/api/scholarships', methods=['GET'])
def get_scholarships():
    return {"scholarships": load_scholarships()}

@app.route('/api/scholarships/seed', methods=['POST'])
@require_role('admin')
def seed_scholarships():
    save_scholarships(OFFICIAL_SEEDED_SCHOLARSHIPS)
    return {"success": True, "scholarships": OFFICIAL_SEEDED_SCHOLARSHIPS}

@app.route('/api/scholarships/auto-parse', methods=['POST'])
def auto_parse_scholarship():
    try:
        import urllib.request, uuid, datetime
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1').split(',')[0].strip()
        allowed, retry_after = _RATE_LIMITER.is_allowed(f"autoparse_{client_ip}", max_requests=30, window_seconds=60)
        if not allowed:
            return jsonify({"error": f"Auto-parse rate limit exceeded. Please wait {retry_after}s.", "retry_after": retry_after}), 429

        data = request.json or {}
        raw_input = (data.get('input') or data.get('content') or data.get('url') or '').strip()
        if not raw_input:
            return {"error": "Please provide a URL or announcement text to parse."}, 400
        
        extracted_text = raw_input
        apply_url = raw_input if raw_input.startswith(('http://', 'https://')) else ''
        
        if raw_input.startswith(('http://', 'https://')):
            # SSRF Security Validation
            safe, err_msg = is_safe_url(raw_input)
            if not safe:
                return {"error": f"Security restriction: {err_msg}"}, 400

            try:
                req = urllib.request.Request(
                    raw_input, 
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SHORE-Bot/1.0'}
                )
                with urllib.request.urlopen(req, timeout=4) as response:
                    # Enforce max 512KB payload to prevent memory exhaustion
                    html_bytes = response.read(512 * 1024)
                    html_text = html_bytes.decode('utf-8', errors='ignore')
                    clean_text = re.sub(r'<script.*?</script>', ' ', html_text, flags=re.DOTALL | re.IGNORECASE)
                    clean_text = re.sub(r'<style.*?</style>', ' ', clean_text, flags=re.DOTALL | re.IGNORECASE)
                    clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
                    clean_text = re.sub(r'\s+', ' ', clean_text)
                    extracted_text = clean_text[:4000]
            except Exception as fetch_err:
                print("URL fetch warning:", fetch_err)
                extracted_text = raw_input
        
        title = "New Scholarship Opportunity"
        provider = "Scholarship Provider"
        deadline = ""
        location = "Mindanao, Philippines"
        requirements = []
        
        lower_text = extracted_text.lower()
        if "dost" in lower_text or "science and technology" in lower_text:
            title = "DOST-SEI Science & Technology Scholarship"
            provider = "Department of Science and Technology (DOST)"
            requirements = [
                "Online Application Form",
                "Form 137 / 138 (Grade 12 STEM or Top 5% Certification)",
                "PSA Authenticated Birth Certificate",
                "Parents' 2025/2026 ITR or BIR Certificate of Tax Exemption",
                "Certificate of Residency",
                "2x2 Recent ID Photo"
            ]
        elif "ched" in lower_text or "higher education" in lower_text:
            title = "CHED Merit Scholarship Program"
            provider = "Commission on Higher Education (CHED)"
            requirements = [
                "Accomplished CHED Application Form",
                "Certified True Copy of High School Report Card (GWA ≥ 93%)",
                "PSA Birth Certificate",
                "Parents' Proof of Income (ITR / Certificate of Indigency)",
                "Certificate of Good Moral Character"
            ]
        elif "sm foundation" in lower_text or "sm scholarship" in lower_text:
            title = "SM Foundation College Scholarship Program"
            provider = "SM Foundation"
            requirements = [
                "Online SM Foundation Application Form",
                "Grade 12 Report Card (GWA ≥ 88%)",
                "Parents' BIR 2316 or Certificate of Indigency",
                "Sketch of Residence from nearest SM Mall",
                "2x2 ID Picture"
            ]
        elif "aboitiz" in lower_text:
            title = "Aboitiz College Scholarship"
            provider = "Aboitiz Foundation"
            requirements = [
                "High School Report Card / Transcript (GWA ≥ 88%)",
                "PSA Birth Certificate",
                "Parents' Proof of Income",
                "Certificate of Good Moral Character",
                "Leadership Essay"
            ]
        elif "owwa" in lower_text:
            title = "OWWA Educational Assistance (EDSP/ODSP)"
            provider = "Overseas Workers Welfare Administration (OWWA)"
            requirements = [
                "Proof of Active OWWA Membership",
                "PSA Birth Certificate",
                "Form 137 / 138 Report Card (GWA ≥ 85%)",
                "Certificate of Good Moral Character",
                "Valid OFW Passport Copy"
            ]
        else:
            lines = [l.strip() for l in re.split(r'[\n\r]+', extracted_text) if len(l.strip()) > 5]
            if lines:
                title = lines[0][:80]
            req_candidates = []
            keywords = ["birth certificate", "report card", "form 137", "form 138", "good moral", "itr", "income tax", "tax exemption", "indigency", "residency", "2x2", "id photo", "recommendation", "transcript", "grades", "application form"]
            for kw in keywords:
                if kw in lower_text:
                    if kw == "birth certificate": req_candidates.append("PSA Birth Certificate")
                    elif kw in ("form 137", "form 138", "report card", "grades"): req_candidates.append("Grade 12 Report Card (Form 137 / 138)")
                    elif kw == "good moral": req_candidates.append("Certificate of Good Moral Character")
                    elif kw in ("itr", "income tax", "tax exemption", "indigency"): req_candidates.append("Parents' Proof of Income (ITR / Cert of Indigency)")
                    elif kw == "residency": req_candidates.append("Certificate of Residency (Barangay)")
                    elif kw in ("2x2", "id photo"): req_candidates.append("2x2 Recent ID Picture")
                    elif kw == "application form": req_candidates.append("Duly Accomplished Application Form")
                    elif kw == "recommendation": req_candidates.append("Recommendation Letter from Teacher/Principal")
            
            if req_candidates:
                requirements = list(dict.fromkeys(req_candidates))
            else:
                requirements = [
                    "Accomplished Application Form",
                    "Grade 12 Report Card / Transcript of Records",
                    "PSA Birth Certificate",
                    "Certificate of Good Moral Character",
                    "Parents' Proof of Income or Certificate of Indigency",
                    "2x2 ID Picture"
                ]

        date_match = re.search(r'(?:deadline|due|until|closes on)[:\s]*([A-Za-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})', extracted_text, re.IGNORECASE)
        if date_match:
            try:
                from dateutil import parser
                parsed_date = parser.parse(date_match.group(1))
                deadline = parsed_date.strftime('%Y-%m-%d')
            except:
                deadline = date_match.group(1)
        if not deadline:
            deadline = (datetime.date.today() + datetime.timedelta(days=30)).strftime('%Y-%m-%d')

        return {
            "success": True,
            "parsed": {
                "id": str(uuid.uuid4())[:8],
                "title": title,
                "provider": provider,
                "location": location,
                "deadline": deadline,
                "applyLink": apply_url or "https://",
                "requirements": requirements,
                "verified": bool(any(dom in apply_url for dom in ["gov.ph", "sm-foundation.org", "aboitizfoundation.com", "science-community.net", "landbank.com"]))
            }
        }
    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/api/scholarships', methods=['POST'])
@require_role('admin')
def add_scholarship():
    items = load_scholarships()
    new_item = request.json
    items.append(new_item)
    save_scholarships(items)
    return {"success": True, "scholarship": new_item}

@app.route('/api/scholarships/<item_id>', methods=['DELETE'])
@require_role('admin')
def delete_scholarship(item_id):
    items = load_scholarships()
    items = [item for item in items if item.get('id') != item_id]
    save_scholarships(items)
    return {"success": True}

@app.route('/api/scholarships/<item_id>', methods=['PUT'])
@require_role('admin')
def update_scholarship(item_id):
    items = load_scholarships()
    updated_data = request.json
    for i, item in enumerate(items):
        if item.get('id') == item_id:
            items[i].update(updated_data)
            save_scholarships(items)
            return {"success": True, "scholarship": items[i]}
    return {"error": "Scholarship not found"}, 404
@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    return {"attendance": load_json(ATTENDANCE_FILE)}

@app.route('/api/attendance', methods=['POST'])
def add_attendance():
    logs = load_json(ATTENDANCE_FILE)
    new_log = request.json or {}

    email = new_log.get('email', '').strip()
    event = new_log.get('event', '').strip()
    log_type = new_log.get('type', 'Time In')
    session = new_log.get('session')  # 'Morning' | 'Afternoon' | None (legacy)

    if not email or not event:
        return {"success": False, "error": "Email and event name are required."}, 400

    import datetime
    if not new_log.get('timestamp'):
        new_log['timestamp'] = datetime.datetime.now().isoformat()

    # Validate: cannot Time Out without a prior Time In for the same event (and session if provided)
    if log_type == 'Time Out':
        has_time_in = any(
            l.get('email') == email and
            l.get('event') == event and
            l.get('type') == 'Time In' and
            (not session or not l.get('session') or l.get('session') == session)
            for l in logs
        )
        if not has_time_in:
            session_label = f" ({session})" if session else ""
            return {"success": False, "error": f"Student has not timed in for {event}{session_label} yet."}, 400

    import uuid
    new_log['id'] = str(uuid.uuid4())
    logs.append(new_log)
    save_json(ATTENDANCE_FILE, logs)
    return {"success": True, "log": new_log}

@app.route('/api/attendance/<log_id>', methods=['DELETE'])
def delete_attendance(log_id):
    logs = load_json(ATTENDANCE_FILE)
    new_logs = [l for l in logs if l.get('id') != log_id]
    if len(logs) == len(new_logs):
        return {"error": "Attendance record not found."}, 404
    save_json(ATTENDANCE_FILE, new_logs)
    return {"success": True}

@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    announcements = load_json(ANNOUNCEMENTS_FILE)
    for a in announcements:
        if 'comments' not in a:
            a['comments'] = []
        if 'read_by' not in a:
            a['read_by'] = []
    return {"announcements": announcements}

@app.route('/api/register-device', methods=['POST'])
def register_device():
    email = request.json.get('email')
    token = request.json.get('token')
    if not email or not token:
        return {"error": "Missing email or token"}, 400
        
    users = load_json(USERS_FILE)
    for u in users:
        if u.get('email') == email:
            u['fcm_token'] = token
            save_json(USERS_FILE, users)
            return {"success": True}
    return {"error": "User not found"}, 404

@app.route('/api/announcements', methods=['POST'])
@require_role('admin')
def add_announcement():
    announcements = load_json(ANNOUNCEMENTS_FILE)
    new_announcement = request.json
    import uuid
    import datetime
    new_announcement['id'] = str(uuid.uuid4())
    new_announcement['timestamp'] = datetime.datetime.now().isoformat()
    new_announcement['comments'] = []
    new_announcement['read_by'] = []
    announcements.append(new_announcement)
    save_json(ANNOUNCEMENTS_FILE, announcements)
    
    # Try sending push notification
    try:
        from firebase_admin import messaging
        users = load_json(USERS_FILE)
        audience = new_announcement.get('audience', 'All')
        tokens = []
        for u in users:
            if u.get('fcm_token'):
                if audience == 'All' or audience == f"{u.get('role')}s":
                    tokens.append(u.get('fcm_token'))
                    
        if tokens:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=new_announcement.get('title', 'New Announcement'),
                    body=new_announcement.get('content', '')[:100]
                ),
                tokens=tokens
            )
            messaging.send_each_for_multicast(message)
    except Exception as e:
        print("FCM Push Error:", e)

    return {"success": True, "announcement": new_announcement}

@app.route('/api/announcements/<announcement_id>', methods=['DELETE'])
@require_role('admin')
def delete_announcement(announcement_id):
    announcements = load_json(ANNOUNCEMENTS_FILE)
    new_announcements = [a for a in announcements if str(a.get('id')) != str(announcement_id)]
    if len(announcements) == len(new_announcements):
        return {"error": "Announcement not found"}, 404
    save_json(ANNOUNCEMENTS_FILE, new_announcements)
    return {"success": True}

@app.route('/api/announcements/<announcement_id>/comments', methods=['POST'])
def add_comment(announcement_id):
    announcements = load_json(ANNOUNCEMENTS_FILE)
    comment = request.json or {}
    if not comment.get('content', '').strip():
        return {"error": "Comment content cannot be empty."}, 400
    import datetime
    import uuid
    comment['id'] = str(uuid.uuid4())
    comment['timestamp'] = datetime.datetime.now().isoformat()
    for a in announcements:
        if a['id'] == announcement_id:
            if 'comments' not in a:
                a['comments'] = []
            a['comments'].append(comment)
            a['read_by'] = [comment.get('authorEmail', '')] if comment.get('authorEmail') else []
            save_json(ANNOUNCEMENTS_FILE, announcements)
            return {"success": True, "comment": comment}
    return {"error": "Announcement not found"}, 404

@app.route('/api/unread_counts', methods=['POST'])
def unread_counts():
    email = request.json.get('email')
    if not email:
        return {"announcements": 0}
        
    users = load_json(USERS_FILE)
    user_role = next((u.get('role') for u in users if u.get('email') == email), None)
        
    announcements = load_json(ANNOUNCEMENTS_FILE)
    unread_announcements = 0
    for a in announcements:
        if email not in a.get('read_by', []):
            audience = a.get('audience', 'All')
            if user_role == 'admin':
                unread_announcements += 1
            elif audience == 'All' or audience == f"{user_role}s":
                unread_announcements += 1
            
    return {"announcements": unread_announcements}

@app.route('/api/announcements/mark_all_read', methods=['POST'])
def mark_all_read():
    email = request.json.get('email')
    if not email:
        return {"error": "Missing email"}, 400
    announcements = load_json(ANNOUNCEMENTS_FILE)
    changed = False
    for a in announcements:
        if 'read_by' not in a:
            a['read_by'] = []
        if email not in a['read_by']:
            a['read_by'].append(email)
            changed = True
    if changed:
        save_json(ANNOUNCEMENTS_FILE, announcements)
    return {"success": True}

@app.route('/api/announcements/<announcement_id>/read', methods=['POST'])
def mark_read(announcement_id):
    announcements = load_json(ANNOUNCEMENTS_FILE)
    email = request.json.get('email')
    for a in announcements:
        if a['id'] == announcement_id:
            if 'read_by' not in a:
                a['read_by'] = []
            if email not in a['read_by']:
                a['read_by'].append(email)
            save_json(ANNOUNCEMENTS_FILE, announcements)
            return {"success": True}
    return {"error": "Announcement not found"}, 404

@app.route('/api/recitations', methods=['GET'])
def get_recitations():
    return {"recitations": load_json(RECITATIONS_FILE)}

@app.route('/api/recitations', methods=['POST'])
@require_role('admin', 'volunteer')
def add_recitation():
    recitations = load_json(RECITATIONS_FILE)
    new_rec = request.json or {}
    import uuid
    import datetime
    new_rec['id'] = str(uuid.uuid4())
    if not new_rec.get('timestamp'):
        new_rec['timestamp'] = datetime.datetime.now().isoformat()
    recitations.append(new_rec)
    save_json(RECITATIONS_FILE, recitations)
    return {"success": True, "recitation": new_rec}

@app.route('/api/recitations/<rec_id>', methods=['DELETE'])
@require_role('admin', 'volunteer')
def delete_recitation(rec_id):
    recitations = load_json(RECITATIONS_FILE)
    new_recs = [r for r in recitations if r.get('id') != rec_id]
    save_json(RECITATIONS_FILE, new_recs)
    return {"success": True}

@app.route('/api/tickets', methods=['GET'])
def get_tickets():
    return {"tickets": load_json(TICKETS_FILE)}

@app.route('/api/tickets', methods=['POST'])
def add_ticket():
    try:
        tickets = load_json(TICKETS_FILE)
        new_ticket = request.json or {}
        if not new_ticket.get('title') or not str(new_ticket.get('title')).strip():
            return {"error": "Ticket title is required."}, 400
        if not new_ticket.get('createdBy') or not str(new_ticket.get('createdBy')).strip():
            return {"error": "Ticket creator email is required."}, 400

        import uuid
        import datetime
        new_ticket['id'] = str(uuid.uuid4())
        new_ticket['timestamp'] = datetime.datetime.now().isoformat()
        new_ticket['status'] = 'open'
        new_ticket['reply'] = ''
        tickets.append(new_ticket)
        save_json(TICKETS_FILE, tickets)
        return {"success": True, "ticket": new_ticket}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500

@app.route('/api/tickets/<ticket_id>', methods=['PUT'])
def resolve_ticket(ticket_id):
    tickets = load_json(TICKETS_FILE)
    data = request.json
    for t in tickets:
        if t.get('id') == ticket_id:
            t['status'] = 'resolved'
            t['reply'] = data.get('reply', '')
            break
    save_json(TICKETS_FILE, tickets)
    return {"success": True}

@app.route('/api/tickets/<ticket_id>', methods=['DELETE'])
def delete_ticket(ticket_id):
    tickets = load_json(TICKETS_FILE)
    new_tickets = [t for t in tickets if str(t.get('id')) != str(ticket_id)]
    save_json(TICKETS_FILE, new_tickets)
    return {"success": True}

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    inventory = load_json(INVENTORY_FILE) or []
    default_items = [
        {"id": 1, "name": "Yellow Pad Paper", "price": 200, "stock": 50, "iconType": "StickyNote", "color": "bg-yellow-100 text-yellow-600", "imageUrl": "/paper.jpg"},
        {"id": 2, "name": "₱20 Mobile Load", "price": 200, "stock": 50, "iconType": "Smartphone", "color": "bg-indigo-100 text-indigo-600", "imageUrl": "/load20.png"},
        {"id": 3, "name": "Drinks", "price": 150, "stock": 50, "iconType": "CupSoda", "color": "bg-cyan-100 text-cyan-600", "imageUrl": "/drinks.png"},
        {"id": 4, "name": "Pen", "price": 100, "stock": 50, "iconType": "PenTool", "color": "bg-blue-100 text-blue-600", "imageUrl": "/pen.png"},
        {"id": 5, "name": "Assorted Snacks", "price": 200, "stock": 50, "iconType": "Cookie", "color": "bg-orange-100 text-orange-600", "imageUrl": "/snacks.png"},
        {"id": 6, "name": "₱10 Cash", "price": 100, "stock": 50, "iconType": "Banknote", "color": "bg-emerald-100 text-emerald-600", "imageUrl": "/10_pesos.png"}
    ]
    borders = [
        {"id": "border_fire", "name": "Fire Streak Border", "price": 500, "stock": 99999, "itemType": "border", "iconType": "Flame", "color": "bg-orange-100 text-orange-600", "borderStyle": "fire"},
        {"id": "border_cyber", "name": "Cyber Diamond Border", "price": 1000, "stock": 99999, "itemType": "border", "iconType": "Hexagon", "color": "bg-cyan-100 text-cyan-600", "borderStyle": "cyber"},
        {"id": "border_gold", "name": "Gold Tier Border", "price": 1500, "stock": 99999, "itemType": "border", "iconType": "Crown", "color": "bg-yellow-100 text-yellow-600", "borderStyle": "gold"},
        {"id": "border_shore", "name": "Ocean Shore Border", "price": 800, "stock": 99999, "itemType": "border", "iconType": "Waves", "color": "bg-blue-100 text-blue-600", "borderStyle": "shore"},
        {"id": "border_nebula", "name": "Cosmic Nebula Border", "price": 1200, "stock": 99999, "itemType": "border", "iconType": "Sparkles", "color": "bg-purple-100 text-purple-600", "borderStyle": "nebula"}
    ]
    for item_def in default_items + borders:
        if not any(str(i.get('id')) == str(item_def['id']) for i in inventory):
            inventory.append(item_def)
            
    save_json(INVENTORY_FILE, inventory)
    return {"inventory": inventory}

@app.route('/api/inventory', methods=['POST'])
@require_role('admin')
def add_update_inventory():
    try:
        new_inventory = request.json
        save_json(INVENTORY_FILE, new_inventory)
        return {"success": True, "inventory": new_inventory}
    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/api/purchases', methods=['GET'])
def get_purchases():
    return {"purchases": load_json(PURCHASES_FILE)}

@app.route('/api/purchases/<purchase_id>', methods=['DELETE'])
def delete_purchase(purchase_id):
    purchases = load_json(PURCHASES_FILE)
    new_purchases = [p for p in purchases if p.get('id') != purchase_id]
    save_json(PURCHASES_FILE, new_purchases)
    return {"success": True}

@app.route('/api/inventory/purchase', methods=['POST'])
def purchase_item():
    try:
        data = request.json or {}
        user_email = data.get('userEmail')
        item_id = data.get('itemId')
        
        if not user_email or item_id is None:
            return {"error": "Missing userEmail or itemId"}, 400

        inventory = load_json(INVENTORY_FILE) or []
        default_items = [
            {"id": 1, "name": "Yellow Pad Paper", "price": 200, "stock": 50, "iconType": "StickyNote", "color": "bg-yellow-100 text-yellow-600", "imageUrl": "/paper.jpg"},
            {"id": 2, "name": "₱20 Mobile Load", "price": 200, "stock": 50, "iconType": "Smartphone", "color": "bg-indigo-100 text-indigo-600", "imageUrl": "/load20.png"},
            {"id": 3, "name": "Drinks", "price": 150, "stock": 50, "iconType": "CupSoda", "color": "bg-cyan-100 text-cyan-600", "imageUrl": "/drinks.png"},
            {"id": 4, "name": "Pen", "price": 100, "stock": 50, "iconType": "PenTool", "color": "bg-blue-100 text-blue-600", "imageUrl": "/pen.png"},
            {"id": 5, "name": "Assorted Snacks", "price": 200, "stock": 50, "iconType": "Cookie", "color": "bg-orange-100 text-orange-600", "imageUrl": "/snacks.png"},
            {"id": 6, "name": "₱10 Cash", "price": 100, "stock": 50, "iconType": "Banknote", "color": "bg-emerald-100 text-emerald-600", "imageUrl": "/10_pesos.png"}
        ]
        for item_def in default_items:
            if not any(isinstance(i, dict) and str(i.get('id')) == str(item_def['id']) for i in inventory):
                inventory.append(item_def)
        save_json(INVENTORY_FILE, inventory)
            
        purchases = load_json(PURCHASES_FILE)
        users = load_json(USERS_FILE)
        
        item = next((i for i in inventory if isinstance(i, dict) and str(i.get('id')) == str(item_id)), None)
        if not item:
            return {"error": "Item not found"}, 404
            
        if item.get('stock', 0) <= 0:
            return {"error": "Out of stock"}, 400
            
        # Check user balance server-side
        price = item.get('price', 0)
        attendance = load_json(ATTENDANCE_FILE)
        recitations = load_json(RECITATIONS_FILE)
        
        att_count = sum(1 for log in attendance if log.get('email') == user_email and log.get('type') == 'Time In')
        rec_score = sum(r.get('score', 0) for r in recitations if r.get('studentEmail') == user_email)
        spent_coins = sum(p.get('price', 0) for p in purchases if p.get('studentEmail') == user_email)
        
        total_earned = (att_count * 10) + (rec_score * 5)
        current_balance = max(0, total_earned - spent_coins)
        
        user = next((u for u in users if u.get('email') == user_email), None)
        is_admin = user and user.get('role') == 'admin'
        if not is_admin and current_balance < price:
            return {"error": f"Insufficient SHORE coins balance. You have {current_balance} coins, needed {price} coins."}, 400

        # Deduct stock
        item['stock'] -= 1
        save_json(INVENTORY_FILE, inventory)
        
        if user and item.get('itemType') == 'border':
            if 'ownedBorders' not in user:
                user['ownedBorders'] = []
            if item_id not in user['ownedBorders']:
                user['ownedBorders'].append(item_id)
            save_json(USERS_FILE, users)
        
        # Log purchase
        import datetime
        import uuid
        new_purchase = {
            "id": str(uuid.uuid4()),
            "studentEmail": user_email,
            "itemId": item_id,
            "price": item.get('price'),
            "timestamp": datetime.datetime.now().isoformat()
        }
        purchases.append(new_purchase)
        save_json(PURCHASES_FILE, purchases)
        
        # Return updated user if available
        safe_user = {k: v for k, v in user.items() if k != 'password'} if user else None
        
        return {"success": True, "purchase": new_purchase, "user": safe_user}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500

@app.route('/api/inventory/equip', methods=['POST'])
def equip_border():
    try:
        data = request.json
        user_email = data.get('userEmail')
        border_id = data.get('borderId')
        
        users = load_json(USERS_FILE)
        user = next((u for u in users if u.get('email') == user_email), None)
        if not user:
            return {"error": "User not found"}, 404
            
        user['equippedBorder'] = border_id
        save_json(USERS_FILE, users)
        
        safe_user = {k: v for k, v in user.items() if k != 'password'}
        return {"success": True, "user": safe_user}
    except Exception as e:
        return {"error": str(e)}, 500


@app.route('/api/generate-pdf', methods=['POST'])
def handle_generate_pdf():
    try:
        student_name = request.form.get('student_name')
        if not student_name:
            student_name = request.json.get('student_name') if request.is_json else None
        
        report_type = request.form.get('report_type', 'both')
        if not request.form and request.is_json:
            report_type = request.json.get('report_type', 'both')
            
        data = load_dict(TRACKER_DATA_FILE)
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except:
                data = {}
                
        if not data or 'pre' not in data:
            return {"error": "No tracker data available in database."}, 404
        
        # We don't check data['students'] because it's not saved in tracker_data.
        # Just check if student is in pre or post
        if student_name not in data.get('pre', {}) and student_name not in data.get('post', {}):
            return {"error": f"Student '{student_name}' not found in data."}, 404
            
        from pdf_generator import generate_pdf_from_data
        pdf_bytes = generate_pdf_from_data(data, student_name, report_type)
        
        buffer = io.BytesIO(pdf_bytes)
        
        # Sanitize student_name against path traversal, control chars, and illegal filename characters
        safe_name = re.sub(r'[^a-zA-Z0-9_\- ]', '', str(student_name or '')).strip().replace(" ", "_")
        if not safe_name:
            safe_name = "Student"
        prefix = "Progress"
        if report_type == 'pre': prefix = "Pre-Test"
        elif report_type == 'post': prefix = "Post-Test"
        filename = f"SHORE_{prefix}_{safe_name}.pdf"
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error generating PDF: {e}")
        return {"error": str(e)}, 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("=======================================================")
    print(" SHORE 5.0 Backend Server Running ")
    print(f" Access the interface at: http://0.0.0.0:{port}")
    print("=======================================================")
    app.run(host='0.0.0.0', port=port, debug=False)
