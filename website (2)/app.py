import os
from flask import Flask, render_template, request, jsonify
import yt_dlp
import logging
from utils import validate_url, get_supported_sites

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")  # Will be set in production

# Production configurations
if not app.debug:
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30 minutes

@app.errorhandler(404)
def not_found_error(error):
    return render_template('error.html', error="Page not found"), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Server Error: {error}")
    return render_template('error.html', error="Internal server error"), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-info', methods=['POST'])
def get_video_info():
    url = request.form.get('url')

    if not url:
        return jsonify({'error': 'Please enter a URL'}), 400

    if not validate_url(url):
        return jsonify({'error': 'Invalid URL format'}), 400

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'format': 'bestvideo[height>=2160]+bestaudio/bestvideo[height>=1440]+bestaudio/bestvideo[height>=1080]+bestaudio/bestvideo[height>=720]+bestaudio/best',  # Prioritize 4K quality
            'extract_flat': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        available_formats = []
        for f in info.get('formats', []):
            filesize = f.get('filesize', 0)
            format_info = {
                'format_id': f.get('format_id', ''),
                'ext': f.get('ext', ''),
                'filesize': filesize,
            }

            # Video+Audio formats
            if (f.get('acodec') != 'none' and f.get('vcodec') != 'none'):
                height = f.get('height', 0)
                if height >= 2160:
                    quality_label = '4K'
                elif height >= 1440:
                    quality_label = '2K'
                elif height >= 1080:
                    quality_label = 'Full HD'
                elif height >= 720:
                    quality_label = 'HD'
                else:
                    quality_label = f'{height}p'

                format_info.update({
                    'type': 'video',
                    'height': height,
                    'quality_label': quality_label,
                    'fps': f.get('fps', 0)
                })
                available_formats.append(format_info)

            # Audio-only formats
            elif f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                abr = f.get('abr', 0)
                format_info.update({
                    'type': 'audio',
                    'quality_label': f'{int(abr) if abr else 0}kbps Audio',
                    'abr': abr
                })
                available_formats.append(format_info)

        # Sort formats by resolution and fps, prioritizing highest quality
        video_formats = [f for f in available_formats if f.get('type') == 'video']
        audio_formats = [f for f in available_formats if f.get('type') == 'audio']
        
        if video_formats:
            video_formats.sort(key=lambda x: (x.get('height', 0), x.get('fps', 0)), reverse=True)
        
        available_formats = video_formats + audio_formats

        video_info = {
            'title': info.get('title', 'Unknown Title'),
            'thumbnail': info.get('thumbnail', ''),
            'duration': info.get('duration', 0),
            'formats': available_formats[:5]  # Show top 5 highest quality formats
        }

        return jsonify(video_info)

    except Exception as e:
        logger.error(f"Error extracting video info: {str(e)}")
        return jsonify({'error': 'Failed to fetch video information'}), 400

@app.route('/download', methods=['POST'])
def download_video():
    url = request.form.get('url')
    format_id = request.form.get('format')
    download_type = request.form.get('type', 'video')

    if not url or not format_id:
        return jsonify({'error': 'Missing URL or format'}), 400

    try:
        ydl_opts = {
            'format': f'{format_id}+bestaudio/best' if download_type == 'video' else 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            download_url = info['url']

        return jsonify({
            'download_url': download_url,
            'title': info.get('title', 'video')
        })

    except Exception as e:
        logger.error(f"Error downloading video: {str(e)}")
        return jsonify({'error': 'Failed to process download'}), 400

@app.route('/supported-sites')
def supported_sites():
    return jsonify(get_supported_sites())