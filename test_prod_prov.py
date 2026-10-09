import urllib.request
try:
    req = urllib.request.Request("https://edunex-nbe5.onrender.com/api/data/provenance")
    response = urllib.request.urlopen(req)
    print("STATUS:", response.status)
    print(response.read().decode())
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
