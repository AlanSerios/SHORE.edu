
import server
attendance = [
    {'email': 'joserizal@shoreskwela.com', 'name': 'Jose Rizal', 'type': 'Time In', 'timestamp': '2026-07-05T10:00:00Z'},
    {'email': 'joserizal@shoreskwela.com', 'name': 'Jose Rizal', 'type': 'Time In', 'timestamp': '2026-07-04T10:00:00Z'},
    {'email': 'joserizal@shoreskwela.com', 'name': 'Jose Rizal', 'type': 'Time In', 'timestamp': '2026-07-03T10:00:00Z'},
    {'email': 'joserizal@shoreskwela.com', 'name': 'Jose Rizal', 'type': 'Time In', 'timestamp': '2026-07-02T10:00:00Z'}
]
server.save_json('attendance', attendance)
print('Attendance seeded successfully.')

