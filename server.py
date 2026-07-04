import os
import io
from flask import Flask, request, send_file
from pdf_generator import generate_pdf_bytes

import json

# Serve from frontend/dist
app = Flask(__name__, static_folder='frontend/dist', static_url_path='')

EVENTS_FILE = 'events.json'
USERS_FILE = 'users.json'
STUDENTS_FILE = 'students.json'
VOLUNTEERS_FILE = 'volunteers.json'
ATTENDANCE_FILE = 'attendance.json'
ANNOUNCEMENTS_FILE = 'announcements.json'
RECITATIONS_FILE = 'recitations.json'

def load_json(filepath):
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except:
        return []

def save_json(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f)

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

SCHOLARSHIPS_FILE = 'scholarships.json'

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
    return {"announcements": load_json(ANNOUNCEMENTS_FILE)}

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
            a['comments'].append(comment)
            save_json(ANNOUNCEMENTS_FILE, announcements)
            return {"success": True, "comment": comment}
    return {"error": "Announcement not found"}, 404

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

@app.route('/generate-pdf', methods=['POST'])
def handle_generate_pdf():
    try:
        student_name = request.form.get('student_name')
        report_type = request.form.get('report_type', 'both')
        
        if 'excel_file' not in request.files:
            return {"error": "No Excel file uploaded"}, 400
            
        excel_file = request.files['excel_file']
        excel_bytes = excel_file.read()
        
        pdf_bytes = generate_pdf_bytes(excel_bytes, student_name, report_type)
        
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
