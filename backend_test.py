#!/usr/bin/env python3
"""
Backend API tests for EchoClash monetization features
Tests ONLY the NEW monetization endpoints, not existing pitch/LLM/Deepgram endpoints
"""

import requests
import json
import sys

# Base URL from .env NEXT_PUBLIC_BASE_URL
BASE_URL = "https://founder-marketplace-2.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def log_test(name, passed, details=""):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"].append(name)
        print(f"✅ PASS: {name}")
        if details:
            print(f"   {details}")
    else:
        test_results["failed"].append(name)
        print(f"❌ FAIL: {name}")
        if details:
            print(f"   {details}")

def test_auth_login():
    """Test 1: POST /api/auth/login - tiered accounts"""
    print("\n" + "="*80)
    print("TEST 1: Auth tiered login (free + pro)")
    print("="*80)
    
    phoenix_id = None
    
    # Test 1a: Free tier user (phoenix)
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "phoenix123@gmail.com",
            "password": "phoenix123"
        })
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("email") == "phoenix123@gmail.com" and 
                data.get("tier") == "free" and 
                data.get("pitch_limit") == 1 and
                "id" in data and "name" in data):
                log_test("Auth login - free tier (phoenix)", True, 
                        f"User: {data.get('name')}, tier: {data.get('tier')}, limit: {data.get('pitch_limit')}")
                phoenix_id = data.get("id")  # Save user_id for later tests
            else:
                log_test("Auth login - free tier (phoenix)", False, 
                        f"Unexpected response data: {data}")
        else:
            log_test("Auth login - free tier (phoenix)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Auth login - free tier (phoenix)", False, f"Exception: {str(e)}")
    
    # Test 1b: Pro tier user
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        
        if response.status_code == 200:
            data = response.json()
            # pitch_limit can be 5 (default pro) or 999 (if upgraded to unlimited)
            if (data.get("email") == "test@example.com" and 
                data.get("tier") == "pro" and 
                data.get("pitch_limit") in [5, 999]):
                log_test("Auth login - pro tier (test)", True, 
                        f"User: {data.get('name')}, tier: {data.get('tier')}, limit: {data.get('pitch_limit')}")
            else:
                log_test("Auth login - pro tier (test)", False, 
                        f"Unexpected response data: {data}")
        else:
            log_test("Auth login - pro tier (test)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Auth login - pro tier (test)", False, f"Exception: {str(e)}")
    
    # Test 1c: Wrong password
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "phoenix123@gmail.com",
            "password": "wrongpassword"
        })
        
        if response.status_code == 401:
            log_test("Auth login - wrong password returns 401", True, 
                    f"Correctly rejected with 401")
        else:
            log_test("Auth login - wrong password returns 401", False, 
                    f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("Auth login - wrong password returns 401", False, f"Exception: {str(e)}")
    
    return phoenix_id

def test_usage(phoenix_id, pro_id):
    """Test 2: GET /api/usage - usage tracking"""
    print("\n" + "="*80)
    print("TEST 2: Subscription usage tracking")
    print("="*80)
    
    # Test 2a: Free user usage
    try:
        response = requests.get(f"{BASE_URL}/usage", params={"user_id": phoenix_id})
        
        if response.status_code == 200:
            data = response.json()
            if ("tier" in data and "limit" in data and "used" in data and 
                "remaining" in data and "can_pitch" in data):
                log_test("Usage - free user (phoenix)", True, 
                        f"tier={data.get('tier')}, limit={data.get('limit')}, used={data.get('used')}, remaining={data.get('remaining')}, can_pitch={data.get('can_pitch')}")
            else:
                log_test("Usage - free user (phoenix)", False, 
                        f"Missing required fields: {data}")
        else:
            log_test("Usage - free user (phoenix)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Usage - free user (phoenix)", False, f"Exception: {str(e)}")
    
    # Test 2b: Pro user usage
    try:
        response = requests.get(f"{BASE_URL}/usage", params={"user_id": pro_id})
        
        if response.status_code == 200:
            data = response.json()
            if ("tier" in data and "limit" in data and "used" in data and 
                "remaining" in data and "can_pitch" in data):
                log_test("Usage - pro user (test)", True, 
                        f"tier={data.get('tier')}, limit={data.get('limit')}, used={data.get('used')}, remaining={data.get('remaining')}, can_pitch={data.get('can_pitch')}")
            else:
                log_test("Usage - pro user (test)", False, 
                        f"Missing required fields: {data}")
        else:
            log_test("Usage - pro user (test)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Usage - pro user (test)", False, f"Exception: {str(e)}")

def test_subscription_upgrade(pro_id):
    """Test 3: POST /api/subscription/upgrade"""
    print("\n" + "="*80)
    print("TEST 3: Subscription upgrade")
    print("="*80)
    
    # Test 3a: Upgrade to pro (pitch_limit 5)
    try:
        response = requests.post(f"{BASE_URL}/subscription/upgrade", json={
            "user_id": pro_id,
            "plan": "pro"
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("tier") == "pro" and data.get("pitch_limit") == 5:
                log_test("Subscription upgrade - pro plan", True, 
                        f"tier={data.get('tier')}, pitch_limit={data.get('pitch_limit')}")
            else:
                log_test("Subscription upgrade - pro plan", False, 
                        f"Unexpected data: {data}")
        else:
            log_test("Subscription upgrade - pro plan", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Subscription upgrade - pro plan", False, f"Exception: {str(e)}")
    
    # Test 3b: Upgrade to unlimited (pitch_limit 999)
    try:
        response = requests.post(f"{BASE_URL}/subscription/upgrade", json={
            "user_id": pro_id,
            "plan": "unlimited"
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("tier") == "pro" and data.get("pitch_limit") == 999:
                log_test("Subscription upgrade - unlimited plan", True, 
                        f"tier={data.get('tier')}, pitch_limit={data.get('pitch_limit')}")
            else:
                log_test("Subscription upgrade - unlimited plan", False, 
                        f"Unexpected data: {data}")
        else:
            log_test("Subscription upgrade - unlimited plan", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Subscription upgrade - unlimited plan", False, f"Exception: {str(e)}")

def test_pitch_limit_gate(phoenix_id, pro_id):
    """Test 4: POST /api/sessions - pitch limit gate"""
    print("\n" + "="*80)
    print("TEST 4: Pitch limit gate on POST /api/sessions")
    print("="*80)
    
    # First, create a startup for phoenix user
    startup_id = None
    try:
        response = requests.post(f"{BASE_URL}/startups", json={
            "user_id": phoenix_id,
            "name": "GateTest Startup"
        })
        
        if response.status_code == 200:
            data = response.json()
            startup_id = data.get("id")
            print(f"   Created startup: {startup_id}")
        else:
            print(f"   Failed to create startup: {response.status_code}")
            log_test("Pitch limit gate - create startup", False, 
                    f"Status {response.status_code}: {response.text}")
            return
    except Exception as e:
        log_test("Pitch limit gate - create startup", False, f"Exception: {str(e)}")
        return
    
    # Check current usage for phoenix user
    try:
        response = requests.get(f"{BASE_URL}/usage", params={"user_id": phoenix_id})
        if response.status_code == 200:
            usage_data = response.json()
            current_used = usage_data.get("used", 0)
            limit = usage_data.get("limit", 1)
            print(f"   Phoenix user current usage: {current_used}/{limit}")
            
            # Test 4a: If used >= limit, should get 402
            if current_used >= limit:
                try:
                    response = requests.post(f"{BASE_URL}/sessions", json={
                        "user_id": phoenix_id,
                        "startup_id": startup_id,
                        "panel_id": "vc"
                    })
                    
                    if response.status_code == 402:
                        data = response.json()
                        if data.get("error") == "pitch_limit_reached":
                            log_test("Pitch limit gate - free user blocked (402)", True, 
                                    f"Correctly blocked with 402: {data.get('message')}")
                        else:
                            log_test("Pitch limit gate - free user blocked (402)", False, 
                                    f"Got 402 but wrong error: {data}")
                    else:
                        log_test("Pitch limit gate - free user blocked (402)", False, 
                                f"Expected 402, got {response.status_code}: {response.text}")
                except Exception as e:
                    log_test("Pitch limit gate - free user blocked (402)", False, f"Exception: {str(e)}")
            
            # Test 4b: If used < limit, first session should succeed
            else:
                try:
                    response = requests.post(f"{BASE_URL}/sessions", json={
                        "user_id": phoenix_id,
                        "startup_id": startup_id,
                        "panel_id": "vc"
                    })
                    
                    if response.status_code == 200:
                        data = response.json()
                        session_id = data.get("id")
                        log_test("Pitch limit gate - first session succeeds", True, 
                                f"Session created: {session_id}")
                        
                        # Now try to create a second session - should fail with 402
                        try:
                            response2 = requests.post(f"{BASE_URL}/sessions", json={
                                "user_id": phoenix_id,
                                "startup_id": startup_id,
                                "panel_id": "vc"
                            })
                            
                            if response2.status_code == 402:
                                data2 = response2.json()
                                if data2.get("error") == "pitch_limit_reached":
                                    log_test("Pitch limit gate - second session blocked (402)", True, 
                                            f"Correctly blocked: {data2.get('message')}")
                                else:
                                    log_test("Pitch limit gate - second session blocked (402)", False, 
                                            f"Got 402 but wrong error: {data2}")
                            else:
                                log_test("Pitch limit gate - second session blocked (402)", False, 
                                        f"Expected 402, got {response2.status_code}: {response2.text}")
                        except Exception as e:
                            log_test("Pitch limit gate - second session blocked (402)", False, f"Exception: {str(e)}")
                    else:
                        log_test("Pitch limit gate - first session succeeds", False, 
                                f"Status {response.status_code}: {response.text}")
                except Exception as e:
                    log_test("Pitch limit gate - first session succeeds", False, f"Exception: {str(e)}")
        else:
            print(f"   Failed to get usage: {response.status_code}")
    except Exception as e:
        print(f"   Exception checking usage: {str(e)}")
    
    # Test 4c: Pro user should be able to create sessions (up to limit 5)
    # Create a startup for pro user
    pro_startup_id = None
    try:
        response = requests.post(f"{BASE_URL}/startups", json={
            "user_id": pro_id,
            "name": "Pro User Startup"
        })
        
        if response.status_code == 200:
            data = response.json()
            pro_startup_id = data.get("id")
            print(f"   Created pro user startup: {pro_startup_id}")
        else:
            print(f"   Failed to create pro startup: {response.status_code}")
    except Exception as e:
        print(f"   Exception creating pro startup: {str(e)}")
    
    if pro_startup_id:
        # Check pro user usage
        try:
            response = requests.get(f"{BASE_URL}/usage", params={"user_id": pro_id})
            if response.status_code == 200:
                usage_data = response.json()
                pro_used = usage_data.get("used", 0)
                pro_limit = usage_data.get("limit", 5)
                print(f"   Pro user current usage: {pro_used}/{pro_limit}")
                
                # If pro user has room, create a session
                if pro_used < pro_limit:
                    try:
                        response = requests.post(f"{BASE_URL}/sessions", json={
                            "user_id": pro_id,
                            "startup_id": pro_startup_id,
                            "panel_id": "vc"
                        })
                        
                        if response.status_code == 200:
                            data = response.json()
                            log_test("Pitch limit gate - pro user can create session", True, 
                                    f"Session created: {data.get('id')}")
                        else:
                            log_test("Pitch limit gate - pro user can create session", False, 
                                    f"Status {response.status_code}: {response.text}")
                    except Exception as e:
                        log_test("Pitch limit gate - pro user can create session", False, f"Exception: {str(e)}")
                else:
                    print(f"   Pro user already at limit, skipping session creation test")
        except Exception as e:
            print(f"   Exception checking pro usage: {str(e)}")

def test_mentors():
    """Test 5: Mentors endpoints"""
    print("\n" + "="*80)
    print("TEST 5: Mentors seed + list + detail")
    print("="*80)
    
    # Test 5a: POST /api/mentors/seed
    try:
        response = requests.post(f"{BASE_URL}/mentors/seed")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True and data.get("count") == 10:
                log_test("Mentors seed - first call", True, 
                        f"Seeded {data.get('count')} mentors")
            else:
                log_test("Mentors seed - first call", False, 
                        f"Unexpected response: {data}")
        else:
            log_test("Mentors seed - first call", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Mentors seed - first call", False, f"Exception: {str(e)}")
    
    # Test 5b: Call seed again (idempotent)
    try:
        response = requests.post(f"{BASE_URL}/mentors/seed")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True and data.get("count") == 10:
                log_test("Mentors seed - idempotent (second call)", True, 
                        f"Count remains {data.get('count')}")
            else:
                log_test("Mentors seed - idempotent (second call)", False, 
                        f"Unexpected response: {data}")
        else:
            log_test("Mentors seed - idempotent (second call)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Mentors seed - idempotent (second call)", False, f"Exception: {str(e)}")
    
    # Test 5c: GET /api/mentors (all)
    mentor_id = None
    try:
        response = requests.get(f"{BASE_URL}/mentors")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) == 10:
                # Check first mentor has required fields
                mentor = data[0]
                required_fields = ["id", "name", "title", "city", "rating", "experience_tier", 
                                 "hourly_rate", "currency", "expertise", "photo_url", "available_slots"]
                if all(field in mentor for field in required_fields):
                    mentor_id = mentor.get("id")
                    log_test("Mentors list - all mentors", True, 
                            f"Got {len(data)} mentors with all required fields")
                else:
                    log_test("Mentors list - all mentors", False, 
                            f"Missing required fields in mentor: {mentor.keys()}")
            else:
                log_test("Mentors list - all mentors", False, 
                        f"Expected 10 mentors, got {len(data) if isinstance(data, list) else 'not a list'}")
        else:
            log_test("Mentors list - all mentors", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Mentors list - all mentors", False, f"Exception: {str(e)}")
    
    # Test 5d: GET /api/mentors?city=Bangalore
    try:
        response = requests.get(f"{BASE_URL}/mentors", params={"city": "Bangalore"})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check all mentors are from Bangalore
                all_bangalore = all(m.get("city") == "Bangalore" for m in data)
                if all_bangalore:
                    log_test("Mentors list - filter by city (Bangalore)", True, 
                            f"Got {len(data)} Bangalore mentors")
                else:
                    log_test("Mentors list - filter by city (Bangalore)", False, 
                            f"Some mentors not from Bangalore")
            else:
                log_test("Mentors list - filter by city (Bangalore)", False, 
                        f"Expected list with mentors, got {data}")
        else:
            log_test("Mentors list - filter by city (Bangalore)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Mentors list - filter by city (Bangalore)", False, f"Exception: {str(e)}")
    
    # Test 5e: GET /api/mentors?experience_tier=Veteran
    try:
        response = requests.get(f"{BASE_URL}/mentors", params={"experience_tier": "Veteran"})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check all mentors are Veterans
                all_veteran = all(m.get("experience_tier") == "Veteran" for m in data)
                if all_veteran:
                    log_test("Mentors list - filter by experience_tier (Veteran)", True, 
                            f"Got {len(data)} Veteran mentors")
                else:
                    log_test("Mentors list - filter by experience_tier (Veteran)", False, 
                            f"Some mentors not Veterans")
            else:
                log_test("Mentors list - filter by experience_tier (Veteran)", False, 
                        f"Expected list with mentors, got {data}")
        else:
            log_test("Mentors list - filter by experience_tier (Veteran)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Mentors list - filter by experience_tier (Veteran)", False, f"Exception: {str(e)}")
    
    # Test 5f: GET /api/mentors?expertise=Fundraising
    try:
        response = requests.get(f"{BASE_URL}/mentors", params={"expertise": "Fundraising"})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check all mentors have Fundraising in expertise
                all_fundraising = all("Fundraising" in m.get("expertise", []) for m in data)
                if all_fundraising:
                    log_test("Mentors list - filter by expertise (Fundraising)", True, 
                            f"Got {len(data)} mentors with Fundraising expertise")
                else:
                    log_test("Mentors list - filter by expertise (Fundraising)", False, 
                            f"Some mentors don't have Fundraising expertise")
            else:
                log_test("Mentors list - filter by expertise (Fundraising)", False, 
                        f"Expected list with mentors, got {data}")
        else:
            log_test("Mentors list - filter by expertise (Fundraising)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Mentors list - filter by expertise (Fundraising)", False, f"Exception: {str(e)}")
    
    # Test 5g: GET /api/mentors/:id
    if mentor_id:
        try:
            response = requests.get(f"{BASE_URL}/mentors/{mentor_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == mentor_id:
                    log_test("Mentors detail - get single mentor", True, 
                            f"Got mentor: {data.get('name')}")
                else:
                    log_test("Mentors detail - get single mentor", False, 
                            f"ID mismatch: expected {mentor_id}, got {data.get('id')}")
            else:
                log_test("Mentors detail - get single mentor", False, 
                        f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("Mentors detail - get single mentor", False, f"Exception: {str(e)}")
    
    return mentor_id

def test_bookings(user_id, mentor_id):
    """Test 6: Bookings endpoints"""
    print("\n" + "="*80)
    print("TEST 6: Bookings create + list")
    print("="*80)
    
    if not mentor_id:
        print("   Skipping bookings tests - no mentor_id available")
        return
    
    # Test 6a: POST /api/bookings (valid)
    try:
        response = requests.post(f"{BASE_URL}/bookings", json={
            "user_id": user_id,
            "mentor_id": mentor_id,
            "date": "2025-07-01",
            "time": "10:30 AM"
        })
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["id", "status", "duration", "currency", "amount", "mentor_name"]
            if all(field in data for field in required_fields):
                if (data.get("status") == "confirmed" and 
                    data.get("duration") == 60 and 
                    data.get("currency") == "INR"):
                    log_test("Bookings create - valid booking", True, 
                            f"Booking created: {data.get('id')}, amount: ₹{data.get('amount')}")
                else:
                    log_test("Bookings create - valid booking", False, 
                            f"Unexpected field values: {data}")
            else:
                log_test("Bookings create - valid booking", False, 
                        f"Missing required fields: {data.keys()}")
        else:
            log_test("Bookings create - valid booking", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Bookings create - valid booking", False, f"Exception: {str(e)}")
    
    # Test 6b: GET /api/bookings?user_id=
    try:
        response = requests.get(f"{BASE_URL}/bookings", params={"user_id": user_id})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                log_test("Bookings list - user bookings", True, 
                        f"Got {len(data)} booking(s)")
            else:
                log_test("Bookings list - user bookings", False, 
                        f"Expected list with bookings, got {data}")
        else:
            log_test("Bookings list - user bookings", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Bookings list - user bookings", False, f"Exception: {str(e)}")
    
    # Test 6c: POST /api/bookings (missing mentor_id)
    try:
        response = requests.post(f"{BASE_URL}/bookings", json={
            "user_id": user_id,
            "date": "2025-07-01",
            "time": "10:30 AM"
        })
        
        if response.status_code == 400:
            log_test("Bookings create - missing mentor_id returns 400", True, 
                    f"Correctly rejected with 400")
        else:
            log_test("Bookings create - missing mentor_id returns 400", False, 
                    f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Bookings create - missing mentor_id returns 400", False, f"Exception: {str(e)}")

def test_incubators():
    """Test 7: Incubators endpoints"""
    print("\n" + "="*80)
    print("TEST 7: Incubators seed + list + detail")
    print("="*80)
    
    # Test 7a: POST /api/incubators/seed
    try:
        response = requests.post(f"{BASE_URL}/incubators/seed")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True and data.get("count") == 11:
                log_test("Incubators seed - first call", True, 
                        f"Seeded {data.get('count')} incubators")
            else:
                log_test("Incubators seed - first call", False, 
                        f"Unexpected response: {data}")
        else:
            log_test("Incubators seed - first call", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Incubators seed - first call", False, f"Exception: {str(e)}")
    
    # Test 7b: Call seed again (idempotent)
    try:
        response = requests.post(f"{BASE_URL}/incubators/seed")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True and data.get("count") == 11:
                log_test("Incubators seed - idempotent (second call)", True, 
                        f"Count remains {data.get('count')}")
            else:
                log_test("Incubators seed - idempotent (second call)", False, 
                        f"Unexpected response: {data}")
        else:
            log_test("Incubators seed - idempotent (second call)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Incubators seed - idempotent (second call)", False, f"Exception: {str(e)}")
    
    # Test 7c: GET /api/incubators (all)
    incubator_id = None
    try:
        response = requests.get(f"{BASE_URL}/incubators")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) == 11:
                # Check first incubator has required fields
                incubator = data[0]
                required_fields = ["id", "name", "type", "city", "focus_areas", "stage_support", 
                                 "grants_available", "notable_alumni"]
                if all(field in incubator for field in required_fields):
                    incubator_id = incubator.get("id")
                    log_test("Incubators list - all incubators", True, 
                            f"Got {len(data)} incubators with all required fields")
                else:
                    log_test("Incubators list - all incubators", False, 
                            f"Missing required fields in incubator: {incubator.keys()}")
            else:
                log_test("Incubators list - all incubators", False, 
                        f"Expected 11 incubators, got {len(data) if isinstance(data, list) else 'not a list'}")
        else:
            log_test("Incubators list - all incubators", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Incubators list - all incubators", False, f"Exception: {str(e)}")
    
    # Test 7d: GET /api/incubators?city=Chennai
    try:
        response = requests.get(f"{BASE_URL}/incubators", params={"city": "Chennai"})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check all incubators are from Chennai
                all_chennai = all(i.get("city") == "Chennai" for i in data)
                if all_chennai:
                    log_test("Incubators list - filter by city (Chennai)", True, 
                            f"Got {len(data)} Chennai incubators")
                else:
                    log_test("Incubators list - filter by city (Chennai)", False, 
                            f"Some incubators not from Chennai")
            else:
                log_test("Incubators list - filter by city (Chennai)", False, 
                        f"Expected list with incubators, got {data}")
        else:
            log_test("Incubators list - filter by city (Chennai)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Incubators list - filter by city (Chennai)", False, f"Exception: {str(e)}")
    
    # Test 7e: GET /api/incubators?type=accelerator
    try:
        response = requests.get(f"{BASE_URL}/incubators", params={"type": "accelerator"})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check all incubators are accelerators
                all_accelerator = all(i.get("type") == "accelerator" for i in data)
                if all_accelerator:
                    log_test("Incubators list - filter by type (accelerator)", True, 
                            f"Got {len(data)} accelerators")
                else:
                    log_test("Incubators list - filter by type (accelerator)", False, 
                            f"Some incubators not accelerators")
            else:
                log_test("Incubators list - filter by type (accelerator)", False, 
                        f"Expected list with incubators, got {data}")
        else:
            log_test("Incubators list - filter by type (accelerator)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Incubators list - filter by type (accelerator)", False, f"Exception: {str(e)}")
    
    # Test 7f: GET /api/incubators?stage_support=idea
    try:
        response = requests.get(f"{BASE_URL}/incubators", params={"stage_support": "idea"})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check all incubators support idea stage
                all_idea = all("idea" in i.get("stage_support", []) for i in data)
                if all_idea:
                    log_test("Incubators list - filter by stage_support (idea)", True, 
                            f"Got {len(data)} incubators supporting idea stage")
                else:
                    log_test("Incubators list - filter by stage_support (idea)", False, 
                            f"Some incubators don't support idea stage")
            else:
                log_test("Incubators list - filter by stage_support (idea)", False, 
                        f"Expected list with incubators, got {data}")
        else:
            log_test("Incubators list - filter by stage_support (idea)", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Incubators list - filter by stage_support (idea)", False, f"Exception: {str(e)}")
    
    # Test 7g: GET /api/incubators/:id
    if incubator_id:
        try:
            response = requests.get(f"{BASE_URL}/incubators/{incubator_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == incubator_id:
                    log_test("Incubators detail - get single incubator", True, 
                            f"Got incubator: {data.get('name')}")
                else:
                    log_test("Incubators detail - get single incubator", False, 
                            f"ID mismatch: expected {incubator_id}, got {data.get('id')}")
            else:
                log_test("Incubators detail - get single incubator", False, 
                        f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("Incubators detail - get single incubator", False, f"Exception: {str(e)}")
    
    return incubator_id

def test_connection_requests(user_id, incubator_id):
    """Test 8: Connection requests endpoints"""
    print("\n" + "="*80)
    print("TEST 8: Connection requests create + list")
    print("="*80)
    
    if not incubator_id:
        print("   Skipping connection requests tests - no incubator_id available")
        return
    
    # Test 8a: POST /api/connection-requests (valid)
    try:
        response = requests.post(f"{BASE_URL}/connection-requests", json={
            "user_id": user_id,
            "incubator_id": incubator_id,
            "startup_name": "Acme Innovations",
            "startup_stage": "Seed",
            "message": "We are building an AI-powered fintech platform"
        })
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["id", "status", "incubator_name"]
            if all(field in data for field in required_fields):
                if data.get("status") == "pending":
                    log_test("Connection requests create - valid request", True, 
                            f"Request created: {data.get('id')}, incubator: {data.get('incubator_name')}")
                else:
                    log_test("Connection requests create - valid request", False, 
                            f"Expected status 'pending', got {data.get('status')}")
            else:
                log_test("Connection requests create - valid request", False, 
                        f"Missing required fields: {data.keys()}")
        else:
            log_test("Connection requests create - valid request", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Connection requests create - valid request", False, f"Exception: {str(e)}")
    
    # Test 8b: GET /api/connection-requests?user_id=
    try:
        response = requests.get(f"{BASE_URL}/connection-requests", params={"user_id": user_id})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                log_test("Connection requests list - user requests", True, 
                        f"Got {len(data)} request(s)")
            else:
                log_test("Connection requests list - user requests", False, 
                        f"Expected list with requests, got {data}")
        else:
            log_test("Connection requests list - user requests", False, 
                    f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Connection requests list - user requests", False, f"Exception: {str(e)}")
    
    # Test 8c: POST /api/connection-requests (missing startup_name)
    try:
        response = requests.post(f"{BASE_URL}/connection-requests", json={
            "user_id": user_id,
            "incubator_id": incubator_id,
            "startup_stage": "Seed",
            "message": "Test message"
        })
        
        if response.status_code == 400:
            log_test("Connection requests create - missing startup_name returns 400", True, 
                    f"Correctly rejected with 400")
        else:
            log_test("Connection requests create - missing startup_name returns 400", False, 
                    f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Connection requests create - missing startup_name returns 400", False, f"Exception: {str(e)}")

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("ECHOCLASH MONETIZATION BACKEND API TESTS")
    print("Testing ONLY NEW monetization endpoints")
    print("="*80)
    
    # Test 1: Auth login
    phoenix_id = test_auth_login()
    
    # Get pro user ID
    pro_id = None
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if response.status_code == 200:
            pro_id = response.json().get("id")
    except:
        pass
    
    if not phoenix_id or not pro_id:
        print("\n❌ CRITICAL: Could not get user IDs, stopping tests")
        sys.exit(1)
    
    # Test 2: Usage
    test_usage(phoenix_id, pro_id)
    
    # Test 3: Subscription upgrade (use pro user to avoid affecting phoenix)
    test_subscription_upgrade(pro_id)
    
    # Test 4: Pitch limit gate
    test_pitch_limit_gate(phoenix_id, pro_id)
    
    # Test 5: Mentors
    mentor_id = test_mentors()
    
    # Test 6: Bookings
    test_bookings(phoenix_id, mentor_id)
    
    # Test 7: Incubators
    incubator_id = test_incubators()
    
    # Test 8: Connection requests
    test_connection_requests(phoenix_id, incubator_id)
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total tests: {test_results['total']}")
    print(f"Passed: {len(test_results['passed'])} ✅")
    print(f"Failed: {len(test_results['failed'])} ❌")
    
    if test_results['failed']:
        print("\nFailed tests:")
        for test in test_results['failed']:
            print(f"  ❌ {test}")
    
    print("\n" + "="*80)
    
    # Exit with appropriate code
    sys.exit(0 if len(test_results['failed']) == 0 else 1)

if __name__ == "__main__":
    main()
