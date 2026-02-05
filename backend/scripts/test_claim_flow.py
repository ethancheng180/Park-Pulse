
import requests
import sys

BASE_URL = "http://localhost:8000"
EMAIL = "driver@test.com"
PASSWORD = "password123"

def login():
    print(f"Logging in as {EMAIL}...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        sys.exit(1)
    return resp.json()["access_token"]

def get_available_spots(token):
    print("Fetching available spots...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/spots/available", headers=headers)
    if resp.status_code != 200:
        print(f"Failed to get spots: {resp.text}")
        sys.exit(1)
    spots = resp.json()
    print(f"Found {len(spots)} spots.")
    return spots

def claim_spot(token, spot_id):
    print(f"Claiming spot {spot_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/spots/{spot_id}/claim", headers=headers)
    if resp.status_code == 200:
        print("✅ Claim successful!")
        return resp.json()
    else:
        print(f"❌ Claim failed: {resp.text}")
        return None

def release_spot(token, spot_id):
    print(f"Releasing spot {spot_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/spots/{spot_id}/release", headers=headers)
    if resp.status_code == 200:
        print("✅ Release successful!")
        return resp.json()
    else:
        print(f"❌ Release failed: {resp.text}")
        return None

def mark_taken(token, spot_id):
    print(f"Marking spot {spot_id} as taken...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/spots/{spot_id}/take", headers=headers)
    if resp.status_code == 200:
        print("✅ Mark taken successful!")
        return resp.json()
    else:
        print(f"❌ Mark taken failed: {resp.text}")
        return None

def main():
    try:
        # 1. Login
        token = login()
        
        # 2. Get a spot
        spots = get_available_spots(token)
        if not spots:
            print("No spots available to test.")
            sys.exit(0)
            
        spot = spots[0]
        spot_id = spot["id"]
        
        # 3. Claim/Release Cycle
        print("\n--- Test 1: Claim & Release ---")
        claimed = claim_spot(token, spot_id)
        if claimed:
            # Verify status
            if claimed['status'] != 'claimed':
                print(f"❌ Unexpected status: {claimed['status']}")
            
            # Release
            released = release_spot(token, spot_id)
            if released['status'] != 'available':
                print(f"❌ Unexpected status after release: {released['status']}")

        # 4. Claim/Take Cycle
        print("\n--- Test 2: Claim & Mark Taken ---")
        claimed_2 = claim_spot(token, spot_id)
        if claimed_2:
            taken = mark_taken(token, spot_id)
            if taken['status'] != 'taken':
                print(f"❌ Unexpected status after take: {taken['status']}")
                
            # Cleanup: Delete logic or reset? 
            # We can't easily reset via API unless we're owner.
            # But the seed script resets everything anyway.
            
        print("\n✅ Verification Complete!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Is it running?")

if __name__ == "__main__":
    main()
