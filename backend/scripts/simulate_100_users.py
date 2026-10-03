import concurrent.futures
import time
import random
import json
import urllib.request
import urllib.error
import urllib.parse
from dataclasses import dataclass
from typing import List

BASE_URL = "http://127.0.0.1:5000"

@dataclass
class RequestResult:
    endpoint: str
    method: str
    status_code: int
    duration_ms: float
    success: bool
    error_msg: str = ""

def make_request(method: str, path: str, payload: dict = None) -> RequestResult:
    url = f"{BASE_URL}{path}"
    data = None
    headers = {"Content-Type": "application/json", "User-Agent": "SHORE-StressTester/1.0"}
    
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    start_time = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
            duration_ms = (time.perf_counter() - start_time) * 1000
            return RequestResult(endpoint=path, method=method, status_code=resp.status, duration_ms=duration_ms, success=True)
    except urllib.error.HTTPError as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        return RequestResult(endpoint=path, method=method, status_code=e.code, duration_ms=duration_ms, success=False, error_msg=f"HTTP {e.code}")
    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        return RequestResult(endpoint=path, method=method, status_code=0, duration_ms=duration_ms, success=False, error_msg=str(e))

def simulate_user_session(user_id: int, num_actions: int = 15) -> List[RequestResult]:
    """Simulate a single user performing multiple random actions in a session."""
    user_email = f"stress_test_user_{user_id}@example.com"
    results = []
    
    # 1. Login / fetch user profile
    results.append(make_request("GET", "/api/users"))
    time.sleep(random.uniform(0.01, 0.05))
    
    # 2. Random action loop
    actions = [
        "get_scholarships",
        "get_announcements",
        "get_inventory",
        "get_tickets",
        "update_tracked",
        "auto_parse_sample",
        "get_recitations",
        "create_ticket"
    ]
    
    for _ in range(num_actions):
        action = random.choice(actions)
        
        if action == "get_scholarships":
            results.append(make_request("GET", "/api/scholarships"))
        elif action == "get_announcements":
            results.append(make_request("GET", "/api/announcements"))
        elif action == "get_inventory":
            results.append(make_request("GET", "/api/inventory"))
        elif action == "get_tickets":
            results.append(make_request("GET", "/api/tickets"))
        elif action == "get_recitations":
            results.append(make_request("GET", "/api/recitations"))
        elif action == "update_tracked":
            mock_tracked = [
                {
                    "id": f"sch_track_{random.randint(1, 5)}",
                    "title": f"Scholarship Program {random.randint(1, 5)}",
                    "requirements": [
                        {"name": "PSA Birth Certificate", "status": random.choice(["ready", "missing", "pending"])},
                        {"name": "Grade 12 Report Card", "status": random.choice(["ready", "missing", "pending"])}
                    ]
                }
            ]
            results.append(make_request("PUT", f"/api/users/{user_email}", {"appliedScholarships": mock_tracked}))
        elif action == "auto_parse_sample":
            sample_text = f"DOST-SEI Merit Scholarship Program #{user_id}. Deadline: November 15, 2026. Requirements: PSA Birth Certificate, Form 138, 2x2 Picture."
            results.append(make_request("POST", "/api/scholarships/auto-parse", {"input": sample_text}))
        elif action == "create_ticket":
            results.append(make_request("POST", "/api/tickets", {
                "title": f"Stress test ticket {user_id}",
                "description": "Simulated support inquiry under load",
                "category": "General",
                "createdBy": user_email
            }))
            
        time.sleep(random.uniform(0.01, 0.05))
        
    return results

def run_stress_test(num_users: int = 100, actions_per_user: int = 12):
    print(f"=== Starting SHORE Web App Concurrency Stress Test ===")
    print(f"Target: {BASE_URL}")
    print(f"Simulating {num_users} simultaneous users with {actions_per_user} randomized operations each...")
    print(f"Total expected requests: ~{num_users * (actions_per_user + 1)}")
    print("-" * 60)
    
    start_total_time = time.perf_counter()
    all_results: List[RequestResult] = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_users) as executor:
        future_to_user = {
            executor.submit(simulate_user_session, user_id, actions_per_user): user_id 
            for user_id in range(1, num_users + 1)
        }
        
        completed = 0
        for future in concurrent.futures.as_completed(future_to_user):
            user_id = future_to_user[future]
            try:
                res = future.result()
                all_results.extend(res)
                completed += 1
                if completed % 20 == 0 or completed == num_users:
                    print(f"[{completed}/{num_users}] users finished their sessions...")
            except Exception as exc:
                print(f"User {user_id} generated an exception: {exc}")
                
    total_duration = time.perf_counter() - start_total_time
    
    total_requests = len(all_results)
    successful_requests = sum(1 for r in all_results if r.success)
    failed_requests = total_requests - successful_requests
    
    durations = [r.duration_ms for r in all_results]
    durations.sort()
    
    avg_lat = sum(durations) / len(durations) if durations else 0
    p50 = durations[int(len(durations) * 0.50)] if durations else 0
    p95 = durations[int(len(durations) * 0.95)] if durations else 0
    p99 = durations[int(len(durations) * 0.99)] if durations else 0
    max_lat = max(durations) if durations else 0
    min_lat = min(durations) if durations else 0
    rps = total_requests / total_duration if total_duration > 0 else 0
    
    print("=" * 60)
    print("                STRESS TEST RESULTS REPORT               ")
    print("=" * 60)
    print(f"Total Test Time:         {total_duration:.2f} seconds")
    print(f"Total Requests Made:     {total_requests}")
    print(f"Successful Requests:     {successful_requests} ({successful_requests/total_requests*100:.1f}%)")
    print(f"Failed Requests:         {failed_requests} ({failed_requests/total_requests*100:.1f}%)")
    print(f"Throughput (RPS):        {rps:.2f} req/sec")
    print("-" * 60)
    print("Latency Distribution:")
    print(f"  Min:                   {min_lat:.2f} ms")
    print(f"  Avg:                   {avg_lat:.2f} ms")
    print(f"  P50 (Median):          {p50:.2f} ms")
    print(f"  P95:                   {p95:.2f} ms")
    print(f"  P99:                   {p99:.2f} ms")
    print(f"  Max:                   {max_lat:.2f} ms")
    print("-" * 60)
    
    endpoint_stats = {}
    for r in all_results:
        ep_name = r.endpoint
        if ep_name.startswith("/api/users/"):
            ep_name = "/api/users/<email>"
        key = f"{r.method} {ep_name}"
        if key not in endpoint_stats:
            endpoint_stats[key] = {"total": 0, "success": 0, "durations": []}
        endpoint_stats[key]["total"] += 1
        if r.success:
            endpoint_stats[key]["success"] += 1
        endpoint_stats[key]["durations"].append(r.duration_ms)
        
    print("Endpoint Breakdown:")
    for ep, stat in sorted(endpoint_stats.items()):
        ep_avg = sum(stat["durations"]) / len(stat["durations"])
        success_pct = (stat["success"] / stat["total"]) * 100
        print(f"  {ep:<35} | Calls: {stat['total']:<5} | Success: {success_pct:>5.1f}% | Avg Latency: {ep_avg:>6.2f} ms")
        
    if failed_requests > 0:
        print("-" * 60)
        print("Sample Failures:")
        failures = [r for r in all_results if not r.success][:10]
        for f in failures:
            print(f"  {f.method} {f.endpoint} -> Status {f.status_code} ({f.error_msg})")
            
    print("=" * 60)

if __name__ == "__main__":
    run_stress_test(num_users=100, actions_per_user=12)
