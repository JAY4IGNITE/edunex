import urllib.request
import json
try:
    req = urllib.request.Request("http://127.0.0.1:8000/api/segments")
    response = urllib.request.urlopen(req)
    print("STATUS:", response.status)
    print(response.read().decode())
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
