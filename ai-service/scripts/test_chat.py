import json
import urllib.request

url = "http://localhost:8000/api/ml/chat"
payload = {
    "userId": "test-user-123",
    "message": "Hi, how can I improve my credit score and what loan can I afford?",
    "profile": {
        "name": "Abhishek",
        "creditScore": 765,
        "riskCategory": "LOW",
        "hasActiveLoan": True,
        "activeLoanAmount": 15000
    }
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("🤖 AI Chatbot Response:")
        print(res["reply"])
except Exception as e:
    print("Error:", e)
