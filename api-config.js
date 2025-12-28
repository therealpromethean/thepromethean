
(function() {
    'use strict';
    
  
    
    // Option 1: Auto-detect (recommended - works for both local and production)
    const hostname = window.location.hostname;
    let API_BASE_URL;
    
    // ============================================
    // PRODUCTION BACKEND URL
    // Set this to your Railway/production backend URL
    // ============================================
    const PRODUCTION_API_URL = 'https://thebackend-production.up.railway.app';
    
    // ============================================
    // CONFIGURATION OPTIONS
    // ============================================
    

    
    // Option B: Auto-detect (default - localhost uses local backend, production uses Railway)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {

        API_BASE_URL = PRODUCTION_API_URL;
    } else {
        // Production - use Railway backend
        API_BASE_URL = PRODUCTION_API_URL;
    }

    
    // ============================================
    // DO NOT MODIFY BELOW THIS LINE
    // ============================================
    
    // Set global API base URL
    window.API_BASE_URL = API_BASE_URL;
    
    // Also export as a constant for direct access
    window.API_CONFIG = {
        BASE_URL: API_BASE_URL,
        NEWS_ENDPOINT: `${API_BASE_URL}/api/v1/news`,
        COMMUNITY_ARTS_ENDPOINT: `${API_BASE_URL}/api/v1/community-arts`,
        YOUTUBE_VIDEO_ENDPOINT: `${API_BASE_URL}/api/v1/youtube-video`,
        CATEGORIES_ENDPOINT: {
            NEWS: `${API_BASE_URL}/api/v1/news-categories`,
            ARTS: `${API_BASE_URL}/api/v1/art-categories`
        }
    };
    
    // Logging removed for production
})();

