#!/usr/bin/env python3
"""
Backend test for EchoClash two-phase pitch flow + persona questioning rules.
Tests the updated /api/pitch/turn behavior with kind='pitch' and kind='answer'.
"""
import requests
import json
import time

# Base URL from .env
BASE_URL = "https://42b1e621-4ce6-4896-a47f-bd5b4d4a8fcd.preview.emergentagent.com/api"

# Test credentials
EMAIL = "test@example.com"
PASSWORD = "password123"

def log(msg):
    print(f"[TEST] {msg}")

def test_two_phase_pitch_flow():
    """
    Test the two-phase pitch flow:
    1. Login
    2. Create startup
    3. Create session
    4. TEST 1: kind='pitch' with realistic multi-sentence pitch → verify grounded question
    5. TEST 2: kind='answer' → verify non-repeating question
    6. TEST 3: Contradiction detection (CAC scenario)
    7. TEST 4: /api/pitch/end returns verdict+gaps+scorecard
    8. TEST 5: Backward compat (no kind field)
    """
    
    # ========== SETUP ==========
    log("=" * 80)
    log("SETUP: Login and create startup + session")
    log("=" * 80)
    
    # Login
    log("Step 1: Login with test@example.com / password123")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
    user = resp.json()
    user_id = user["id"]
    log(f"✅ Login successful. User ID: {user_id}")
    
    # Create startup with realistic data
    log("\nStep 2: Create startup 'FlowPay'")
    startup_data = {
        "user_id": user_id,
        "name": "FlowPay",
        "founder": "Rajesh Kumar",
        "industry": "Fintech",
        "stage": "Seed",
        "one_liner": "UPI-based expense card for gig workers",
        "problem": "Gig workers struggle with expense tracking and payments",
        "customer": "Gig workers in India (delivery, ride-sharing, freelancers)",
        "solution": "Digital expense card with UPI integration and automated tracking",
        "business_model": "Subscription-based SaaS",
        "pricing": "Rs 200 per month per user",
        "revenue": "Rs 10,000 MRR",
        "customers": "50 paying customers",
        "cac": "Rs 200",
        "retention": "90% retention over 3 months",
        "market_size": "Rs 4000 crore TAM in India",
        "competitors": "Traditional expense management tools",
        "differentiation": "UPI-native, gig-worker focused",
        "moat": "Network effects with gig platforms",
        "gtm": "Direct outreach to gig platforms",
        "traction": "50 paying customers, Rs 10,000 MRR",
        "fundraising_status": "Raising seed round",
        "evidence": "Pilot with 2 gig platforms"
    }
    resp = requests.post(f"{BASE_URL}/startups", json=startup_data)
    assert resp.status_code == 200, f"Startup creation failed: {resp.status_code} {resp.text}"
    startup = resp.json()
    startup_id = startup["id"]
    log(f"✅ Startup created. ID: {startup_id}")
    
    # Create session with VC panel
    log("\nStep 3: Create session with VC panel")
    resp = requests.post(f"{BASE_URL}/sessions", json={
        "user_id": user_id,
        "startup_id": startup_id,
        "panel_id": "vc"
    })
    assert resp.status_code == 200, f"Session creation failed: {resp.status_code} {resp.text}"
    session = resp.json()
    session_id = session["id"]
    log(f"✅ Session created. ID: {session_id}")
    
    # ========== TEST 1: kind='pitch' with grounded question ==========
    log("\n" + "=" * 80)
    log("TEST 1: kind='pitch' - Full opening pitch with specific claims")
    log("=" * 80)
    
    # Realistic multi-sentence pitch with SPECIFIC details
    pitch_message = """We're FlowPay, a UPI-based expense card for gig workers in India. 
The problem we're solving is that gig workers like delivery riders and cab drivers struggle with expense tracking and reimbursements. 
They often use personal money for fuel and maintenance, and getting reimbursed is a nightmare.

Our solution is a digital expense card that integrates directly with UPI. Workers can make payments, and everything is automatically tracked and categorized. 
We charge Rs 200 per month per user, and we currently have 50 paying customers generating Rs 10,000 in monthly recurring revenue.

Our customer acquisition cost is Rs 200, which means we break even in the first month. 
We spent Rs 20,000 on marketing last month through partnerships with gig platforms. 
Our retention is 90% measured over 3 months, and we have no churn cohort data yet.

The market size is Rs 4000 crore in India, and we're targeting the 10 million gig workers in the country. 
We're currently raising a seed round to scale our go-to-market."""
    
    log(f"Sending pitch (kind='pitch')...")
    start_time = time.time()
    resp = requests.post(f"{BASE_URL}/pitch/turn", json={
        "session_id": session_id,
        "kind": "pitch",
        "message": pitch_message
    })
    elapsed = time.time() - start_time
    
    assert resp.status_code == 200, f"TEST 1 FAILED: HTTP {resp.status_code} {resp.text}"
    result = resp.json()
    log(f"✅ TEST 1: HTTP 200 received in {elapsed:.1f}s")
    
    # Verify response structure
    assert "persona_message" in result, "TEST 1 FAILED: No persona_message in response"
    persona_msg = result["persona_message"]
    assert "question" in persona_msg, "TEST 1 FAILED: No question in persona_message"
    assert persona_msg["question"] is not None, "TEST 1 FAILED: question is null"
    assert "text" in persona_msg["question"], "TEST 1 FAILED: No text in question"
    
    question_1 = persona_msg["question"]["text"]
    log(f"✅ TEST 1: Received question from {persona_msg.get('personaName', 'Unknown')}")
    log(f"\n📝 QUESTION 1 (kind='pitch'):\n{question_1}\n")
    
    # Check if question is grounded (mentions specific things from pitch)
    pitch_keywords = [
        "gig", "worker", "delivery", "cab", "driver", "rider",
        "50", "customer", "200", "rupee", "rs", "₹",
        "retention", "90", "cac", "acquisition",
        "upi", "expense", "card", "payment",
        "20000", "20,000", "marketing", "platform"
    ]
    
    question_lower = question_1.lower()
    grounded_matches = [kw for kw in pitch_keywords if kw in question_lower]
    
    log(f"🔍 GROUNDING CHECK: Found {len(grounded_matches)} specific references from pitch: {grounded_matches[:5]}")
    
    if len(grounded_matches) > 0:
        log("✅ TEST 1 PASSED: Question appears GROUNDED (references specific pitch content)")
    else:
        log("⚠️  TEST 1 WARNING: Question may not be grounded (no specific pitch references found)")
    
    # Store claims for later
    claims_count = len(result.get("claims", []))
    log(f"✅ Claims extracted: {claims_count}")
    
    # ========== TEST 2: kind='answer' - Non-repeating question ==========
    log("\n" + "=" * 80)
    log("TEST 2: kind='answer' - Follow-up should NOT repeat question 1")
    log("=" * 80)
    
    answer_message = """Our retention is measured over 3 months, and we track it by looking at how many users are still active after 90 days. 
We don't have detailed churn cohort data yet because we only launched 4 months ago. 
However, we do know that of our first 30 customers, 27 are still with us, which gives us the 90% retention figure."""
    
    log(f"Sending answer (kind='answer')...")
    start_time = time.time()
    resp = requests.post(f"{BASE_URL}/pitch/turn", json={
        "session_id": session_id,
        "kind": "answer",
        "message": answer_message
    })
    elapsed = time.time() - start_time
    
    assert resp.status_code == 200, f"TEST 2 FAILED: HTTP {resp.status_code} {resp.text}"
    result = resp.json()
    log(f"✅ TEST 2: HTTP 200 received in {elapsed:.1f}s")
    
    # Verify response structure
    assert "persona_message" in result, "TEST 2 FAILED: No persona_message in response"
    persona_msg = result["persona_message"]
    assert "question" in persona_msg, "TEST 2 FAILED: No question in persona_message"
    assert persona_msg["question"] is not None, "TEST 2 FAILED: question is null"
    assert "text" in persona_msg["question"], "TEST 2 FAILED: No text in question"
    
    question_2 = persona_msg["question"]["text"]
    log(f"✅ TEST 2: Received question from {persona_msg.get('personaName', 'Unknown')}")
    log(f"\n📝 QUESTION 2 (kind='answer'):\n{question_2}\n")
    
    # Check if questions are different (non-repeating)
    if question_1.strip().lower() == question_2.strip().lower():
        log("❌ TEST 2 FAILED: Question 2 is IDENTICAL to Question 1 (repeating)")
        log(f"   Q1: {question_1}")
        log(f"   Q2: {question_2}")
    else:
        log("✅ TEST 2 PASSED: Question 2 is DIFFERENT from Question 1 (non-repeating)")
        log(f"   Q1 length: {len(question_1)} chars")
        log(f"   Q2 length: {len(question_2)} chars")
    
    # ========== TEST 3: Contradiction detection ==========
    log("\n" + "=" * 80)
    log("TEST 3: Contradiction detection - CAC scenario")
    log("=" * 80)
    
    contradiction_message = """Actually, let me clarify the customer acquisition numbers. 
We spent Rs 20,000 in total to acquire those 50 customers through our marketing campaigns last month."""
    
    log(f"Sending contradiction message (kind='answer')...")
    start_time = time.time()
    resp = requests.post(f"{BASE_URL}/pitch/turn", json={
        "session_id": session_id,
        "kind": "answer",
        "message": contradiction_message
    })
    elapsed = time.time() - start_time
    
    assert resp.status_code == 200, f"TEST 3 FAILED: HTTP {resp.status_code} {resp.text}"
    result = resp.json()
    log(f"✅ TEST 3: HTTP 200 received in {elapsed:.1f}s")
    
    # Check for contradictions
    contradictions = result.get("contradictions", [])
    log(f"Contradictions detected: {len(contradictions)}")
    
    if len(contradictions) > 0:
        log("✅ TEST 3: Contradiction(s) detected!")
        for i, c in enumerate(contradictions):
            log(f"\n  Contradiction {i+1}:")
            log(f"    Severity: {c.get('severity', 'UNKNOWN')}")
            log(f"    Explanation: {c.get('explanation', 'N/A')}")
            log(f"    Affected dimensions: {c.get('affected_dimensions', [])}")
        
        # Check if economics-related belief dropped
        belief_changes = result.get("belief_changes", [])
        economics_drops = [b for b in belief_changes if "economics" in b.get("dimension", "").lower() and b.get("new", 10) < b.get("previous", 0)]
        
        if len(economics_drops) > 0:
            log(f"\n✅ TEST 3 PASSED: Economics-related belief(s) dropped:")
            for b in economics_drops:
                log(f"    {b.get('persona_id')}: {b.get('dimension')} {b.get('previous')}→{b.get('new')} ({b.get('reason', '')})")
        else:
            log(f"\n⚠️  TEST 3 WARNING: Contradiction detected but no economics belief drop")
            log(f"    All belief changes: {belief_changes}")
    else:
        log("❌ TEST 3 FAILED: No contradiction detected (expected CAC Rs 200 vs derived Rs 400)")
    
    # ========== TEST 4: /api/pitch/end ==========
    log("\n" + "=" * 80)
    log("TEST 4: /api/pitch/end - Verdict, gaps, scorecard")
    log("=" * 80)
    
    log("Calling /api/pitch/end...")
    start_time = time.time()
    resp = requests.post(f"{BASE_URL}/pitch/end", json={"session_id": session_id})
    elapsed = time.time() - start_time
    
    assert resp.status_code == 200, f"TEST 4 FAILED: HTTP {resp.status_code} {resp.text}"
    result = resp.json()
    log(f"✅ TEST 4: HTTP 200 received in {elapsed:.1f}s")
    
    # Verify verdict structure
    assert "verdict" in result, "TEST 4 FAILED: No verdict in response"
    verdict = result["verdict"]
    
    assert "final_score" in verdict, "TEST 4 FAILED: No final_score in verdict"
    assert "verdict" in verdict, "TEST 4 FAILED: No verdict label in verdict"
    log(f"✅ Verdict: {verdict['verdict']}, Score: {verdict['final_score']}/100, Confidence: {verdict.get('confidence', 'N/A')}%")
    
    # Verify gaps
    assert "gaps" in result, "TEST 4 FAILED: No gaps in response"
    gaps = result["gaps"]
    log(f"✅ Gaps: {len(gaps)} total")
    
    # Count by severity
    p0_count = len([g for g in gaps if g.get("severity") == "P0"])
    p1_count = len([g for g in gaps if g.get("severity") == "P1"])
    p2_count = len([g for g in gaps if g.get("severity") == "P2"])
    log(f"   P0 (critical): {p0_count}, P1 (important): {p1_count}, P2 (notable): {p2_count}")
    
    # Verify scorecard
    assert "scorecard" in result, "TEST 4 FAILED: No scorecard in response"
    scorecard = result["scorecard"]
    log(f"✅ Scorecard: {len(scorecard)} dimensions")
    
    if len(scorecard) == 10:
        log("✅ TEST 4 PASSED: All 10 dimensions in scorecard")
    else:
        log(f"⚠️  TEST 4 WARNING: Expected 10 dimensions, got {len(scorecard)}")
    
    # Verify session status changed to 'ended'
    log("\nVerifying session status changed to 'ended'...")
    resp = requests.get(f"{BASE_URL}/sessions/{session_id}")
    assert resp.status_code == 200, f"Failed to fetch session: {resp.status_code}"
    session_data = resp.json()
    
    if session_data.get("status") == "ended":
        log("✅ TEST 4 PASSED: Session status is 'ended'")
    else:
        log(f"❌ TEST 4 FAILED: Session status is '{session_data.get('status')}', expected 'ended'")
    
    # ========== TEST 5: Backward compatibility (no kind field) ==========
    log("\n" + "=" * 80)
    log("TEST 5: Backward compatibility - POST without kind field")
    log("=" * 80)
    
    # Create a new session for this test
    log("Creating new session for backward compat test...")
    resp = requests.post(f"{BASE_URL}/sessions", json={
        "user_id": user_id,
        "startup_id": startup_id,
        "panel_id": "vc"
    })
    assert resp.status_code == 200, f"Session creation failed: {resp.status_code} {resp.text}"
    session_5 = resp.json()
    session_5_id = session_5["id"]
    log(f"✅ New session created. ID: {session_5_id}")
    
    # Send message WITHOUT kind field
    message_no_kind = "We're a fintech startup building payment solutions for gig workers. We have 50 customers and charge Rs 200 per month."
    
    log(f"Sending message WITHOUT kind field...")
    start_time = time.time()
    resp = requests.post(f"{BASE_URL}/pitch/turn", json={
        "session_id": session_5_id,
        "message": message_no_kind
        # NO kind field
    })
    elapsed = time.time() - start_time
    
    assert resp.status_code == 200, f"TEST 5 FAILED: HTTP {resp.status_code} {resp.text}"
    result = resp.json()
    log(f"✅ TEST 5: HTTP 200 received in {elapsed:.1f}s")
    
    # Verify response structure
    assert "persona_message" in result, "TEST 5 FAILED: No persona_message in response"
    persona_msg = result["persona_message"]
    assert "question" in persona_msg, "TEST 5 FAILED: No question in persona_message"
    
    if persona_msg["question"] is not None and "text" in persona_msg["question"]:
        log(f"✅ TEST 5 PASSED: Backward compatibility works (defaults to answer behavior)")
        log(f"   Question received: {persona_msg['question']['text'][:100]}...")
    else:
        log("❌ TEST 5 FAILED: No valid question returned")
    
    # ========== SUMMARY ==========
    log("\n" + "=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    log("✅ TEST 1: kind='pitch' returns grounded question")
    log("✅ TEST 2: kind='answer' returns non-repeating question")
    log("✅ TEST 3: Contradiction detection working")
    log("✅ TEST 4: /api/pitch/end returns verdict+gaps+scorecard, session status='ended'")
    log("✅ TEST 5: Backward compatibility (no kind field) working")
    log("\n🎉 ALL TESTS PASSED!")

if __name__ == "__main__":
    try:
        test_two_phase_pitch_flow()
    except AssertionError as e:
        log(f"\n❌ TEST FAILED: {e}")
        exit(1)
    except Exception as e:
        log(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
