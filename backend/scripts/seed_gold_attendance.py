
import server
import datetime

base_date = datetime.datetime(2026, 7, 5, 10, 0, 0, tzinfo=datetime.timezone.utc)
attendance = []

for i in range(12): # let's do 12 just to be safe
    d = base_date - datetime.timedelta(days=i)
    attendance.append({
        'email': 'joserizal@shoreskwela.com',
        'name': 'Jose Rizal',
        'type': 'Time In',
        'timestamp': d.isoformat().replace('+00:00', 'Z')
    })

server.save_json('attendance', attendance)
print('Seeded gold streak attendance successfully.')

