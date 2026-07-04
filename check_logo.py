import io, os

def rd(f): return io.open(f, encoding='utf-8').read()

app = rd('frontend/src/App.jsx')

checks = [
    ('shore_logo.png img tag present', '/shore_logo.png' in app),
    ('full-logo key present', 'full-logo' in app),
    ('icon-logo key present', 'icon-logo' in app),
    ('Old S text box gone', 'bg-primary rounded-md flex items-center' not in app),
    ('Logo file in public/', os.path.exists('frontend/public/shore_logo.png')),
    ('Logo file in dist/', os.path.exists('frontend/dist/shore_logo.png')),
    ('Logo file size > 10KB', os.path.getsize('frontend/public/shore_logo.png') > 10000),
]

all_ok = True
for label, ok in checks:
    print(('OK  ' if ok else 'FAIL') + '  ' + label)
    if not ok:
        all_ok = False

print()
print('All checks passed!' if all_ok else 'ISSUES FOUND - needs fixing!')
