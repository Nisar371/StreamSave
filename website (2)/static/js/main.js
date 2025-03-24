// DOM Elements
const downloadForm = document.getElementById('downloadForm');
const videoUrl = document.getElementById('videoUrl');
const formatSelect = document.getElementById('formatSelect');
const downloadBtn = document.getElementById('downloadBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorAlert = document.getElementById('errorAlert');
const videoInfo = document.getElementById('videoInfo');
const videoThumbnail = document.getElementById('videoThumbnail');
const videoTitle = document.getElementById('videoTitle');
const videoDuration = document.getElementById('videoDuration');
const inlineVideoPlayer = document.getElementById('inlineVideoPlayer');
const videoPlayer = document.getElementById('videoPlayer');
const downloadOptions = document.getElementById('downloadOptions');
const supportedSites = document.getElementById('supportedSites');


let currentVideoUrl = '';

// Load supported sites
fetch('/supported-sites')
    .then(response => response.json())
    .then(sites => {
        sites.forEach(site => {
            const siteDiv = document.createElement('div');
            siteDiv.className = 'site-icon';
            siteDiv.innerHTML = `
                <i class="bi bi-${site.icon}"></i>
                <span>${site.name}</span>
            `;
            supportedSites.appendChild(siteDiv);
        });
    });

// Format duration to readable string
function formatDuration(seconds) {
    if (!seconds) return 'Unknown duration';
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format file size to readable string
function formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Show error message
function showError(message) {
    errorAlert.textContent = message;
    errorAlert.classList.remove('d-none');
    setTimeout(() => {
        errorAlert.classList.add('d-none');
    }, 5000);
}


// Form submit handler
downloadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Don't reset if it's the same URL
    if (currentVideoUrl === videoUrl.value) {
        return;
    }

    // Reset UI
    errorAlert.classList.add('d-none');
    videoInfo.classList.add('d-none');
    loadingSpinner.classList.remove('d-none');
    downloadBtn.style.display = 'none';
    downloadOptions.classList.add('d-none');

    const formData = new FormData();
    formData.append('url', videoUrl.value);

    try {
        const response = await fetch('/get-info', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch video information');
        }

        // Update UI with video information
        videoThumbnail.src = data.thumbnail;
        videoTitle.textContent = data.title;
        videoDuration.textContent = `Duration: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}`;

        // Clear and update format options
        formatSelect.innerHTML = '<option value="">Select quality</option>';
        data.formats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.format_id;
            option.textContent = format.quality_label;
            formatSelect.appendChild(option);
        });

        // Show video info and enable buttons
        videoInfo.classList.remove('d-none');
        downloadBtn.style.display = 'block';
        currentVideoUrl = videoUrl.value;

    } catch (error) {
        errorAlert.textContent = error.message;
        errorAlert.classList.remove('d-none');
    } finally {
        loadingSpinner.classList.add('d-none');
    }
});

// Format selection handler
formatSelect.addEventListener('change', () => {
    downloadBtn.disabled = !formatSelect.value;
});

// Download button handler
downloadBtn.addEventListener('click', () => {
    downloadOptions.classList.remove('d-none');
});

// Download type selection handler
document.querySelectorAll('.download-type').forEach(button => {
    button.addEventListener('click', async () => {
        if (!videoUrl.value || !formatSelect.value) {
            errorAlert.textContent = 'Please select a format before downloading';
            errorAlert.classList.remove('d-none');
            return;
        }
        
        const formData = new FormData();
        formData.append('url', videoUrl.value);
        formData.append('format', formatSelect.value);
        formData.append('type', button.dataset.type);

        try {
            loadingSpinner.classList.remove('d-none');
            downloadOptions.classList.add('d-none');

            const response = await fetch('/download', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process download');
            }

            // Create temporary link and trigger download
            const link = document.createElement('a');
            link.href = data.download_url;
            link.download = data.title;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            errorAlert.textContent = error.message;
            errorAlert.classList.remove('d-none');
        } finally {
            loadingSpinner.classList.add('d-none');
        }
    });
});

// Video preview handler
document.querySelector('.video-preview-container').addEventListener('click', () => {
    if (currentVideoUrl) {
        videoPlayer.src = currentVideoUrl;
        inlineVideoPlayer.classList.remove('d-none');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    //This is added to ensure that the elements are available when the functions are called.
});