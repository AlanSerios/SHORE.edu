import os
import io
from flask import Flask, request, send_file
from pdf_generator import generate_pdf_bytes

import json

# Serve from frontend/dist
app = Flask(__name__, static_folder='frontend/dist', static_url_path='')

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

def load_json(collection_name):
    try:
        ref = db.reference(collection_name)
        data = ref.get()
        if data is None:
            return []
        if isinstance(data, dict):
            # Firebase sometimes converts lists to dicts if keys aren't sequential 0,1,2...
            # But the app expects a list.
            return [v for k, v in data.items() if v is not None]
        # Filter out None values that might appear in lists
        if isinstance(data, list):
            return [v for v in data if v is not None]
        return data
    except Exception as e:
        print("Firebase Load Error:", e)
        return []

def load_dict(collection_name):
    try:
        ref = db.reference(collection_name)
        data = ref.get()
        if data is None:
            return {}
        return data
    except Exception as e:
        print("Firebase Load Error:", e)
        return {}

def save_json(collection_name, data):
    try:
        ref = db.reference(collection_name)
        ref.set(data)
    except Exception as e:
        print("Firebase Save Error:", e)

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
    creds = request.json
    users = load_json(USERS_FILE)
    for user in users:
        if user.get('email') == creds.get('email') and user.get('password') == creds.get('password'):
            safe_user = {k: v for k, v in user.items() if k != 'password'}
            return {"success": True, "user": safe_user}
    return {"error": "Invalid credentials."}, 401

@app.route('/api/users', methods=['GET'])
def get_all_users():
    users = load_json(USERS_FILE)
    # We can return passwords too so the admin can see/edit them, per user preference.
    return {"users": users}

@app.route('/api/users/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    users = load_json(USERS_FILE)
    for user in users:
        if user.get('email') == data.get('email'):
            if user.get('pin') and user.get('pin') == data.get('pin'):
                user['password'] = data.get('new_password')
                save_json(USERS_FILE, users)
                return {"success": True}
            return {"error": "Invalid PIN."}, 400
    return {"error": "Account not found."}, 404

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
    return {"error": "User not found."}, 404

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
    return {"students": load_json(STUDENTS_FILE)}

@app.route('/api/allowed_students', methods=['POST'])
def update_allowed_students():
    new_students = request.json.get('students', [])
    save_json(STUDENTS_FILE, new_students)
    return {"success": True}

@app.route('/api/allowed_volunteers', methods=['GET'])
def get_allowed_volunteers():
    return {"volunteers": load_json(VOLUNTEERS_FILE)}

@app.route('/api/allowed_volunteers', methods=['POST'])
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
    return data

@app.route('/api/tracker_data', methods=['POST'])
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
def add_event():
    events = load_events()
    new_event = request.json
    events.append(new_event)
    save_events(events)
    return {"success": True, "event": new_event}

@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    events = load_events()
    events = [e for e in events if e.get('id') != event_id]
    save_events(events)
    return {"success": True}

@app.route('/api/events/<event_id>', methods=['PUT'])
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

def load_scholarships():
    return load_json(SCHOLARSHIPS_FILE)

def save_scholarships(data):
    save_json(SCHOLARSHIPS_FILE, data)

@app.route('/api/scholarships', methods=['GET'])
def get_scholarships():
    return {"scholarships": load_scholarships()}

@app.route('/api/scholarships', methods=['POST'])
def add_scholarship():
    items = load_scholarships()
    new_item = request.json
    items.append(new_item)
    save_scholarships(items)
    return {"success": True, "scholarship": new_item}

@app.route('/api/scholarships/<item_id>', methods=['DELETE'])
def delete_scholarship(item_id):
    items = load_scholarships()
    items = [item for item in items if item.get('id') != item_id]
    save_scholarships(items)
    return {"success": True}

@app.route('/api/scholarships/<item_id>', methods=['PUT'])
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
    new_log = request.json
    # new_log should have: email, event, type (Time In / Time Out), timestamp

    email = new_log.get('email', '')
    event = new_log.get('event', '')
    log_type = new_log.get('type', 'Time In')
    session = new_log.get('session')  # 'Morning' | 'Afternoon' | None (legacy)

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
def delete_announcement(announcement_id):
    announcements = load_json(ANNOUNCEMENTS_FILE)
    new_announcements = [a for a in announcements if a.get('id') != announcement_id]
    if len(announcements) == len(new_announcements):
        return {"error": "Announcement not found"}, 404
    save_json(ANNOUNCEMENTS_FILE, new_announcements)
    return {"success": True}

@app.route('/api/announcements/<announcement_id>/comments', methods=['POST'])
def add_comment(announcement_id):
    announcements = load_json(ANNOUNCEMENTS_FILE)
    comment = request.json
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
def add_recitation():
    recitations = load_json(RECITATIONS_FILE)
    new_rec = request.json
    import uuid
    import datetime
    new_rec['id'] = str(uuid.uuid4())
    if not new_rec.get('timestamp'):
        new_rec['timestamp'] = datetime.datetime.now().isoformat()
    recitations.append(new_rec)
    save_json(RECITATIONS_FILE, recitations)
    return {"success": True, "recitation": new_rec}

@app.route('/api/recitations/<rec_id>', methods=['DELETE'])
def delete_recitation(rec_id):
    recitations = load_json(RECITATIONS_FILE)
    new_recs = [r for r in recitations if r.get('id') != rec_id]
    save_json(RECITATIONS_FILE, new_recs)
    return {"success": True}

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
        
        safe_name = student_name.replace(" ", "_")
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
