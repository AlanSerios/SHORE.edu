
import server
users = server.load_json('users')
alan = next((u for u in users if u['email'] == 'alan@shoreskwela.com'), None)
rizal = next((u for u in users if 'rizal' in str(u.get('name', '')).lower() or 'rizal' in str(u.get('email', '')).lower()), None)
if alan: alan['streak'] = 0
if rizal: rizal['streak'] = 4
server.save_json('users', users)
if rizal: print('Updated: Alan streak=', alan['streak'], ' | Rizal (', rizal['name'], ') streak=', rizal['streak'])
else: print('Rizal not found')

