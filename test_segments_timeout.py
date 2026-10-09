import urllib.request
try:
    req = urllib.request.Request("http://127.0.0.1:8000/api/segments")
    response = urllib.request.urlopen(req, timeout=5)
    print("STATUS:", response.status)
    print("DATA LENGTH:", len(response.read()))
except Exception as e:
    print("Error:", e)
