#!/usr/bin/env python3
"""
HTTP server with explicit no-cache headers for development.
"""
import http.server
import socketserver
import os

PORT = 8000

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Send explicit no-cache headers
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

# Serve files from the repository root (directory containing this script)
repo_root = os.path.dirname(os.path.abspath(__file__))
os.chdir(repo_root)

with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()
