import http.server
import socketserver
import webbrowser
import os
import urllib.request
import urllib.parse
import json
import time
import socket
import ssl
import subprocess

PORT = 8000
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BACKEND_DIR, "..", "frontend"))
DIRECTORY = FRONTEND_DIR if os.path.exists(FRONTEND_DIR) else BACKEND_DIR

# In-memory proxy caches with 15-minute TTL
TMDB_CACHE = {}
STEAM_CACHE = {}
CACHE_TTL = 900  # 15 minutes

def load_env_file():
    candidates = [
        os.path.join(BACKEND_DIR, ".env"),
        os.path.abspath(os.path.join(BACKEND_DIR, "..", ".env")),
        os.path.join(DIRECTORY, ".env")
    ]
    for env_path in candidates:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ.setdefault(k.strip(), v.strip())
            except Exception:
                pass

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/tmdb":
            self.handle_tmdb_proxy(parsed)
        elif parsed.path == "/api/steam":
            self.handle_steam_proxy(parsed)
        else:
            super().do_GET()

    def handle_tmdb_proxy(self, parsed):
        qs = urllib.parse.parse_qs(parsed.query)
        endpoint = qs.get("endpoint", [""])[0]

        if not endpoint:
            self.send_json({"error": "Missing 'endpoint' parameter"}, 400)
            return

        token = os.environ.get("TMDB_READ_ACCESS_TOKEN")
        
        if not token:
            self.send_json({"error": "TMDB token not configured"}, 503)
            return

        sanitized = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        if ".." in sanitized:
            self.send_json({"error": "Invalid endpoint"}, 400)
            return

        params = {}
        for k, v in qs.items():
            if k != "endpoint":
                params[k] = v[0]
        if "language" not in params:
            params["language"] = "en-US"

        encoded_params = urllib.parse.urlencode(params)
        tmdb_url = f"https://api.themoviedb.org/3{sanitized}"
        if encoded_params:
            tmdb_url += f"?{encoded_params}"

        page = params.get("page", "1")

        # 1. Check in-memory cache
        now = time.time()
        if tmdb_url in TMDB_CACHE:
            cached_body, cached_time = TMDB_CACHE[tmdb_url]
            if now - cached_time < CACHE_TTL:
                print(f"[CACHE] ⚡ TMDB {sanitized} (Page {page}) [Instant]")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Cache-Control", "public, max-age=3600")
                self.end_headers()
                self.wfile.write(cached_body)
                return

        # 2. Resilient Fetcher with Fast Backoff & SChannel Fallback
        ctx = ssl.create_default_context()
        max_retries = 4

        for attempt in range(max_retries):
            # Try Python urllib first
            try:
                req = urllib.request.Request(tmdb_url, headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {token}",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                })
                with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
                    status_code = response.getcode()
                    body = response.read()
                    if status_code == 200 and len(body) > 2:
                        TMDB_CACHE[tmdb_url] = (body, time.time())
                        print(f"[DEBUG] ✅ TMDB {sanitized} (Page {page}): {status_code}")
                        self.send_response(status_code)
                        self.send_header("Content-Type", "application/json")
                        self.send_header("Access-Control-Allow-Origin", "*")
                        self.send_header("Cache-Control", "public, max-age=3600")
                        self.end_headers()
                        self.wfile.write(body)
                        return
            except Exception:
                pass

            # Fallback immediately to native curl.exe with Windows SChannel (bypasses OpenSSL renegotiation drops)
            try:
                proc = subprocess.run([
                    "curl.exe", "-s", "--max-time", "5",
                    "-H", f"Authorization: Bearer {token}",
                    "-H", "Accept: application/json",
                    tmdb_url
                ], capture_output=True, timeout=6)
                if proc.returncode == 0 and len(proc.stdout) > 20:
                    TMDB_CACHE[tmdb_url] = (proc.stdout, time.time())
                    print(f"[DEBUG] ✅ TMDB (via SChannel) {sanitized} (Page {page}): 200")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Cache-Control", "public, max-age=3600")
                    self.end_headers()
                    self.wfile.write(proc.stdout)
                    return
            except Exception:
                pass

            # Fast micro-sleep before retry (0.1s, 0.2s, 0.3s)
            time.sleep(0.1 * (attempt + 1))

        # If all attempts fail, serve empty structure gracefully
        print(f"[WARN] ⚠️ TMDB fallback empty for {sanitized}")
        self.send_json({"results": [], "page": int(page), "total_pages": 1, "total_results": 0}, 200)

    def handle_steam_proxy(self, parsed):
        qs = urllib.parse.parse_qs(parsed.query)
        action = qs.get("action", [""])[0]
        
        if not action:
            self.send_json({"error": "Missing 'action' parameter"}, 400)
            return

        now = time.time()
        cache_key = f"{action}_{parsed.query}"
        if cache_key in STEAM_CACHE:
            cached_body, cached_time = STEAM_CACHE[cache_key]
            if now - cached_time < CACHE_TTL:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Cache-Control", "public, max-age=3600")
                self.end_headers()
                self.wfile.write(cached_body)
                return

        try:
            if action == "search":
                query = qs.get("query", [""])[0]
                if not query:
                    self.send_json({"error": "Missing 'query' parameter"}, 400)
                    return
                
                steam_url = f"https://store.steampowered.com/api/storesearch/?term={urllib.parse.quote(query)}&l=english&cc=IN"
                
                req = urllib.request.Request(steam_url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json"
                })
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    body = response.read()
                    STEAM_CACHE[cache_key] = (body, time.time())
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Cache-Control", "public, max-age=3600")
                    self.end_headers()
                    self.wfile.write(body)
                    
            elif action == "details":
                app_id = qs.get("appid", [""])[0]
                if not app_id:
                    self.send_json({"error": "Missing 'appid' parameter"}, 400)
                    return
                    
                steam_url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&l=english"
                
                req = urllib.request.Request(steam_url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json"
                })
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    body = response.read()
                    STEAM_CACHE[cache_key] = (body, time.time())
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Cache-Control", "public, max-age=3600")
                    self.end_headers()
                    self.wfile.write(body)
                    
            elif action == "reviews":
                app_id = qs.get("appid", [""])[0]
                if not app_id:
                    self.send_json({"error": "Missing 'appid' parameter"}, 400)
                    return
                    
                steam_url = f"https://store.steampowered.com/appreviews/{app_id}?json=1&language=all"
                
                req = urllib.request.Request(steam_url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json"
                })
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    body = response.read()
                    STEAM_CACHE[cache_key] = (body, time.time())
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Cache-Control", "public, max-age=3600")
                    self.end_headers()
                    self.wfile.write(body)
            else:
                self.send_json({"error": f"Unknown action: {action}"}, 400)
                
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"error": "Steam API error", "items": []}')
        except Exception as e:
            self.send_json({"items": [], "error": str(e)}, 200)

    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

def start_server():
    load_env_file()
    
    token = os.environ.get("TMDB_READ_ACCESS_TOKEN")
    print("="*60)
    print("CinePlay Development Server")
    print("="*60)
    if token:
        print(f"[INFO] ✅ TMDB Token loaded")
    else:
        print("[ERROR] ❌ TMDB Token NOT loaded!")
    print("="*60)
    
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    
    with socketserver.ThreadingTCPServer(("", PORT), Handler) as httpd:
        print(f"Serving files from: {DIRECTORY}")
        print(f"Local URL: http://localhost:{PORT}/")
        print("="*60)
        print("Press Ctrl+C to stop the server.")
        
        # Automatically open default browser in a non-blocking thread
        import threading
        def open_browser():
            time.sleep(0.5)
            try:
                webbrowser.open(f"http://localhost:{PORT}/")
            except Exception:
                pass
        threading.Thread(target=open_browser, daemon=True).start()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    start_server()