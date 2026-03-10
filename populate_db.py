import requests
import os

# Define the file path and endpoint
file_path = r"C:\Users\casel\OneDrive\Desktop\pollution webapp\Backend\Data\test.csv"
url = "http://127.0.0.1:8000/upload_file"

# Check if file exists
if not os.path.exists(file_path):
    print(f"Error: File not found at {file_path}")
    exit(1)

# Upload the file
try:
    with open(file_path, "rb") as f:
        files = {"file": ("test.csv", f, "text/csv")}
        response = requests.post(url, files=files)
    
    if response.status_code == 200:
        print("Success! Data uploaded.")
        print(response.json())
    else:
        print(f"Failed to upload. Status Code: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"An error occurred: {e}")
