import server, datetime, uuid
att = server.load_json('attendance')
# remove all of rizal's attendance
att = [a for a in att if a.get('email') != 'joserizal@shoreskwela.com']

events = ["Onboarding", "Session 1", "Session 2", "Session 3", "Session 4", "Session 5", "Session 6", "Session 7", "Session 8", "Graduation", "Extra Event 1", "Extra Event 2"]
base_date = datetime.datetime.utcnow() - datetime.timedelta(days=12)

for i in range(12):
    att.append({
        'id': str(uuid.uuid4()),
        'email': 'joserizal@shoreskwela.com',
        'name': 'Jose Rizal',
        'event': events[i],
        'session': 'Morning',
        'type': 'Time In',
        'timestamp': (base_date + datetime.timedelta(days=i)).isoformat() + "Z"
    })

server.save_json('attendance', att)
print("Added 12 attendance records for Rizal")
