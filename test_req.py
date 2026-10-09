import urllib.request
response = urllib.request.urlopen("http://127.0.0.1:8080/api/data/departments")
print(response.read().decode())
