import requests

url = "http://127.0.0.1:8000/predict/"
files = [
    ("files", ("T_0000000000.flac", open("T_0000000000.flac", "rb"), "audio/flac")),
    ("files", ("T_0000000001.flac", open("T_0000000001.flac", "rb"), "audio/flac")),
]
response = requests.post(url, files=files)
print(response.json())
