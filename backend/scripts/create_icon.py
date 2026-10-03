import sys
import subprocess

try:
    from PIL import Image
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image

input_path = r"C:\Users\Alan Serios\.gemini\antigravity\brain\172d1d6e-2bbe-4375-86d6-ae15851e0f6a\media__1783126680167.jpg"
output_path = r"C:\Users\Alan Serios\Downloads\SHORE_Web_App\app_icon.ico"

img = Image.open(input_path)
# Resize to a square if necessary, but sizes=[(256,256)] handles it.
img.save(output_path, format='ICO', sizes=[(256, 256)])
print("Icon created successfully at:", output_path)
