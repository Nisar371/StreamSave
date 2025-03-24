from urllib.parse import urlparse
import yt_dlp

def validate_url(url):
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def get_supported_sites():
    supported = [
        {'name': 'YouTube', 'icon': 'youtube'},
        {'name': 'Instagram', 'icon': 'instagram'},
        {'name': 'Facebook', 'icon': 'facebook'},
        {'name': 'Twitter', 'icon': 'twitter'},
        {'name': 'TikTok', 'icon': 'tiktok'}
    ]
    return supported
