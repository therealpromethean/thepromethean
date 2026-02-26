
(function() {
    'use strict';
    
  
    
    let API_BASE_URL;
    
    // ============================================
    // PRODUCTION BACKEND URL
    // Set this to your Cloudflare Worker URL after deploying
    // Format: https://prometheans-backend.<your-subdomain>.workers.dev
    // ============================================
    const PRODUCTION_API_URL = 'https://prometheans-backend.therealpromethean.workers.dev';

    API_BASE_URL = PRODUCTION_API_URL;

    
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

