import requests
import json

BASE_URL = 'http://localhost:8000/api'

def test_registration():
    """Test user registration"""
    url = f'{BASE_URL}/auth/register/'
    data = {
        'email': 'test@example.com',
        'first_name': 'Test',
        'last_name': 'User',
        'password': 'SecurePass123!',
        'password_confirm': 'SecurePass123!',
        'role': 'STAFF'
    }
    response = requests.post(url, json=data)
    print(f"Registration: {response.status_code}")
    if response.status_code == 201:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.json()
    else:
        print(f"Error: {response.text}")
    return None

def test_login(email, password):
    """Test user login"""
    url = f'{BASE_URL}/auth/login/'
    data = {
        'email': email,
        'password': password
    }
    response = requests.post(url, json=data)
    print(f"\nLogin: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Access Token: {result['tokens']['access'][:50]}...")
        return result['tokens']['access']
    else:
        print(f"Error: {response.text}")
    return None

def test_get_users(token):
    """Test getting users list"""
    url = f'{BASE_URL}/users/'
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(url, headers=headers)
    print(f"\nGet Users: {response.status_code}")
    if response.status_code == 200:
        print(f"Users count: {len(response.json()['results'])}")
    else:
        print(f"Error: {response.text}")

def test_create_clinic(token):
    """Test creating a clinic"""
    url = f'{BASE_URL}/clinics/'
    headers = {'Authorization': f'Bearer {token}'}
    data = {
        'name': 'Test Clinic',
        'email': 'clinic@example.com',
        'phone': '1234567890',
        'address': '123 Main St',
        'city': 'Manila',
        'province': 'Metro Manila',
        'postal_code': '1000',
        'subscription_plan': 'TRIAL'
    }
    response = requests.post(url, json=data, headers=headers)
    print(f"\nCreate Clinic: {response.status_code}")
    if response.status_code == 201:
        print(f"Clinic created: {response.json()['name']}")
        return response.json()
    else:
        print(f"Error: {response.text}")
    return None

def test_create_patient(token, clinic_id):
    """Test creating a patient"""
    url = f'{BASE_URL}/patients/'
    headers = {'Authorization': f'Bearer {token}'}
    data = {
        'clinic': clinic_id,
        'first_name': 'John',
        'last_name': 'Doe',
        'middle_name': 'M',
        'date_of_birth': '1990-01-01',
        'gender': 'M',
        'phone': '9876543210',
        'address': '456 Oak St',
        'city': 'Quezon City',
        'province': 'Metro Manila',
        'emergency_contact_name': 'Jane Doe',
        'emergency_contact_phone': '9876543211',
        'emergency_contact_relationship': 'Spouse'
    }
    response = requests.post(url, json=data, headers=headers)
    print(f"\nCreate Patient: {response.status_code}")
    if response.status_code == 201:
        result = response.json()
        print(f"Patient created: {result['full_name']} - {result['patient_number']}")
        return result
    else:
        print(f"Error: {response.text}")
    return None

if __name__ == '__main__':
    print("=== Testing PMS API ===\n")
    
    # Test registration
    # registration_result = test_registration()
    
    # Test login with superuser
    print("Login with superuser credentials:")
    email = input("Enter email: ")
    password = input("Enter password: ")
    
    token = test_login(email, password)
    
    if token:
        # Test getting users
        test_get_users(token)
        
        # Test creating clinic
        clinic = test_create_clinic(token)
        
        if clinic:
            # Test creating patient
            test_create_patient(token, clinic['id'])
    
    print("\n=== Testing Complete ===")