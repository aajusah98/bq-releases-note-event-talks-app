import re
import html
import hashlib
import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0,
    "expiry_seconds": 600  # 10 minutes cache
}

def hash_string(s):
    return hashlib.md5(s.encode('utf-8')).hexdigest()

def strip_html(html_str):
    # Basic html tag stripper
    # First, replace links with text + href if we want, or just remove formatting.
    # Let's keep links as clean text and format nicely
    text = re.sub(r'<[^>]+>', '', html_str)
    # Decode HTML entities
    text = html.unescape(text)
    # Clean extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_feed_xml(xml_data):
    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        print(f"XML parse error: {e}")
        return []

    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', ns)
    
    parsed_updates = []
    
    for entry in entries:
        title_elem = entry.find('atom:title', ns)
        date_str = title_elem.text.strip() if title_elem is not None else "Unknown Date"
        
        # Link to the release note section
        link_elem = entry.find('atom:link', ns)
        link = link_elem.attrib.get('href', '') if link_elem is not None else ""
        
        # Content body
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        if not content_html:
            continue
            
        # Split content by <h3> to get individual updates
        # e.g., "<h3>Feature</h3><p>...</p><h3>Fix</h3><p>...</p>"
        parts = re.split(r'(?i)<h3>', content_html)
        first_part = parts[0].strip()
        
        # If there's content before the first h3, or no h3 tags at all
        if len(parts) == 1 or (first_part and not first_part.isspace()):
            raw_text = strip_html(content_html)
            parsed_updates.append({
                'id': hash_string(f"{date_str}_{content_html[:50]}"),
                'date': date_str,
                'type': 'Update',
                'content': content_html,
                'raw_text': raw_text,
                'link': link
            })
            
        # Process the split items starting with <h3>
        for idx, part in enumerate(parts[1:]):
            subparts = part.split('</h3>', 1)
            if len(subparts) == 2:
                update_type, body = subparts
                update_type = update_type.strip()
                body = body.strip()
                
                raw_text = strip_html(body)
                update_id = hash_string(f"{date_str}_{update_type}_{idx}_{body[:50]}")
                
                parsed_updates.append({
                    'id': update_id,
                    'date': date_str,
                    'type': update_type,
                    'content': f"<h3>{update_type}</h3>{body}",
                    'raw_text': raw_text,
                    'link': link
                })
                
    return parsed_updates

def fetch_and_parse_feed(force_refresh=False):
    now = time.time()
    
    # Return cache if valid and not forced
    if not force_refresh and cache["data"] is not None and (now - cache["last_fetched"] < cache["expiry_seconds"]):
        return cache["data"], "cache"
        
    try:
        # Define headers to mimic a browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        req = urllib.request.Request(FEED_URL, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        updates = parse_feed_xml(xml_data)
        
        # Save to cache
        cache["data"] = updates
        cache["last_fetched"] = now
        return updates, "network"
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # If network call fails but we have cached data, return cached data
        if cache["data"] is not None:
            return cache["data"], "fallback"
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        updates, source = fetch_and_parse_feed(force_refresh)
        return jsonify({
            'success': True,
            'source': source,
            'count': len(updates),
            'timestamp': int(cache["last_fetched"]),
            'updates': updates
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=8080)
