import os
import io
import re
import json
import time
import socket
import hmac
import ipaddress
import urllib.parse
import urllib.request
import secrets
import threading
from functools import wraps
import jwt
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, send_file, jsonify, redirect
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from pdf_generator import generate_pdf_bytes
from calendar_events import audience_allows, normalize_event, notification_allows, validate_event_payload

# Serve from frontend/dist — uses pathlib so this works from any CWD
import pathlib
_BASE_DIR = pathlib.Path(__file__).parent  # directory containing this server.py
app = Flask(__name__, static_folder=str(_BASE_DIR / 'frontend' / 'dist'), static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max payload

# -------------------------------------------------------------
# CORS & CSRF DEFENSES
# -------------------------------------------------------------
ALLOWED_ORIGIN_PATTERNS = [
    r'^http://localhost(:\d+)?$',
    r'^http://127\.0\.0\.1(:\d+)?$',
    r'^http://192\.168\.\d+\.\d+(:\d+)?$',
    r'^http://10\.\d+\.\d+\.\d+(:\d+)?$',
    r'^http://172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$',
    r'^https?://.*\.shoreskwela\.com$',
    r'^https?://.*\.firebaseapp\.com$',
    r'^https?://.*\.web\.app$',
]

_custom_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if _custom_origins:
    for o in _custom_origins.split(','):
        if o.strip():
            ALLOWED_ORIGIN_PATTERNS.append(re.escape(o.strip()))

def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return True
    origin_clean = origin.strip().rstrip('/')
    for pattern in ALLOWED_ORIGIN_PATTERNS:
        if re.match(pattern, origin_clean, re.IGNORECASE):
            return True
    return False

CORS(app, origins=is_allowed_origin, supports_credentials=True)

@app.before_request
def csrf_defense_middleware():
    """Rejects state-changing requests originating from unauthorized foreign domains (CSRF defense)."""
    if request.method in ('POST', 'PUT', 'DELETE', 'PATCH'):
        if request.path.startswith('/api/auth/google/callback'):
            return None
        origin = request.headers.get('Origin')
        if origin and not is_allowed_origin(origin):
            return jsonify({"error": "Forbidden. Cross-origin request rejected (CSRF protection)."}), 403

# -------------------------------------------------------------
# HTTP SECURITY HEADERS & ERROR HANDLERS (MitM & XSS DEFENSES)
# -------------------------------------------------------------
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(self)'
    
    # HSTS - MitM & SSL Stripping Defense
    is_https = request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https'
    if is_https:
        response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'

    if 'Content-Security-Policy' not in response.headers:
        response.headers['Content-Security-Policy'] = (
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; "
            "img-src 'self' data: https: blob: https://*.googleusercontent.com; "
            "font-src 'self' https: data: https://fonts.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "connect-src 'self' https: wss: https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://*.firebaseio.com; "
            "frame-src 'self' https://accounts.google.com; "
            "frame-ancestors 'self'; "
            "object-src 'none'; "
            "base-uri 'self';"
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

_FAILED_LOGINS = {}
_FAILED_LOGINS_LOCK = threading.Lock()

def check_account_lock(account_key: str) -> tuple:
    """Checks if an account or IP is temporarily locked due to repeated failed logins. Returns (is_locked, retry_after)."""
    now = time.time()
    with _FAILED_LOGINS_LOCK:
        record = _FAILED_LOGINS.get(account_key)
        if not record:
            return False, 0
        lock_until = record.get('lock_until', 0)
        if lock_until > now:
            return True, max(1, int(lock_until - now))
        if lock_until != 0 and lock_until <= now:
            _FAILED_LOGINS.pop(account_key, None)
            return False, 0
    return False, 0

def record_failed_login(account_key: str) -> tuple:
    """Records a failed login attempt. Locks account for 120s if 5 attempts within 5 minutes occur."""
    now = time.time()
    with _FAILED_LOGINS_LOCK:
        record = _FAILED_LOGINS.get(account_key, {'attempts': [], 'lock_until': 0})
        attempts = [t for t in record.get('attempts', []) if now - t < 300]
        attempts.append(now)
        record['attempts'] = attempts
        if len(attempts) >= 5:
            record['lock_until'] = now + 120
            _FAILED_LOGINS[account_key] = record
            return True, 120
        _FAILED_LOGINS[account_key] = record
        return False, 0

def clear_failed_login(account_key: str):
    with _FAILED_LOGINS_LOCK:
        _FAILED_LOGINS.pop(account_key, None)

def safe_str_compare(val1, val2) -> bool:
    """Constant-time string comparison to prevent timing side-channel attacks."""
    if val1 is None or val2 is None:
        return False
    return hmac.compare_digest(str(val1), str(val2))

def sanitize_user_record(user: dict) -> dict:
    """Strips sensitive credentials (password, pin, password_hash, pin_hash) from user objects returned in API responses (OWASP API3:2023)."""
    if not isinstance(user, dict):
        return user
    sensitive_keys = {'password', 'pin', 'password_hash', 'pin_hash'}
    safe = {k: v for k, v in user.items() if k not in sensitive_keys}
    safe['hasPassword'] = bool(user.get('password_hash') or user.get('password'))
    safe['hasPin'] = bool(user.get('pin_hash') or user.get('pin'))
    return safe

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
def _resolve_jwt_secret():
    secret = os.environ.get('JWT_SECRET')
    if secret:
        return secret
    secret_path = _BASE_DIR / '.jwt_secret'
    try:
        if secret_path.exists():
            saved = secret_path.read_text(encoding='utf-8').strip()
            if saved:
                return saved
        generated = secrets.token_hex(32)
        secret_path.write_text(generated, encoding='utf-8')
        return generated
    except Exception:
        return 'shore-skwela-secret-jwt-key-secure-fallback-node-8934'

JWT_SECRET = _resolve_jwt_secret()

def create_jwt_token(user_dict: dict) -> str:
    """Generates a secure signed JWT token valid for 30 days with issuance timestamp."""
    email = (user_dict.get('email') or '').strip().lower()
    role = user_dict.get('role', 'student')
    name = user_dict.get('name', '')
    now = int(time.time())
    payload = {
        'email': email,
        'role': role,
        'name': name,
        'iat': now,
        'exp': now + (86400 * 30)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token

def decode_jwt_token(token_str: str) -> dict:
    """Decodes and validates JWT signature, expiration, and password-change revocation status."""
    if not token_str:
        return None
    try:
        payload = jwt.decode(token_str, JWT_SECRET, algorithms=['HS256'])
        token_email = (payload.get('email') or '').strip().lower()
        if token_email:
            users = load_json(USERS_FILE)
            user = next((u for u in users if (u.get('email') or '').strip().lower() == token_email), None)
            if user:
                pwd_changed_at = user.get('password_changed_at', 0)
                if pwd_changed_at and payload.get('iat', 0) < pwd_changed_at:
                    # Token was issued before password change/reset -> REVOKED
                    return None
        return payload
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

def find_roster_matches(name):
    """Return canonical roster matches for a name, grouped by account role."""
    normalized_name = " ".join(str(name or "").strip().casefold().split())
    if not normalized_name:
        return []

    matches = []
    seen = set()
    for role, collection in (("student", STUDENTS_FILE), ("volunteer", VOLUNTEERS_FILE)):
        roster = load_json(collection)
        if not isinstance(roster, list):
            continue
        for roster_name in roster:
            if isinstance(roster_name, str) and " ".join(roster_name.strip().casefold().split()) == normalized_name:
                match_key = (role, roster_name.strip().casefold())
                if match_key not in seen:
                    seen.add(match_key)
                    matches.append((role, roster_name.strip()))
    return matches

@app.route('/api/users/register', methods=['POST'])
def register():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1').split(',')[0].strip()
    allowed, retry_after = _RATE_LIMITER.is_allowed(f"register_{client_ip}", max_requests=15, window_seconds=60)
    if not allowed:
        return jsonify({"error": f"Too many registration requests from this network. Please try again in {retry_after} seconds.", "retry_after": retry_after}), 429

    users = load_json(USERS_FILE)
    new_user = request.json or {}
    
    role = new_user.get('role', 'student')
    name = (new_user.get('name') or '').strip()
    raw_email = sanitize_text(new_user.get('email') or '').strip().lower()
    password = str(new_user.get('password') or '')
    pin = str(new_user.get('pin') or '').strip()

    if not name:
        return jsonify({"error": "Full name is required for registration."}), 400

    if role not in ('student', 'volunteer'):
        return jsonify({"error": "Choose Student or Volunteer before creating your account.", "code": "invalid_role"}), 400

    if not raw_email:
        return jsonify({"error": "Account username or email is required."}), 400

    email = raw_email if '@' in raw_email else f"{raw_email}@shoreskwela.com"

    role_roster_matches = [match for match in find_roster_matches(name) if match[0] == role]
    if not role_roster_matches:
        roster_label = "student" if role == "student" else "volunteer"
        return jsonify({
            "error": f"No {roster_label} roster entry found with this name.",
            "code": "roster_name_mismatch"
        }), 400
    name = role_roster_matches[0][1]
        
    for user in users:
        if (user.get('email') or '').strip().lower() == email:
            return jsonify({"error": "An account with this username already exists.", "code": "account_exists"}), 400

    # 4-digit security PIN verification
    if not pin or len(pin) != 4 or not pin.isdigit():
        return jsonify({"error": "Enter a 4-digit PIN for account recovery.", "code": "invalid_pin"}), 400

    # Secure password policy enforcement: min 8 chars, uppercase, lowercase, number, special character
    if (len(password) < 8 or 
        not re.search(r'[A-Z]', password) or 
        not re.search(r'[a-z]', password) or 
        not re.search(r'[0-9]', password) or 
        not re.search(r'[^a-zA-Z0-9]', password)):
        return jsonify({
            "error": "Password needs 8+ characters, letters, a number, and symbol.",
            "code": "weak_password"
        }), 400
            
    # Cryptographically secure salted password and PIN hashing
    password_hash = generate_password_hash(password)
    pin_hash = generate_password_hash(pin)

    user_record = {
        "name": name,
        "email": email,
        "role": role,
        "password_hash": password_hash,
        "pin_hash": pin_hash
    }
    users.append(user_record)
    save_json(USERS_FILE, users)
    
    safe_user = sanitize_user_record(user_record)
    token = create_jwt_token(user_record)
    return jsonify({"success": True, "user": safe_user, "token": token}), 201


@app.route('/api/users/login', methods=['POST'])
def login():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1').split(',')[0].strip()
    allowed, retry_after = _RATE_LIMITER.is_allowed(f"login_{client_ip}", max_requests=30, window_seconds=60)
    if not allowed:
        return jsonify({"error": f"Too many attempts. Try again in {retry_after}s.", "retry_after": retry_after}), 429

    creds = request.json or {}
    email = sanitize_text(creds.get('email') or '').strip().lower()
    password = str(creds.get('password') or '')

    if not email or not password:
        return jsonify({"error": "Enter your username and password."}), 400

    # Account-level brute-force lock check
    is_locked, lock_seconds = check_account_lock(email)
    if is_locked:
        return jsonify({
            "error": f"Account temporarily locked. Try again in {lock_seconds}s.",
            "locked": True,
            "retry_after": lock_seconds
        }), 429

    users = load_json(USERS_FILE)
    matched_user = None
    input_user = email.replace('@shoreskwela.com', '').strip().lower()
    for user in users:
        user_email = (user.get('email') or '').strip().lower()
        user_name = " ".join((user.get('name') or '').strip().lower().split())
        user_username = user_email.replace('@shoreskwela.com', '').strip().lower()
        if user_email == email or user_username == input_user or (user_name and user_name == input_user):
            matched_user = user
            break

    if not matched_user:
        # Check if this name exists on the school roster to give a specific, helpful hint
        roster_matches = find_roster_matches(input_user)
        if roster_matches:
            return jsonify({
                "error": "No account with this name yet. Please register first.",
                "code": "account_not_found",
                "on_roster": True
            }), 401
        return jsonify({
            "error": "No account with this name.",
            "code": "account_not_found"
        }), 401

    is_valid = False
    needs_upgrade = False

    stored_hash = matched_user.get('password_hash')
    stored_plain = matched_user.get('password')

    if stored_hash:
        is_valid = check_password_hash(stored_hash, password)
    elif stored_plain is not None:
        # Legacy plain-text fallback with automatic hash upgrade
        is_valid = safe_str_compare(stored_plain, password)
        if is_valid:
            needs_upgrade = True

    if is_valid:
        clear_failed_login(email)
        
        # Transparent credential upgrade for legacy accounts
        if needs_upgrade or not matched_user.get('password_hash'):
            matched_user['password_hash'] = generate_password_hash(password)
            matched_user.pop('password', None)
            if matched_user.get('pin') and not matched_user.get('pin_hash'):
                matched_user['pin_hash'] = generate_password_hash(str(matched_user['pin']))
                matched_user.pop('pin', None)
            save_json(USERS_FILE, users)

        safe_user = sanitize_user_record(matched_user)
        token = create_jwt_token(matched_user)
        return jsonify({"success": True, "user": safe_user, "token": token}), 200

    locked_now, lock_time = record_failed_login(email)
    if locked_now:
        return jsonify({
            "error": f"Too many failed attempts. Account locked for {lock_time}s.",
            "locked": True,
            "retry_after": lock_time
        }), 429

    return jsonify({"error": "Incorrect password.", "code": "invalid_password"}), 401

@app.route('/api/users/google-login', methods=['POST'])
def google_login():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1').split(',')[0].strip()
    allowed, retry_after = _RATE_LIMITER.is_allowed(f"google_login_{client_ip}", max_requests=25, window_seconds=60)
    if not allowed:
        return jsonify({"error": f"Too many Google sign-in attempts. Please try again in {retry_after} seconds.", "retry_after": retry_after}), 429

    data = request.json or {}
    email = sanitize_text(data.get('email') or '').strip().lower()
    name = sanitize_text(data.get('name') or '').strip()
    google_id = sanitize_text(str(data.get('google_id') or data.get('uid') or ''))
    avatar = sanitize_text(data.get('avatar_url') or data.get('photoURL') or '')

    if not email or '@' not in email:
        return jsonify({"error": "A valid Google email address is required."}), 400

    users = load_json(USERS_FILE)
    matched_user = next((u for u in users if (u.get('email') or '').strip().lower() == email), None)

    if matched_user:
        updated = False
        if google_id and matched_user.get('google_id') != google_id:
            matched_user['google_id'] = google_id
            updated = True
        if avatar and not matched_user.get('avatar'):
            matched_user['avatar'] = avatar
            updated = True
        if updated:
            save_json(USERS_FILE, users)
        safe_user = sanitize_user_record(matched_user)
        token = create_jwt_token(matched_user)
        return jsonify({"success": True, "user": safe_user, "token": token}), 200

    # First-time Google sign-ins may only create accounts for rostered people.
    roster_matches = find_roster_matches(name)
    if not roster_matches:
        return jsonify({
            "error": "No SHORE roster match found for this Google profile. Create an account with the name listed in your student or volunteer roster.",
            "code": "roster_name_mismatch"
        }), 403
    if len(roster_matches) > 1:
        return jsonify({
            "error": "This name appears in both rosters. Create your account by choosing Student or Volunteer first.",
            "code": "ambiguous_roster_name"
        }), 403
    role, display_name = roster_matches[0]

    new_user = {
        "name": display_name,
        "email": email,
        "role": role,
        "google_id": google_id or f"google_{int(time.time())}",
        "auth_provider": "google",
        "created_at": time.time()
    }
    if avatar:
        new_user['avatar'] = avatar

    users.append(new_user)
    save_json(USERS_FILE, users)

    safe_user = sanitize_user_record(new_user)
    token = create_jwt_token(new_user)
    return jsonify({"success": True, "user": safe_user, "token": token, "is_new_user": True}), 200

@app.route('/api/auth/google/config', methods=['GET'])
def google_oauth_config():
    client_id = os.environ.get('GOOGLE_CLIENT_ID') or os.environ.get('VITE_GOOGLE_CLIENT_ID')
    return jsonify({
        "configured": bool(client_id),
        "client_id": client_id if client_id else None
    }), 200

@app.route('/api/auth/google/login', methods=['GET'])
def google_oauth_login():
    client_id = os.environ.get('GOOGLE_CLIENT_ID') or os.environ.get('VITE_GOOGLE_CLIENT_ID')
    host = request.host_url.rstrip('/')
    redirect_uri = f"{host}/api/auth/google/callback"
    if not client_id:
        return redirect("/?auth_error=Google+OAuth+Client+ID+not+configured.+Please+set+GOOGLE_CLIENT_ID+in+.env")
    
    state = secrets.token_urlsafe(16)
    google_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={urllib.parse.quote(client_id)}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        "response_type=code&"
        "scope=openid%20email%20profile&"
        "prompt=select_account&"
        f"state={state}"
    )
    return redirect(google_url)

@app.route('/api/auth/google/callback', methods=['GET'])
def google_oauth_callback():
    code = request.args.get('code')
    if not code:
        err = request.args.get('error', 'Google sign-in was cancelled.')
        return redirect(f"/?auth_error={urllib.parse.quote(err)}")

    client_id = os.environ.get('GOOGLE_CLIENT_ID') or os.environ.get('VITE_GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    host = request.host_url.rstrip('/')
    redirect_uri = f"{host}/api/auth/google/callback"

    try:
        token_payload = urllib.parse.urlencode({
            'code': code,
            'client_id': client_id or '',
            'client_secret': client_secret or '',
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }).encode('utf-8')
        req = urllib.request.Request(
            'https://oauth2.googleapis.com/token',
            data=token_payload,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            token_data = json.loads(resp.read().decode('utf-8'))
        
        access_token = token_data.get('access_token')
        id_token = token_data.get('id_token')
        
        user_info = {}
        if access_token:
            u_req = urllib.request.Request(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f"Bearer {access_token}"}
            )
            with urllib.request.urlopen(u_req, timeout=10) as u_resp:
                user_info = json.loads(u_resp.read().decode('utf-8'))
        elif id_token:
            user_info = jwt.decode(id_token, options={"verify_signature": False})
        
        email = sanitize_text(user_info.get('email') or '').strip().lower()
        name = sanitize_text(user_info.get('name') or '').strip()
        google_id = sanitize_text(str(user_info.get('sub') or ''))
        avatar = sanitize_text(user_info.get('picture') or '')
        
        if not email:
            return redirect("/?auth_error=No+email+provided+by+Google")
            
        users = load_json(USERS_FILE)
        matched_user = next((u for u in users if (u.get('email') or '').strip().lower() == email), None)
        if matched_user:
            token = create_jwt_token(matched_user)
        else:
            roster_matches = find_roster_matches(name)
            if not roster_matches:
                return redirect("/?auth_error=" + urllib.parse.quote("No SHORE roster match found for this Google profile. Create an account with the name listed in your student or volunteer roster."))
            if len(roster_matches) > 1:
                return redirect("/?auth_error=" + urllib.parse.quote("This name appears in both rosters. Create your account by choosing Student or Volunteer first."))
            role, display_name = roster_matches[0]
            new_user = {
                "name": display_name,
                "email": email,
                "role": role,
                "google_id": google_id or f"google_{int(time.time())}",
                "auth_provider": "google",
                "created_at": time.time(),
                "avatar": avatar
            }
            users.append(new_user)
            save_json(USERS_FILE, users)
            token = create_jwt_token(new_user)
            
        return redirect(f"/?token={urllib.parse.quote(token)}&google_auth=success#dashboard")
    except Exception as e:
        print("Google OAuth callback exception:", e)
        return redirect(f"/?auth_error={urllib.parse.quote(str(e))}")

@app.route('/api/users/me', methods=['GET'])
@token_required(optional=False)
def get_current_user_profile():
    email = request.current_user.get('email')
    users = load_json(USERS_FILE)
    user = next((u for u in users if (u.get('email') or '').strip().lower() == email), None)
    if not user:
        return jsonify({"error": "User not found"}), 404
    safe_user = sanitize_user_record(user)
    return jsonify({"user": safe_user, "token_payload": request.current_user}), 200

@app.route('/api/users', methods=['GET'])
@token_required(optional=False)
def get_all_users():
    users = load_json(USERS_FILE)
    safe_users = [sanitize_user_record(u) for u in users]
    response = jsonify({"users": safe_users})
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return response, 200

@app.route('/api/users/change-password', methods=['POST'])
def change_password():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1').split(',')[0].strip()
    allowed, retry_after = _RATE_LIMITER.is_allowed(f"chg_pwd_{client_ip}", max_requests=15, window_seconds=60)
    if not allowed:
        return jsonify({"error": f"Too many requests. Please try again in {retry_after} seconds.", "retry_after": retry_after}), 429

    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    current_password = str(data.get('current_password') or '')
    new_password = str(data.get('new_password') or '')
    
    if not email:
        return jsonify({"error": "Account email is required."}), 400
    if not current_password:
        return jsonify({"error": "Current password is required."}), 400
    
    # Password complexity enforcement: min 8 chars, uppercase, lowercase, numbers, special characters
    if (len(new_password) < 8 or 
        not re.search(r'[A-Z]', new_password) or 
        not re.search(r'[a-z]', new_password) or 
        not re.search(r'[0-9]', new_password) or 
        not re.search(r'[^a-zA-Z0-9]', new_password)):
        return jsonify({
            "error": "New password must be at least 8 characters long and contain uppercase, lowercase, numbers, and at least one special character."
        }), 400

    users = load_json(USERS_FILE)
    for i, user in enumerate(users):
        if (user.get('email') or '').strip().lower() == email:
            is_valid = False
            if user.get('password_hash'):
                is_valid = check_password_hash(user['password_hash'], current_password)
            elif user.get('password') is not None:
                is_valid = safe_str_compare(user.get('password'), current_password)

            if not is_valid:
                return jsonify({"error": "Current password is incorrect."}), 400
            
            users[i]['password_hash'] = generate_password_hash(new_password)
            users[i]['password_changed_at'] = int(time.time())
            users[i].pop('password', None)
            save_json(USERS_FILE, users)
            return jsonify({"success": True, "message": "Password changed successfully. All previous sessions have been invalidated."}), 200
            
    return jsonify({"error": "User account not found."}), 404

@app.route('/api/users/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    pin = str(data.get('pin') or '').strip()
    new_password = str(data.get('new_password') or '')
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1').split(',')[0].strip()
    
    if not email:
        return jsonify({"error": "Account email or username is required."}), 400
    if '@' not in email:
        email = f"{email}@shoreskwela.com"

    # Brute-force lockout for PIN attempts
    rate_key = f"pin_reset_{email}_{client_ip}"
    allowed, retry_after = _RATE_LIMITER.is_allowed(rate_key, max_requests=10, window_seconds=300)
    if not allowed:
        return jsonify({"error": f"Too many reset attempts. Wait {retry_after}s.", "retry_after": retry_after}), 429

    # Password policy check: at least 8 chars with uppercase, lowercase, numbers, and symbols
    if (len(new_password) < 8 or 
        not re.search(r'[A-Z]', new_password) or 
        not re.search(r'[a-z]', new_password) or 
        not re.search(r'[0-9]', new_password) or
        not re.search(r'[^a-zA-Z0-9]', new_password)):
        return jsonify({
            "error": "New password needs 8+ characters, letters, a number, and symbol.",
            "code": "weak_password"
        }), 400

    users = load_json(USERS_FILE)
    matched_user = None
    input_user = email.replace('@shoreskwela.com', '').strip().lower()
    for user in users:
        user_email = (user.get('email') or '').strip().lower()
        user_name = " ".join((user.get('name') or '').strip().lower().split())
        user_username = user_email.replace('@shoreskwela.com', '').strip().lower()
        if user_email == email or user_username == input_user or (user_name and user_name == input_user):
            matched_user = user
            break

    if not matched_user:
        return jsonify({"error": "No account with this name.", "code": "account_not_found"}), 404

    pin_valid = False
    if matched_user.get('pin_hash'):
        pin_valid = check_password_hash(matched_user['pin_hash'], pin)
    elif matched_user.get('pin'):
        pin_valid = safe_str_compare(str(matched_user['pin']), pin)

    if pin_valid:
        matched_user['password_hash'] = generate_password_hash(new_password)
        matched_user['password_changed_at'] = int(time.time())
        matched_user.pop('password', None)
        # Upgrade PIN to hash if it was plaintext
        if not matched_user.get('pin_hash') and pin:
            matched_user['pin_hash'] = generate_password_hash(pin)
            matched_user.pop('pin', None)
        save_json(USERS_FILE, users)
        clear_failed_login(email)
        return jsonify({"success": True, "message": "Password reset successful."}), 200
    return jsonify({"error": "Incorrect 4-digit PIN.", "code": "invalid_pin"}), 400


@app.route('/api/users/<path:email>', methods=['PUT'])
@token_required(optional=False)
def update_user(email):
    users = load_json(USERS_FILE)
    normalized_email = urllib.parse.unquote(email or '').strip().lower()
    caller = request.current_user or {}
    caller_email = (caller.get('email') or '').strip().lower()
    caller_role = caller.get('role', 'student')

    # BOLA Defense: caller must be admin or modifying their own profile
    is_admin = (caller_role == 'admin')
    is_self = (caller_email == normalized_email)
    if not is_admin and not is_self:
        return jsonify({"error": "Forbidden. You are not authorized to update another user's account."}), 403

    target_idx = next((i for i, u in enumerate(users) if (u.get('email') or '').strip().lower() == normalized_email), -1)
    if target_idx == -1:
        users = load_json(USERS_FILE, bypass_cache=True)
        target_idx = next((i for i, u in enumerate(users) if (u.get('email') or '').strip().lower() == normalized_email), -1)

    if target_idx != -1:
        updated_data = dict(request.json or {})

        # Privilege Escalation Defense: non-admins CANNOT change roles!
        if not is_admin and 'role' in updated_data and updated_data['role'] != users[target_idx].get('role'):
            return jsonify({"error": "Forbidden. Only administrators can change account roles."}), 403

        # Non-admins cannot alter their own registered email address
        new_email = (updated_data.get('email') or '').strip().lower()
        if not is_admin and new_email and new_email != normalized_email:
            return jsonify({"error": "Forbidden. Changing account email requires administrator assistance."}), 403

        if new_email and new_email != normalized_email:
            if any((u.get('email') or '').strip().lower() == new_email for u in users):
                return jsonify({"error": "Email already in use by another account."}), 400
        
        # If password update is requested, validate and hash it securely
        if 'password' in updated_data:
            new_pwd = str(updated_data.pop('password') or '').strip()
            if new_pwd:
                if (len(new_pwd) < 8 or 
                    not re.search(r'[A-Z]', new_pwd) or 
                    not re.search(r'[a-z]', new_pwd) or 
                    not re.search(r'[0-9]', new_pwd) or 
                    not re.search(r'[^a-zA-Z0-9]', new_pwd)):
                    return jsonify({
                        "error": "Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and at least one special character."
                    }), 400
                users[target_idx]['password_hash'] = generate_password_hash(new_pwd)
                users[target_idx]['password_changed_at'] = int(time.time())
                users[target_idx].pop('password', None)

        # If PIN update is requested, validate and hash it securely
        if 'pin' in updated_data:
            new_pin = str(updated_data.pop('pin') or '').strip()
            if new_pin:
                if len(new_pin) != 4 or not new_pin.isdigit():
                    return jsonify({"error": "PIN must be exactly 4 digits."}), 400
                users[target_idx]['pin_hash'] = generate_password_hash(new_pin)
                users[target_idx].pop('pin', None)

        # Sanitize strings to neutralize stored control characters
        if 'name' in updated_data:
            updated_data['name'] = sanitize_text(str(updated_data['name']))

        users[target_idx].update(updated_data)
        save_json(USERS_FILE, users)
        safe_user = sanitize_user_record(users[target_idx])
        return jsonify({"success": True, "user": safe_user})

    return jsonify({"error": "Account not found. New accounts must use SHORE registration."}), 404

@app.route('/api/users/<path:email>', methods=['DELETE'])
@require_role('admin')
def delete_user(email):
    users = load_json(USERS_FILE)
    normalized_email = urllib.parse.unquote(email or '').strip().lower()
    target = next((u for u in users if (u.get('email') or '').strip().lower() == normalized_email), None)
    if not target:
        users = load_json(USERS_FILE, bypass_cache=True)
        target = next((u for u in users if (u.get('email') or '').strip().lower() == normalized_email), None)
    if not target:
        return jsonify({"error": "User not found."}), 404

    current_email = (request.current_user.get('email') or '').strip().lower()
    if normalized_email == current_email:
        return jsonify({"error": "You can't delete the account you're currently using."}), 409

    if target.get('role') == 'admin' and sum(1 for user in users if user.get('role') == 'admin') <= 1:
        return jsonify({"error": "You can't delete the last administrator account."}), 409

    new_users = [u for u in users if (u.get('email') or '').strip().lower() != normalized_email]
    save_json(USERS_FILE, new_users)
    return jsonify({"success": True})

@app.route('/api/allowed_students', methods=['GET'])
@token_required(optional=False)
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
@token_required(optional=False)
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

@app.route('/launch/<nonce>')
def fresh_launch(nonce):
    """Serve the app from a unique path to bypass stale local service workers."""
    return app.send_static_file('index.html')

def _send_event_push(event, action, actor_email=''):
    """Best-effort event notification; calendar writes never depend on FCM."""
    try:
        from firebase_admin import messaging
        audience = event.get('audience', 'all')
        tokens = []
        for user in load_json(USERS_FILE):
            token = user.get('fcm_token')
            email = (user.get('email') or '').strip().lower()
            if token and email != actor_email and notification_allows(user.get('role', 'student'), audience):
                tokens.append(token)
        if not tokens:
            return
        action_title = {'created': 'New calendar event', 'updated': 'Calendar event updated', 'deleted': 'Calendar event cancelled'}[action]
        date_label = event.get('date', '')
        body = f"{event.get('title', 'Calendar event')} · {date_label}".strip(' ·')
        messaging.send_each_for_multicast(messaging.MulticastMessage(
            notification=messaging.Notification(title=action_title, body=body[:120]),
            tokens=list(dict.fromkeys(tokens)),
        ))
    except Exception as exc:
        print('Calendar FCM Push Error:', exc)


@app.route('/api/events', methods=['GET'])
@token_required()
def get_events():
    role = request.current_user.get('role', 'student')
    events = [normalize_event(event) for event in load_events()]
    return {"events": [event for event in events if audience_allows(role, event.get('audience', 'all'))]}

@app.route('/api/events', methods=['POST'])
@require_role('admin', 'volunteer')
def add_event():
    events = load_events()
    new_event, error = validate_event_payload(request.json or {})
    if error:
        return {"error": error}, 400
    import uuid
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    actor = request.current_user
    new_event['id'] = str(uuid.uuid4())
    new_event['createdBy'] = actor.get('email', '')
    new_event['createdAt'] = now
    new_event['updatedAt'] = now
    events.append(new_event)
    save_events(events)
    _send_event_push(new_event, 'created', actor.get('email', '').strip().lower())
    return {"success": True, "event": new_event}

@app.route('/api/events/<event_id>', methods=['DELETE'])
@require_role('admin', 'volunteer')
def delete_event(event_id):
    events = load_events()
    deleted_event = next((normalize_event(event) for event in events if str(event.get('id')) == str(event_id)), None)
    if not deleted_event:
        return {"error": "Event not found"}, 404
    events = [e for e in events if str(e.get('id')) != str(event_id)]
    save_events(events)
    _send_event_push(deleted_event, 'deleted', request.current_user.get('email', '').strip().lower())
    return {"success": True}

@app.route('/api/events/<event_id>', methods=['PUT'])
@require_role('admin', 'volunteer')
def update_event(event_id):
    events = load_events()
    updated_data = request.json or {}
    for i, e in enumerate(events):
        if str(e.get('id')) == str(event_id):
            updated_event, error = validate_event_payload(updated_data, existing=e)
            if error:
                return {"error": error}, 400
            import datetime
            updated_event['id'] = e.get('id', event_id)
            updated_event['createdBy'] = e.get('createdBy', '')
            updated_event['createdAt'] = e.get('createdAt')
            updated_event['updatedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            events[i] = updated_event
            save_events(events)
            _send_event_push(updated_event, 'updated', request.current_user.get('email', '').strip().lower())
            return {"success": True, "event": updated_event}
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
@token_required(optional=False)
def get_scholarships():
    return {"scholarships": load_scholarships()}

@app.route('/api/scholarships/seed', methods=['POST'])
@require_role('admin')
def seed_scholarships():
    save_scholarships(OFFICIAL_SEEDED_SCHOLARSHIPS)
    return {"success": True, "scholarships": OFFICIAL_SEEDED_SCHOLARSHIPS}

@app.route('/api/scholarships/auto-parse', methods=['POST'])
@require_role('admin')
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
        fetch_warning = ''
        
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
                fetch_warning = "The page could not be read; only details recognizable from the official URL were used."
        
        title = "New Scholarship Opportunity"
        provider = "Scholarship Provider"
        deadline = ""
        location = ""
        requirements = []
        description = ""
        benefits = ""
        official_domain = ""
        matched_id = None
        warnings = []
        if fetch_warning:
            warnings.append(fetch_warning)
        
        lower_text = extracted_text.lower()
        if "dost" in lower_text or "science and technology" in lower_text:
            matched_id = "dost-sei-undergrad"
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
            matched_id = "ched-merit-program"
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
            matched_id = "sm-college-scholarship"
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
            matched_id = "aboitiz-future-leaders"
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
            matched_id = "owwa-edsp-odsp"
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
            if lines and not apply_url:
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
                requirements = []

        matched_program = next((item for item in OFFICIAL_SEEDED_SCHOLARSHIPS if item.get('id') == matched_id), None)
        if matched_program:
            title = matched_program['title']
            provider = matched_program['provider']
            location = matched_program['location']
            requirements = list(matched_program['requirements'])
            description = matched_program.get('description', '')
            benefits = matched_program.get('benefits', '')
            official_domain = matched_program.get('officialDomain', '')
            deadline = matched_program.get('deadline', '')

        date_match = re.search(r'(?:deadline|due|until|closes on)[:\s]*([A-Za-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})', extracted_text, re.IGNORECASE)
        if date_match:
            try:
                from dateutil import parser
                parsed_date = parser.parse(date_match.group(1))
                deadline = parsed_date.strftime('%Y-%m-%d')
            except:
                deadline = date_match.group(1)
        if not deadline:
            warnings.append("No deadline was found; add it manually.")
        if not requirements:
            warnings.append("No document requirements were found; add them manually.")

        parsed_fields = {
            "title": title if title != "New Scholarship Opportunity" else "",
            "provider": provider if provider != "Scholarship Provider" else "",
            "location": location,
            "deadline": deadline,
            "applyLink": apply_url,
            "description": description,
            "benefits": benefits,
            "officialDomain": official_domain,
            "requirements": requirements,
        }
        if not parsed_fields["title"]:
            warnings.append("Program title needs review.")
        if not parsed_fields["provider"]:
            warnings.append("Provider needs review.")

        verified = False
        if apply_url and official_domain:
            parsed_host = (urllib.parse.urlparse(apply_url).hostname or '').lower()
            verified = parsed_host == official_domain or parsed_host.endswith(f'.{official_domain}')

        return {
            "success": True,
            "parsed": {
                "id": str(uuid.uuid4())[:8],
                **parsed_fields,
                "verified": verified,
            },
            "meta": {
                "fieldsDetected": [key for key, value in parsed_fields.items() if value],
                "warnings": warnings,
                "sourceType": "url" if apply_url else "text",
            },
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
@token_required()
def get_attendance():
    logs = load_json(ATTENDANCE_FILE)
    current_user = request.current_user or {}
    if current_user.get('role') == 'student':
        email = (current_user.get('email') or '').strip().lower()
        logs = [log for log in logs if (log.get('email') or '').strip().lower() == email]
    return {"attendance": logs}

@app.route('/api/attendance', methods=['POST'])
@require_role('admin', 'volunteer')
def add_attendance():
    logs = load_json(ATTENDANCE_FILE)
    new_log = request.json or {}

    email = new_log.get('email', '').strip().lower()
    event = new_log.get('event', '').strip()
    log_type = new_log.get('type', 'Time In')
    session = new_log.get('session', 'Morning')

    if not email or not event:
        return {"success": False, "error": "Email and event name are required."}, 400

    if log_type not in {'Time In', 'Time Out'}:
        return {"success": False, "error": "Attendance type must be Time In or Time Out."}, 400

    if session not in {'Morning', 'Afternoon'}:
        return {"success": False, "error": "Session must be Morning or Afternoon."}, 400

    users = load_json(USERS_FILE)
    if not any((user.get('email') or '').strip().lower() == email for user in users):
        return {"success": False, "error": "No registered account matches this QR code or email."}, 404

    duplicate = any(
        (log.get('email') or '').strip().lower() == email and
        log.get('event') == event and
        (log.get('session') or 'Morning') == session and
        log.get('type') == log_type
        for log in logs
    )
    if duplicate:
        return {"success": False, "error": f"{log_type} is already recorded for {event} ({session})."}, 409

    import datetime
    new_log['email'] = email
    new_log['event'] = event
    new_log['type'] = log_type
    new_log['session'] = session
    new_log['timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat()

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
@require_role('admin', 'volunteer')
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
@token_required(optional=False)
def add_comment(announcement_id):
    caller = request.current_user or {}
    announcements = load_json(ANNOUNCEMENTS_FILE)
    comment = request.json or {}
    raw_content = comment.get('content') or comment.get('text') or ''
    content = sanitize_text(str(raw_content)).strip()
    if not content:
        return jsonify({"error": "Comment content cannot be empty."}), 400
    import datetime
    import uuid
    author_name = caller.get('name') or comment.get('author') or 'SHORE User'
    author_email = (caller.get('email') or comment.get('authorEmail') or '').strip().lower()
    new_comment = {
        'id': str(uuid.uuid4()),
        'timestamp': datetime.datetime.now().isoformat(),
        'text': content,
        'author': author_name,
        'authorEmail': author_email
    }
    for a in announcements:
        if str(a.get('id')) == str(announcement_id):
            if 'comments' not in a:
                a['comments'] = []
            a['comments'].append(new_comment)
            a['read_by'] = [author_email] if author_email else []
            save_json(ANNOUNCEMENTS_FILE, announcements)
            return jsonify({"success": True, "comment": new_comment})
    return jsonify({"error": "Announcement not found"}), 404

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
@token_required(optional=False)
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
@token_required(optional=False)
def get_tickets():
    caller = request.current_user or {}
    caller_role = caller.get('role', 'student')
    caller_email = (caller.get('email') or '').strip().lower()
    all_tickets = load_json(TICKETS_FILE) or []
    if caller_role in ('admin', 'volunteer'):
        return {"tickets": all_tickets}
    # Tenant privacy: students only retrieve tickets they submitted
    my_tickets = [t for t in all_tickets if (t.get('createdBy') or t.get('authorEmail') or '').strip().lower() == caller_email]
    return {"tickets": my_tickets}

@app.route('/api/tickets', methods=['POST'])
@token_required(optional=False)
def add_ticket():
    try:
        caller = request.current_user or {}
        tickets = load_json(TICKETS_FILE) or []
        data = request.json or {}
        raw_title = sanitize_text(str(data.get('title') or ''), max_length=200).strip()
        raw_desc = sanitize_text(str(data.get('description') or ''), max_length=5000).strip()
        raw_cat = sanitize_text(str(data.get('category') or 'Bug'), max_length=50).strip()
        if not raw_title:
            return jsonify({"error": "Ticket title is required."}), 400
        if not raw_desc:
            return jsonify({"error": "Ticket description is required."}), 400

        import uuid
        import datetime
        creator_email = (caller.get('email') or data.get('createdBy') or data.get('authorEmail') or '').strip().lower()
        creator_name = caller.get('name') or data.get('authorName') or 'SHORE User'
        ticket_record = {
            'id': str(uuid.uuid4()),
            'title': raw_title,
            'description': raw_desc,
            'category': raw_cat,
            'createdBy': creator_email,
            'authorEmail': creator_email,
            'authorName': creator_name,
            'timestamp': datetime.datetime.now().isoformat(),
            'status': 'open',
            'reply': ''
        }
        tickets.append(ticket_record)
        save_json(TICKETS_FILE, tickets)
        return jsonify({"success": True, "ticket": ticket_record}), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/tickets/<ticket_id>', methods=['PUT'])
@require_role('admin', 'volunteer')
def resolve_ticket(ticket_id):
    tickets = load_json(TICKETS_FILE) or []
    data = request.json or {}
    reply_msg = sanitize_text(str(data.get('reply') or ''), max_length=5000).strip()
    found = False
    for t in tickets:
        if str(t.get('id')) == str(ticket_id):
            t['status'] = 'resolved'
            t['reply'] = reply_msg
            found = True
            break
    if not found:
        return jsonify({"error": "Ticket not found."}), 404
    save_json(TICKETS_FILE, tickets)
    return jsonify({"success": True})

@app.route('/api/tickets/<ticket_id>', methods=['DELETE'])
@token_required(optional=False)
def delete_ticket(ticket_id):
    caller = request.current_user or {}
    caller_email = (caller.get('email') or '').strip().lower()
    caller_role = caller.get('role', 'student')
    tickets = load_json(TICKETS_FILE) or []
    target = next((t for t in tickets if str(t.get('id')) == str(ticket_id)), None)
    if not target:
        return jsonify({"error": "Ticket not found."}), 404
    creator = (target.get('createdBy') or target.get('authorEmail') or '').strip().lower()
    if caller_role not in ('admin', 'volunteer') and creator != caller_email:
        return jsonify({"error": "Forbidden. Only administrators or the ticket author can delete this ticket."}), 403
    new_tickets = [t for t in tickets if str(t.get('id')) != str(ticket_id)]
    save_json(TICKETS_FILE, new_tickets)
    return jsonify({"success": True})

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
@token_required(optional=False)
def get_purchases():
    caller = request.current_user or {}
    caller_role = caller.get('role', 'student')
    caller_email = (caller.get('email') or '').strip().lower()
    purchases = load_json(PURCHASES_FILE) or []
    if caller_role == 'admin':
        return {"purchases": purchases}
    # Students only retrieve their own purchase records
    return {"purchases": [p for p in purchases if (p.get('studentEmail') or '').strip().lower() == caller_email]}

@app.route('/api/purchases/<purchase_id>', methods=['DELETE'])
@require_role('admin')
def delete_purchase(purchase_id):
    purchases = load_json(PURCHASES_FILE) or []
    new_purchases = [p for p in purchases if str(p.get('id')) != str(purchase_id)]
    save_json(PURCHASES_FILE, new_purchases)
    return {"success": True}

@app.route('/api/inventory/purchase', methods=['POST'])
@token_required(optional=False)
def purchase_item():
    try:
        caller = request.current_user or {}
        caller_role = caller.get('role', 'student')
        caller_email = (caller.get('email') or '').strip().lower()

        data = request.json or {}
        user_email = (data.get('userEmail') or caller_email).strip().lower()
        item_id = data.get('itemId')

        # BOLA Defense: students cannot initiate purchases for another user
        if caller_role != 'admin' and user_email != caller_email:
            return jsonify({"error": "Forbidden. You cannot execute purchases on behalf of another user."}), 403
        
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
        safe_user = sanitize_user_record(user) if user else None
        
        return {"success": True, "purchase": new_purchase, "user": safe_user}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500

@app.route('/api/inventory/equip', methods=['POST'])
@token_required(optional=False)
def equip_border():
    try:
        caller = request.current_user or {}
        caller_role = caller.get('role', 'student')
        caller_email = (caller.get('email') or '').strip().lower()

        data = request.json or {}
        user_email = (data.get('userEmail') or caller_email).strip().lower()
        border_id = data.get('borderId')

        # BOLA Defense: cannot modify another account's equipped cosmetics
        if caller_role != 'admin' and user_email != caller_email:
            return jsonify({"error": "Forbidden. You cannot equip borders on behalf of another user."}), 403
        
        users = load_json(USERS_FILE)
        user = next((u for u in users if (u.get('email') or '').strip().lower() == user_email), None)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Ownership validation: confirm cosmetic is in ownedBorders or unequipped (None)
        if border_id is not None:
            owned = user.get('ownedBorders', [])
            if caller_role != 'admin' and border_id not in owned:
                return jsonify({"error": "Forbidden. You do not own this avatar border."}), 403
            
        user['equippedBorder'] = border_id
        save_json(USERS_FILE, users)
        
        safe_user = sanitize_user_record(user)
        return jsonify({"success": True, "user": safe_user})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-pdf', methods=['POST'])
@token_required(optional=False)
def handle_generate_pdf():
    try:
        caller = request.current_user or {}
        caller_role = caller.get('role', 'student')
        caller_name = (caller.get('name') or '').strip().lower()

        student_name = request.form.get('student_name')
        if not student_name:
            student_name = request.json.get('student_name') if request.is_json else None

        # BOLA Defense: Students can only generate diagnostic PDFs for their own record
        if caller_role == 'student' and student_name:
            if student_name.strip().lower() != caller_name:
                return jsonify({"error": "Forbidden. Students can only generate their own diagnostic report."}), 403
        
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
