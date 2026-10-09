import urllib.request
import re

req = urllib.request.Request("https://edunex-nbe5.onrender.com")
html = urllib.request.urlopen(req).read().decode()

js_file = re.search(r'src="(/assets/index-[^"]+\.js)"', html)
if js_file:
    js_url = "https://edunex-nbe5.onrender.com" + js_file.group(1)
    js = urllib.request.urlopen(js_url).read().decode()
    urls = re.findall(r'https://[a-zA-Z0-9-]+\.onrender\.com', js)
    print("Found URLs in JS:", set(urls))
