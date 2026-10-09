import urllib.request
response = urllib.request.urlopen("http://127.0.0.1:8080/api/analytics/overview?department=Computer%20Science")
print(response.read().decode())
