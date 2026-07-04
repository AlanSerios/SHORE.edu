import json
import os
import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase
cred = credentials.Certificate('firebase_key.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://shore-edu-db-default-rtdb.asia-southeast1.firebasedatabase.app/'
})

COLLECTIONS = {
    'users': '.data/users.json',
    'students': '.data/students.json',
    'volunteers': '.data/volunteers.json',
    'events': '.data/events.json',
    'attendance': '.data/attendance.json',
    'announcements': '.data/announcements.json',
    'recitations': '.data/recitations.json',
    'scholarships': '.data/scholarships.json'
}

def migrate():
    for collection_name, file_path in COLLECTIONS.items():
        if os.path.exists(file_path):
            print(f"Migrating {collection_name}...")
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)
                
            # Firebase Realtime Database can just take the raw list or dict!
            ref = db.reference(collection_name)
            ref.set(data)
            print(f"Done {collection_name}.")
        else:
            print(f"File {file_path} not found. Skipping.")

if __name__ == '__main__':
    migrate()
