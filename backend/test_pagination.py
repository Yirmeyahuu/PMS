import requests

url = "http://127.0.0.1:8000/api/communication-logs/?patient=17&page=2&page_size=10"
try:
    response = requests.get(url)
    print(f"Status: {response.status_code}")
except Exception as e:
    print(e)
