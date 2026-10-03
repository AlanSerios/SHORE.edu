import server
att = server.load_json('attendance')
# remove all of rizal's attendance
att = [a for a in att if a.get('email') != 'joserizal@shoreskwela.com']
server.save_json('attendance', att)
print("Removed all attendance records for Rizal")
