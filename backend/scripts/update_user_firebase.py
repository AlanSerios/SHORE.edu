import server
users = server.load_json('users')
for u in users:
    if u.get('email') == 'alan@shoreskwela.com':
        u['ownedBorders'] = ['border_fire', 'border_cyber', 'border_gold']
server.save_json('users', users)
print('Success')
