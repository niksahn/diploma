import requests
import time

timestamp = int(time.time())

# Регистрация обычного пользователя
user_data = {
    "login": f"user{timestamp}@example.com",
    "password": "UserPassword123",
    "surname": "Test",
    "name": "User"
}

print("Registering user...")
register_response = requests.post('http://localhost:8081/api/v1/auth/register', json=user_data)
print('Register status:', register_response.status_code)
print('Register response:', register_response.text)

# Логин обычного пользователя через Kong
print("\nLogging in user...")
login_response = requests.post('http://localhost:8080/api/v1/auth/login', json=user_data)
print('Login status:', login_response.status_code)
print('Login response:', login_response.text)

if login_response.status_code == 200:
    data = login_response.json()
    print('Access token:', data.get('access_token', 'NOT FOUND'))
    print('User:', data.get('user', 'NOT FOUND'))
    print('Full response keys:', list(data.keys()) if isinstance(data, dict) else 'NOT DICT')
