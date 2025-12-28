

(async () => {
    // Wait for PixiJS to load
    while (typeof PIXI === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Get Application and Assets from PIXI namespace
    const { Application, Assets, Sprite, AnimatedSprite, Graphics, Container, Text, TextStyle } = PIXI;

    // Global banda
    const GLOBAL_FONT_FAMILY = 'Finger Paint';
    const GLOBAL_FONT_FAMILY_WITH_FALLBACK = `"${GLOBAL_FONT_FAMILY}", sans-serif`;

    // Blaised animation speed (experiment with different values: 0.05 = slow, 0.1 = normal, 0.2 = fast, 0.5 = very fast)
    const BLAISED_ANIMATION_SPEED = 0.5;

    // Wait for all fonts to load properly before initializing PIXI.js
    async function ensureFontLoaded() {
        try {
            if (!document.fonts || !document.fonts.check) {
                // Font API not available
                return;
            }

            // Wait for fonts.ready with a reasonable timeout
            if (document.fonts.ready) {
                try {
                    await Promise.race([
                        document.fonts.ready,
                        new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
                    ]);
                } catch (e) {
                    // Error waiting for fonts.ready
                }
            }

            // Helper function to check font with multiple variations
            function checkFont(fontFamily) {
                return document.fonts.check(`1em "${fontFamily}"`) || 
                       document.fonts.check(`1em ${fontFamily}`) ||
                       document.fonts.check(`12px "${fontFamily}"`) ||
                       document.fonts.check(`12px ${fontFamily}`);
            }

            // Check if font is loaded
            let fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
            let attempts = 0;
            const maxAttempts = 30; // 3 seconds total (30 * 100ms)

            while (!fontLoaded && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                attempts++;
            }

            if (fontLoaded) {

            } else {
                // Font may not be loaded yet
                // Force a repaint to trigger font loading (only if body exists)
                if (document.body) {
                    try {
                        // Create a temporary element to force font loading
                        const testElement = document.createElement('span');
                        testElement.style.fontFamily = `"${GLOBAL_FONT_FAMILY}", sans-serif`;
                        testElement.style.position = 'absolute';
                        testElement.style.visibility = 'hidden';
                        testElement.style.opacity = '0';
                        testElement.textContent = 'test';
                        document.body.appendChild(testElement);

                        // Force layout calculation
                        testElement.offsetHeight;

                        // Wait a bit more for the font to load
                        await new Promise(resolve => setTimeout(resolve, 300));

                        // Check again
                        fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                        if (fontLoaded) {

                        }

                        document.body.removeChild(testElement);
                    } catch (e) {
                        // Could not force font loading
                    }
                }
            }
        } catch (error) {
            // Error in font loading
            // Don't block app initialization if font loading fails
        }
    }

    // Wait for fonts to load BEFORE initializing PIXI.js

    await ensureFontLoaded();

    // Create a new application
    const app = new Application();

    // Initialize the application (v8 requires async init)
    // Performance optimizations for slower GPUs:
    // - Lower resolution on slower devices
    // - Disable antialiasing for faster initialization
    const devicePixelRatio = window.devicePixelRatio || 1;
    // Cap resolution at 1.5x for better performance on slower devices
    const cappedResolution = Math.min(devicePixelRatio, 1.5);
    
    await app.init({
        background: 0x000000,
        backgroundAlpha: 1,
        resizeTo: window,
        resolution: cappedResolution,
        autoDensity: true,
        antialias: false, // Disable antialiasing for faster initialization
        powerPreference: 'high-performance', // Prefer dedicated GPU if available
    });

    // Ensure ticker continues even when tab is hidden
    app.ticker.stopOnMinimize = false;
    // Allow zIndex to control draw order
    app.stage.sortableChildren = true;

    // Append the application canvas to the container
    const container = document.getElementById('canvas-container');
    if (!container) {
        // Container element not found
        return;
    }

    container.appendChild(app.canvas);

    // CRITICAL: Force canvas resize to ensure proper dimensions on all hosts
    // This fixes sprite positioning issues on Hostinger and other hosting providers
    const ensureCanvasSize = () => {
        if (app && app.canvas) {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // Force resize if dimensions don't match
            if (app.screen.width !== windowWidth || app.screen.height !== windowHeight) {
                app.renderer.resize(windowWidth, windowHeight);

            }
        }
    };
    
    // Ensure canvas is properly sized immediately
    ensureCanvasSize();
    
    // Also ensure after a short delay (in case DOM isn't fully ready)
    setTimeout(ensureCanvasSize, 100);
    
    // Ensure on next frame (after browser layout)
    requestAnimationFrame(() => {
        ensureCanvasSize();
        // Also trigger resizeBackground if it exists
        if (typeof resizeBackground === 'function') {
            resizeBackground();
        }
    });

    // Background sprite and texture dimensions - Declare early to avoid TDZ errors
    let backgroundSprite;
    let mutatorBgSprite;
    let mutatorCapsuleSprite;
    let mutatorCapsuleStrokeSprite; // Stroke overlay for hover effect
    let mutatorCapsuleDot; // Pulsing dot at center
    let mutatorCapsuleCircleText; // Circle with "click to explore" text
    let mutatorCapsuleTextSprite; // Text "MUTATOR" that appears on mutator capsule hover
    let mutatorCapsuleLabelText; // Simple label text for mobile/tablet (just "Mutator")
    let cupSprite;
    let glitchSprite;
    let eyeLogoSprite;
    let boardSprite; // Bulletin board sprite (board.png)
    let boardTextSprite; // Text "NEWS" that appears on board hover
    let boardDot; // Pulsing dot at center of board
    let boardCircleText; // Circle with "click to explore" text for board
    let boardLabelText; // Simple label text for mobile/tablet (just "News")
    let boardStrokeSprite; // Stroke overlay for hover effect (board_stroke.png)
    let cctvSprite;
    let cctvTextSprite; // Text "X Account" that appears on CCTV hover
    let cctvDot; // Pulsing dot at center of CCTV
    let cctvCircleText; // Circle with "click to explore" text
    let discordSprite; // Discord animated sprite (discord1.png to discord8.png)
    let discordGlitchSound; // Audio for discord glitch effect
    let promoGlitchSound; // Audio for promo glitch effect
    let telegramGlitchSound; // Audio for telegram glitch effect
    let glitchSpriteGlitchSound; // Audio for glitch sprite glitch effect
    let wallArtPaperFlipSound; // Audio for wall art paper flip effect
    let lightSwitchSound; // Audio for light switch effect
    let bookMoveSound; // Audio for book move effect
    let cupMoveSound; // Audio for cup move effect
    let mutatorDotSound; // Audio for mutator dot hover effect
    let promoSprite; // Promo animated sprite (promo1.png to promo10.png)
    let telegramSprite; // Telegram animated sprite (telegram1.png to telegram9.png)
    let cctvStrokeSprite; // Animated stroke overlay for hover effect (cctv1_stroke.png to cctv3_stroke.png)
    let cctvLabelText; // Simple label text for mobile/tablet (just "X Account")
    let wallArtSprite; // Animated wall art sprite (wall_art1.png to wall_art6.png)
    let wallArtDot; // Pulsing dot at center of wall art
    let blaisedSprite; // Static blaised sprite (blaised1.png only)
    let blaisedAuraSprite; // Animated blaised aura sprite (blaised1_aura.png to blaised6_aura.png) with color dodge blending
    let blaisedAuraApp; // Separate PIXI application for aura sprite with CSS mix-blend-mode
    let blaisedBubbleContainer; // Comic bubble container for blaised sprite
    let blaisedAction2Sprite; // Animated blaised action2 sprite (blaised_action2_1.png, blaised_action2_2.png)
    let blaisedAction2AuraSprite; // Animated blaised action2 aura sprite with color dodge blending
    let blaisedAction2AuraApp; // Separate PIXI application for action2 aura sprite
    let blaisedAction3Sprite; // Animated blaised action3 sprite (blaised_action3_1.png)
    let blaisedAction3AuraSprite; // Animated blaised action3 aura sprite with color dodge blending
    let blaisedAction3AuraApp; // Separate PIXI application for action3 aura sprite
    let wallArtTextSprite; // Text "OUR TEAM" that appears on wall art hover
    let wallArtLabelText; // Simple label text for mobile/tablet (just "OUR TEAM")
    let wallArtStrokeSprite; // Animated stroke overlay for hover effect (wall_art1_stroke.png to wall_art6_stroke.png)
    let wallArtCircleText; // Circle with "click to explore" text
    let bookSprite; // Book sprite (book.png)
    let bookDot; // Pulsing dot at center of book
    let bookTextSprite; // Text "Community" that appears on book hover
    let bookLabelText; // Simple label text for mobile/tablet (just "Community")
    let bookStrokeSprite; // Stroke overlay for hover effect (book_stroke.png)
    let bookCircleText; // Circle with "click to explore" text
    let screenSprite; // Screen sprite (screen.png)
    let screenContainer; // Container for screen sprite
    let youtubeScreenVideo; // YouTube video iframe overlay
    let youtubeScreenVideoContainer; // Container wrapper for YouTube video
    let youtubePlayer; // YouTube IFrame API player object
    let hasUserInteracted = false; // Track if user has interacted with the page (required for YouTube unmute)
    let lightsOffSprite; // Lights off sprite with swinging animation
    let lightsSwitchSprite; // Lights switch sprite with swinging animation
    let lightsOffTexture; // Lights off texture (for toggling)
    let lightsOnTexture; // Lights on texture (for toggling)
    let lightsRaySprite; // Lights ray sprite with color dodge blending
    let lightsRayApp; // Separate PIXI application for lights ray with CSS mix-blend-mode
    let imageWidth = 1920;
    let imageHeight = 1080;
    
    // Original image dimensions that bg1X/bg1Y coordinates are based on
    // These are the dimensions before CDN optimization
    // When CDN optimizes images, the actual loaded dimensions may be different,
    // but we use these original dimensions for coordinate normalization
    const ORIGINAL_IMAGE_WIDTH = 5333;  // Original bg1.png width (actual original dimensions)
    const ORIGINAL_IMAGE_HEIGHT = 3558; // Original bg1.png height (actual original dimensions)

    // Panning/dragging state
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let advanceWallArtFrame = null; // Function to advance wall art animation frame
    let stopWallArtAnimation = null; // Function to stop wall art animation
    let spriteStart = { x: 0, y: 0 };
    let currentScale = 1;
    let wallArtLastPanPosition = { x: 0, y: 0 }; // Track last pan position for wall art animation
    let wallArtPanThreshold = 30; // Minimum pixels to pan before triggering frame change
    let wallArtAnimationTimeout = null; // Timeout to stop animation when movement stops
    let wallArtIsAnimating = false; // Track if wall art animation is currently playing

    // Global audio mute state for sprite sounds (no background music)
    let globalSpriteAudioMuted = false; // Start unmuted - sprite sounds enabled by default
    let isSpriteAudioUnlocked = false; // Track if audio has been unlocked by user interaction
    let unlockAttemptCount = 0; // Track unlock attempts to limit logging
    let lastUnlockAttemptTime = 0; // Throttle unlock attempts
    
    // Helper function to check if global audio is muted
    // Now only controls sprite sounds (background music removed)
    function isGlobalAudioMuted() {
        return globalSpriteAudioMuted;
    }
    
    // Function to unlock sprite sounds on first user interaction
    // Browsers require user interaction before audio can play
    function unlockSpriteAudio() {
        if (isSpriteAudioUnlocked) {
            return; // Already unlocked
        }
        
        // Throttle unlock attempts - only try once per 500ms
        const now = Date.now();
        if (now - lastUnlockAttemptTime < 500) {
            return; // Skip this attempt, too soon
        }
        lastUnlockAttemptTime = now;
        
        // Only log first few attempts to reduce console spam
        unlockAttemptCount++;
        if (unlockAttemptCount <= 3) {

        }
        
        // Try to unlock by playing and pausing one of the sprite sounds
        // This "unlocks" the audio context for all sounds
        const soundsToUnlock = [
            cupMoveSound,
            bookMoveSound,
            glitchSpriteGlitchSound,
            discordGlitchSound,
            promoGlitchSound,
            telegramGlitchSound,
            wallArtPaperFlipSound,
            lightSwitchSound,
            mutatorDotSound
        ];
        
        // Try to unlock with the first available sound
        for (const sound of soundsToUnlock) {
            if (sound && !sound.paused) {
                // Sound is already playing, consider it unlocked
                isSpriteAudioUnlocked = true;
                // Unmute YouTube video since audio is already active
                unmuteYouTubeVideo();
                return;
            }
        }
        
        // Try to unlock by playing and pausing - try ALL sounds until one works
        let unlockAttempted = false;
        for (const sound of soundsToUnlock) {
            if (sound && !unlockAttempted) {
                try {
                    sound.currentTime = 0;
                    const playPromise = sound.play();
                    if (playPromise !== undefined) {
                        unlockAttempted = true;
                        playPromise.then(() => {
                            sound.pause();
                            sound.currentTime = 0;
                            isSpriteAudioUnlocked = true;
                            
                            // Unmute YouTube video when audio is unlocked (user interaction occurred)
                            unmuteYouTubeVideo();

                        }).catch((error) => {
                            // AbortError is expected when play() is interrupted by pause()
                            // This is normal and not an actual error
                            if (error.name !== 'AbortError') {
                                // Only log non-AbortError failures
                                if (unlockAttemptCount <= 3) {
                                    // Error logging removed for cleaner console
                                }
                            }
                            // Still mark as unlocked if we got this far
                            isSpriteAudioUnlocked = true;
                            // Unmute YouTube video even if audio unlock had minor issues
                            unmuteYouTubeVideo();
                        });
                        return; // Only try one sound at a time
                    } else {
                        // Some browsers return undefined, try direct play
                        try {
                            unlockAttempted = true;
                            sound.play();
                            sound.pause();
                            sound.currentTime = 0;
                            isSpriteAudioUnlocked = true;
                            
                            // Unmute YouTube video when audio is unlocked
                            unmuteYouTubeVideo();

                            return;
                        } catch (e) {
                            // Continue to next sound - only log first few attempts
                            if (unlockAttemptCount <= 3) {

                            }
                        }
                    }
                } catch (e) {
                    // Continue to next sound - only log first few attempts
                    if (unlockAttemptCount <= 3) {

                    }
                }
            }
        }
        
        if (!unlockAttempted && unlockAttemptCount <= 3) {

        }
    }
    
    // Helper function to play sprite sound with automatic unlock
    // This ensures audio is unlocked before playing
    function playSpriteSound(sound, retryDelay = 50) {
        if (!sound) {

            return;
        }
        
        if (globalSpriteAudioMuted) {

            return;
        }
        
        // If audio already unlocked, just play immediately
        if (isSpriteAudioUnlocked) {

            sound.currentTime = 0;
            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {

                }).catch((error) => {
                    // AbortError is expected when play() is interrupted - ignore it
                    if (error.name !== 'AbortError') {
                        // Could not play sprite sound
                    }
                });
            } else {
                // Some browsers return undefined, try direct play
                try {
                    sound.play();

                } catch (e) {
                    // Direct play failed
                }
            }
            return;
        }
        
        // Audio not unlocked yet - CANNOT play on hover
        // Browsers require a user gesture (click/touch/keypress) to unlock audio
        // Hover (pointerenter) is NOT a valid gesture, so we can't unlock here

        // Don't try to unlock here - it will fail on hover events
        // Audio will unlock on first click/touch/keypress via document listeners above
    }
    
    // Function to sync all glitch sounds with global mute state
    function syncGlitchSoundsMuteState() {
        const isMuted = isGlobalAudioMuted();
        if (discordGlitchSound) {
            discordGlitchSound.muted = isMuted;
        }
        if (promoGlitchSound) {
            promoGlitchSound.muted = isMuted;
        }
        if (telegramGlitchSound) {
            telegramGlitchSound.muted = isMuted;
        }
        if (glitchSpriteGlitchSound) {
            glitchSpriteGlitchSound.muted = isMuted;
        }
        if (wallArtPaperFlipSound) {
            wallArtPaperFlipSound.muted = isMuted;
        }
        if (lightSwitchSound) {
            lightSwitchSound.muted = isMuted;
        }
        if (bookMoveSound) {
            bookMoveSound.muted = isMuted;
        }
        if (mutatorDotSound) {
            mutatorDotSound.muted = isMuted;
        }
        if (cupMoveSound) {
            cupMoveSound.muted = isMuted;
        }
    }

    // Global references for audio state and update function
    let globalAudioState = {
        userManuallyToggled: false, // Track if user manually clicked the audio icon
        updateIcon: null
    };

    // Function to enable sprite sounds when sprite is interacted with
    // Automatically enables sprite sounds when user interacts with any sprite
    // BUT: If user manually muted audio, don't auto-enable (respect user's choice)
    // Sprite interactions (hover/touch) ARE user interactions, so we can unlock audio immediately
    function enableAudioOnSpriteInteraction(soundToUnlock = null) {
        // Unlock audio immediately on sprite interaction (sprite hover/touch IS a user interaction)
        // If a specific sound is provided, use it to unlock (more reliable)
        if (!isSpriteAudioUnlocked) {
            const soundsToTry = soundToUnlock ? [soundToUnlock] : [
                cupMoveSound,
                bookMoveSound,
                glitchSpriteGlitchSound,
                discordGlitchSound,
                promoGlitchSound,
                telegramGlitchSound,
                wallArtPaperFlipSound,
                lightSwitchSound,
                mutatorDotSound
            ];
            
            // Try to unlock with ALL available sounds in parallel for better success rate
            let unlockAttempted = false;
            for (const sound of soundsToTry) {
                if (sound && !unlockAttempted) {
                    try {
                        // Try to unlock by playing and pausing
                        sound.currentTime = 0;
                        const unlockPromise = sound.play();
                        if (unlockPromise !== undefined) {
                            unlockAttempted = true;
                            unlockPromise.then(() => {
                                sound.pause();
                                sound.currentTime = 0;
                                isSpriteAudioUnlocked = true;

                            }).catch((error) => {
                                // If this fails, try the unlockSpriteAudio function as fallback

                                unlockSpriteAudio();
                            });
                            break; // Only try one sound at a time
                        }
                    } catch (e) {
                        // Continue to next sound

                    }
                }
            }
            
            // If no sound worked, try the main unlock function as fallback
            if (!unlockAttempted && !isSpriteAudioUnlocked) {

                unlockSpriteAudio();
            }
        }

        // Enable sprite sounds automatically on sprite interaction (unless user explicitly muted)
        // Only respect manual mute if user has explicitly toggled it to muted state
        // At page start, sounds should be enabled by default when pointing at sprites
        if (globalSpriteAudioMuted) {
            // Only keep muted if user explicitly toggled it to muted
            // Otherwise, enable sounds when pointing at sprites
            if (globalAudioState && globalAudioState.userManuallyToggled && globalSpriteAudioMuted) {
                // User explicitly muted - respect their choice

            } else {
                // Enable sprite sounds automatically on sprite interaction

                globalSpriteAudioMuted = false;
                syncGlitchSoundsMuteState();
                // Update icon to reflect new state
                if (globalAudioState && globalAudioState.updateIcon) {
                    globalAudioState.updateIcon();

                }
            }
        } else {
            // Sounds are already enabled - ensure they're unlocked

        }
    }

    // Initialize audio control (sprite sounds only - no background music)
    // Wait a bit to ensure DOM is ready
    setTimeout(() => {
        initAudioControl();
    }, 100);

    function initAudioControl() {
        const audioControl = document.getElementById('audio-control');
        const audioIconUnmuted = document.getElementById('audio-icon-unmuted');
        const audioIconMuted = document.getElementById('audio-icon-muted');
        
        // Preload the audio icon images
        if (audioIconUnmuted) {
            audioIconUnmuted.onload = () => audioIconUnmuted.onerror = () => { /* Failed to load audio_on.png */ };
        }
        if (audioIconMuted) {
            audioIconMuted.onload = () => audioIconMuted.onerror = () => { /* Failed to load audio_off.png */ };
        }
        
        if (!audioControl) {
            // Audio control element not found
            return;
        }

        // Initialize global audio state (sprite sounds only)
        globalAudioState.userManuallyToggled = false; // User hasn't manually toggled yet
        
        // Keep audio control hidden until loading screen finishes (CSS handles this with display: none)

        // Function to update icon display based on sprite sounds mute state
        function updateIcon() {
            if (audioIconUnmuted && audioIconMuted) {
                if (globalSpriteAudioMuted) {
                    // Show muted icon
                    audioIconUnmuted.style.display = 'none';
                    audioIconMuted.style.display = 'block';
                    audioControl.classList.add('muted');
                } else {
                    // Show unmuted icon
                    audioIconUnmuted.style.display = 'block';
                    audioIconMuted.style.display = 'none';
                    audioControl.classList.remove('muted');
                }
            }
        }
        
        // Store updateIcon reference in global state so enableAudioOnSpriteInteraction can call it
        globalAudioState.updateIcon = updateIcon;
        
        // Set initial icon state (sprite sounds start enabled/unmuted)
        updateIcon();

        // Function to toggle sprite sounds mute/unmute
        function toggleAudio(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            // Mark that user manually toggled audio
            globalAudioState.userManuallyToggled = true;
            
            // Toggle sprite sounds mute state
            globalSpriteAudioMuted = !globalSpriteAudioMuted;
            
            // Sync all sprite sounds with the new mute state
            syncGlitchSoundsMuteState();
            
            // Sync YouTube video mute state with global audio mute state
            syncYouTubeVideoMuteState();
            
            // Update icon
            updateIcon();

        }

        // Click handler for audio control - use flags to prevent double-triggering
        // Both click and touchstart can fire, or click can fire multiple times
        let clickHandled = false;
        audioControl.addEventListener('click', (e) => {
            if (!clickHandled) {
                clickHandled = true;
                toggleAudio(e);
                setTimeout(() => {
                    clickHandled = false;
                }, 300);
            }
        });
        
        // For touch devices, use touchstart but prevent default to avoid double-trigger
        let touchHandled = false;
        audioControl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!touchHandled) {
                touchHandled = true;
                toggleAudio(e);
                setTimeout(() => {
                    touchHandled = false;
                }, 300);
            }
        });
        
        // Make sure pointer events work
        audioControl.style.pointerEvents = 'auto';
        audioControl.style.cursor = 'pointer';
        
        // Unlock sprite audio on first user interaction with the page
        // This allows sprite sounds to play immediately when sprites are hovered/touched
        const unlockOnInteraction = () => {
            unlockSpriteAudio();
        };
        
        // CRITICAL: Unlock audio on FIRST click/touch/keypress anywhere on page
        // These are the ONLY events browsers accept as valid user gestures for audio unlock
        // Mouse movement is NOT accepted by browsers, so we MUST use click/touch/keypress
        const unlockOnFirstInteraction = () => {
            // Mark that user has interacted - required for YouTube unmute
            hasUserInteracted = true;
            
            if (!isSpriteAudioUnlocked) {
                unlockSpriteAudio();
            }
            // Unmute YouTube video on user interaction (after user gesture, browser allows unmuting)
            unmuteYouTubeVideo();
        };
        
        // Unlock on various user interactions (use capture phase to catch early)
        // These are the ONLY reliable ways to unlock audio in browsers
        document.addEventListener('mousedown', unlockOnFirstInteraction, { once: true, capture: true });
        document.addEventListener('mouseup', unlockOnFirstInteraction, { once: true, capture: true });
        document.addEventListener('click', unlockOnFirstInteraction, { once: true, capture: true });
        document.addEventListener('touchstart', unlockOnFirstInteraction, { once: true, capture: true });
        document.addEventListener('touchend', unlockOnFirstInteraction, { once: true, capture: true });
        document.addEventListener('keydown', unlockOnFirstInteraction, { once: true, capture: true });
        document.addEventListener('pointerdown', unlockOnFirstInteraction, { once: true, capture: true });
        
        // Also keep the old unlockOnInteraction for compatibility
        document.addEventListener('mousedown', unlockOnInteraction, { once: true, capture: true });
        document.addEventListener('mouseup', unlockOnInteraction, { once: true, capture: true });
        document.addEventListener('click', unlockOnInteraction, { once: true, capture: true });
        document.addEventListener('touchstart', unlockOnInteraction, { once: true, capture: true });
        document.addEventListener('touchend', unlockOnInteraction, { once: true, capture: true });
        document.addEventListener('keydown', unlockOnInteraction, { once: true, capture: true });
        document.addEventListener('pointerdown', unlockOnInteraction, { once: true, capture: true });
        
        // CRITICAL: Unlock on mouse movement - keep trying until it works
        // This must happen BEFORE user hovers over sprites
        // Some browsers allow audio unlock on mouse movement (user gesture)
        // IMPORTANT: Don't use { once: true } - keep trying on every movement until unlock succeeds
        const unlockOnMouseMove = (e) => {
            if (!isSpriteAudioUnlocked) {
                // Try to unlock immediately - this is a user gesture
                // Logging removed to reduce console spam
                unlockSpriteAudio();
            }
        };
        // Use capture phase and make it high priority - catch movement as early as possible
        // Keep listeners active (no once: true) so they keep trying until unlock succeeds
        document.addEventListener('mousemove', unlockOnMouseMove, { capture: true, passive: true });
        window.addEventListener('mousemove', unlockOnMouseMove, { capture: true, passive: true });
        
        // Also try on pointermove (works for both mouse and touch)
        const unlockOnPointerMove = (e) => {
            if (!isSpriteAudioUnlocked) {
                // Logging removed to reduce console spam
                unlockSpriteAudio();
            }
        };
        document.addEventListener('pointermove', unlockOnPointerMove, { capture: true, passive: true });
        window.addEventListener('pointermove', unlockOnPointerMove, { capture: true, passive: true });
        
        // Also try to unlock when canvas receives any pointer event (more reliable)
        // This catches interactions with the PixiJS canvas - CRITICAL for hover sounds
        const unlockOnCanvasInteraction = (e) => {
            if (!isSpriteAudioUnlocked) {
                // Logging removed to reduce console spam
                unlockSpriteAudio();
            }
        };
        
        // More aggressive unlock - try on EVERY mouse movement until it works
        const unlockOnCanvasMove = (e) => {
            if (!isSpriteAudioUnlocked) {
                // Logging removed to reduce console spam
                unlockSpriteAudio();
            }
        };
        
        // Wait for app to be ready, then add canvas listeners immediately
        // Try multiple times in case app isn't ready yet
        const setupCanvasUnlock = () => {
            if (typeof app !== 'undefined' && app && app.canvas) {

                // Add listeners for mouse/pointer movement over canvas - THIS IS KEY!
                // Movement over canvas should unlock audio before user hovers sprites
                // IMPORTANT: Keep listeners active (no once: true) so they keep trying until unlock succeeds
                app.canvas.addEventListener('mousemove', unlockOnCanvasMove, { passive: true });
                app.canvas.addEventListener('pointermove', unlockOnCanvasMove, { passive: true });
                // Also add for click/touch (these definitely work as fallback)
                app.canvas.addEventListener('mousedown', unlockOnCanvasInteraction, { once: true, passive: true });
                app.canvas.addEventListener('pointerdown', unlockOnCanvasInteraction, { once: true, passive: true });
                app.canvas.addEventListener('touchstart', unlockOnCanvasInteraction, { once: true, passive: true });
                // Also add pointerenter to canvas - when mouse enters canvas area, unlock audio
                app.canvas.addEventListener('pointerenter', unlockOnCanvasInteraction, { once: true, passive: true });
                app.canvas.addEventListener('mouseenter', unlockOnCanvasInteraction, { once: true, passive: true });
                return true; // Success
            }
            return false; // Not ready yet
        };
        
        // Try immediately (app might already be ready)
        if (!setupCanvasUnlock()) {
            // If not ready, try after a very short delay
            setTimeout(() => {
                if (!setupCanvasUnlock()) {
                    // Try again after longer delay
                    setTimeout(setupCanvasUnlock, 500);
                }
            }, 50);
        }
        
        // Also try when app canvas is added to DOM
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            // Watch for canvas being added
            const observer = new MutationObserver(() => {
                if (app && app.canvas && !isSpriteAudioUnlocked) {
                    setupCanvasUnlock();
                }
            });
            observer.observe(canvasContainer, { childList: true });
        }

        // Fallback: Show audio control after 5 seconds if loading screen hasn't shown it yet
        // This ensures it appears even if loading screen logic doesn't trigger
        // Only show if loading screen is not active
        setTimeout(() => {
            // Check if loading screen is still active
            const isLoadingScreenActive = loadingScreen && loadingScreenAlpha > 0 && loadingScreen.visible;
            if (!isLoadingScreenActive) {
            const audioControlCheck = document.getElementById('audio-control');
            if (audioControlCheck && !audioControlCheck.classList.contains('visible')) {
                audioControlCheck.classList.add('visible');

                }
            }
        }, 5000);

        // Also show when page is fully loaded (DOMContentLoaded)
        // Only show if loading screen is not active
        if (document.readyState === 'complete') {
            setTimeout(() => {
                // Check if loading screen is still active
                const isLoadingScreenActive = loadingScreen && loadingScreenAlpha > 0 && loadingScreen.visible;
                if (!isLoadingScreenActive) {
                const audioControlCheck = document.getElementById('audio-control');
                if (audioControlCheck && !audioControlCheck.classList.contains('visible')) {
                    audioControlCheck.classList.add('visible');

                    }
                }
            }, 2000);
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    // Check if loading screen is still active
                    const isLoadingScreenActive = loadingScreen && loadingScreenAlpha > 0 && loadingScreen.visible;
                    if (!isLoadingScreenActive) {
                    const audioControlCheck = document.getElementById('audio-control');
                    if (audioControlCheck && !audioControlCheck.classList.contains('visible')) {
                        audioControlCheck.classList.add('visible');

                        }
                    }
                }, 2000);
            });
        }

    }

    // Handle window resize to reposition all sprites (including Discord and Promo)
    // This ensures sprites stay fixed relative to the background when window is resized
    let resizeTimeout;
    const handleResize = () => {
        // Debounce resize events to avoid excessive calls
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Call resizeBackground to reposition all sprites including Discord and Promo
            resizeBackground();
        }, 100);
    };

    window.addEventListener('resize', handleResize);

  //sticky ket full screen
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    const handleFullscreenChange = () => {

        // RAF Calllsssssss
        let attempts = 0;
        const maxAttempts = 20;

        const checkDimensions = () => {
            const currentWidth = window.innerWidth;
            const currentHeight = window.innerHeight;

            if (currentWidth !== lastWidth || currentHeight !== lastHeight || attempts >= maxAttempts) {

                lastWidth = currentWidth;
                lastHeight = currentHeight;

                if (backgroundSprite) {
                    backgroundSprite.x = currentWidth / 2;
                    backgroundSprite.y = currentHeight / 2;
                }

                resizeBackground();
            } else {
                // check ulit
                attempts++;
                requestAnimationFrame(checkDimensions);
            }
        };

        // Start checking after browser updates dimensions (multiple RAF for fullscreen)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(checkDimensions);
            });
        });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Also handle orientation changes on mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            resizeBackground();
        }, 200); // Delay to allow orientation change to complete
    });

    // Add click handler and hover animation to main logo
    const mainLogo = document.getElementById('main-logo');
    const mainLogoClosed = document.getElementById('main-logo-closed');
    const logoWrapper = document.getElementById('logo-wrapper');

    if (mainLogo && mainLogoClosed && logoWrapper) {
        mainLogo.style.cursor = 'pointer'; // Show pointer cursor on hover

        // Preload the closed logo image to ensure smooth transition
        const closedImg = new Image();
        closedImg.src = '/assets/main_logo_closed.png';

        // Handle pointer enter - animate to closed state
        logoWrapper.addEventListener('pointerenter', () => {
            if (mainLogo && mainLogoClosed) {
                mainLogo.style.opacity = '0';
                mainLogoClosed.style.opacity = '1';
            }
        });

        // Handle pointer leave - animate back to open state
        logoWrapper.addEventListener('pointerleave', () => {
            if (mainLogo && mainLogoClosed) {
                mainLogo.style.opacity = '1';
                mainLogoClosed.style.opacity = '0';
            }
        });

        // Click handler - reload the page
        logoWrapper.addEventListener('click', () => {

            window.location.reload(); // Reload the page to restart the app
        });
    }

    const isMobileOrTablet = () => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
        const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent.toLowerCase());
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        // wideee
        const isSmallScreen = window.innerWidth <= 1024;
        return isMobile || isTablet || (hasTouchScreen && isSmallScreen);
    };

    // Makha
    window.isMobileOrTablet = isMobileOrTablet;

    let globalMutatorCapsuleSprite = null;

    // Track if page has fully loaded (to distinguish initial load from tab switching)
    let pageFullyLoaded = false;
    window.addEventListener('load', () => {
        pageFullyLoaded = true;
    });

    // Handle page visibility to keep animations running when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // Tab became visible - ensure ticker is running
            if (app.ticker) {
                if (!app.ticker.started) {
                    app.ticker.start();
                }
            }

            // Hide loading screen if it's visible (user returning from new tab)
            // Only hide if page was already fully loaded AND assets are loaded
            if (pageFullyLoaded) {
                // Only hide if assets are fully loaded
                if (assetLoadingProgress >= 1.0) {
                    // Hide PixiJS loading screen if exists
                    if (loadingScreen && loadingScreen.visible && loadingScreenAlpha > 0) {

                        loadingScreen.visible = false;
                        loadingScreenAlpha = 0;
                        if (loadingScreen.parent) {
                            app.stage.removeChild(loadingScreen);
                        }
                        // Show audio control
                        const audioControl = document.getElementById('audio-control');
                        if (audioControl) {
                            audioControl.classList.add('visible');
                        }
                    }
                } else {
                    // Loading screen animation is still in progress, let it continue

                }

                // Hide HTML redirect loading screen if exists
                const htmlLoadingScreen = document.getElementById('redirectLoadingScreen');
                if (htmlLoadingScreen && !htmlLoadingScreen.classList.contains('hidden')) {

                    htmlLoadingScreen.classList.add('hidden');
                    setTimeout(() => {
                        if (htmlLoadingScreen.parentNode) {
                            htmlLoadingScreen.parentNode.removeChild(htmlLoadingScreen);
                        }
                    }, 300);
                }
            }

            // Resume all paused animations (AnimatedSprite only)
            const animatedSprites = [
                globalMutatorCapsuleSprite,
                backgroundSprite,
                glitchSprite,
                cctvSprite,
                discordSprite,
                promoSprite,
                telegramSprite,
                wallArtSprite,
                blaisedSprite,
                blaisedAuraSprite
            ];

            animatedSprites.forEach(sprite => {
                if (sprite) {
                    // Force play even if already playing to ensure it's active
                    if (sprite.playing === false) {
                        sprite.play();
                    }
                    // Ensure sprite is visible and active
                    if (sprite.visible === false && sprite !== glitchSprite) {
                        // Don't force visibility for glitch sprite as it's conditionally visible
                        sprite.visible = true;
                    }
                }
            });

            // Force render to refresh display
            if (app.renderer) {
                app.renderer.render(app.stage);
            }

        } else {
            // Tab became hidden - ensure animations continue running
            // Don't pause ticker when tab is hidden (stopOnMinimize is already false)
            if (app.ticker && !app.ticker.started) {
                app.ticker.start();
            }

            // Ensure all animated sprites continue playing (AnimatedSprite only)
            const animatedSprites = [
                globalMutatorCapsuleSprite,
                backgroundSprite,
                glitchSprite,
                cctvSprite,
                discordSprite,
                promoSprite,
                telegramSprite,
                wallArtSprite,
                blaisedSprite,
                blaisedAuraSprite
            ];

            animatedSprites.forEach(sprite => {
                if (sprite && sprite.playing === false) {
                    sprite.play();
                }
            });
        }
    });

    // Also handle window focus for better compatibility
    window.addEventListener('focus', () => {
        if (app.ticker) {
            if (!app.ticker.started) {
                app.ticker.start();
            }
        }

        // Hide loading screen if visible when window regains focus
        // Only hide if assets are fully loaded
        if (pageFullyLoaded) {
            // Only hide if assets are mostly loaded (90% or more)
            if (assetLoadingProgress >= 0.9) {
                    // Hide PixiJS loading screen if exists
                    if (loadingScreen && loadingScreen.visible && loadingScreenAlpha > 0) {

                        loadingScreen.visible = false;
                        loadingScreenAlpha = 0;
                        if (loadingScreen.parent) {
                            app.stage.removeChild(loadingScreen);
                        }
                        // Show audio control
                        const audioControl = document.getElementById('audio-control');
                        if (audioControl) {
                            audioControl.classList.add('visible');
                        }
                    }
            } else {
                // Loading screen animation is still in progress, let it continue

            }

            // Hide HTML redirect loading screen if exists
            const htmlLoadingScreen = document.getElementById('redirectLoadingScreen');
            if (htmlLoadingScreen && !htmlLoadingScreen.classList.contains('hidden')) {

                htmlLoadingScreen.classList.add('hidden');
                setTimeout(() => {
                    if (htmlLoadingScreen.parentNode) {
                        htmlLoadingScreen.parentNode.removeChild(htmlLoadingScreen);
                    }
                }, 300);
            }
        }

            // Resume all paused animations (AnimatedSprite only)
            const animatedSprites = [
                globalMutatorCapsuleSprite,
                backgroundSprite,
                glitchSprite,
                cctvSprite,
                discordSprite,
                promoSprite,
                telegramSprite,
                wallArtSprite,
                blaisedSprite,
                blaisedAuraSprite
            ];

            animatedSprites.forEach(sprite => {
                if (sprite && sprite.playing === false) {
                    sprite.play();
                }
            });

        // Force render to refresh display
        if (app.renderer) {
            app.renderer.render(app.stage);
        }

    });

    // Loading screen variables
    // DISABLE INTRO LOADING SCREEN FOR DEBUGGING - set to true to enable
    const ENABLE_INTRO_LOADING_SCREEN = true;

    let loadingScreen;
    let loadingScreenAlpha = 1;
    let loadingScreenResizeHandler = null; // Store resize handler reference for cleanup
    let loadingScreenStartTime = null; // Track when loading screen was created for minimum display time
    
    // Progress bar variables
    let progressBarContainer;
    let progressBarBg;
    let progressBarFill;
    let assetLoadingProgress = 0; // 0 to 1
    let totalAssetsToLoad = 0;
    let loadedAssetsCount = 0;
    let progressBarWidth = 0; // Store for resize

    // Function to update progress bar
    function updateProgressBar(progress) {
        if (!progressBarFill || !progressBarContainer) return;
        
        assetLoadingProgress = Math.min(1, Math.max(0, progress));
        
        // Calculate current width based on progress
        const currentWidth = progressBarWidth * assetLoadingProgress;
        
        // Update progress bar fill - always draw, even if 0 width (for smooth updates)
        progressBarFill.clear();
        if (currentWidth > 0) {
            progressBarFill.roundRect(-progressBarWidth / 2, -2, currentWidth, 4, 2);
            progressBarFill.fill({ color: 0xFFFFFF, alpha: 0.9 });
        }
        
        // Log progress for debugging (only at key milestones to avoid spam)
        const progressPercent = Math.round(assetLoadingProgress * 100);
        if (progressPercent % 10 === 0 || progressPercent === 100) {

        }
    }

    // Wrapper for Assets.load that tracks progress
    async function loadAssetWithProgress(url) {
        try {
            const texture = await Assets.load(url);
            loadedAssetsCount++;
            const progress = totalAssetsToLoad > 0 ? loadedAssetsCount / totalAssetsToLoad : 0;
            updateProgressBar(progress);
            return texture;
        } catch (error) {
            // Enhanced error logging for debugging on Linux servers (case-sensitive file systems)
            // Failed to load asset
            // Still increment count to avoid progress getting stuck
            loadedAssetsCount++;
            const progress = totalAssetsToLoad > 0 ? loadedAssetsCount / totalAssetsToLoad : 0;
            updateProgressBar(progress);
            throw error;
        }
    }

    // Load multiple assets in parallel for faster loading
    // Uses Promise.allSettled to continue loading even if some assets fail
    async function loadAssetsInParallel(urls) {
        const promises = urls.map(async (url) => {
            try {
                return await loadAssetWithProgress(url);
            } catch (error) {
                // CRITICAL: Failed to load asset
                // Return null for failed assets so Promise.allSettled doesn't stop everything
                return null;
            }
        });
        
        const results = await Promise.allSettled(promises);
        const textures = results.map((result, index) => {
            if (result.status === 'fulfilled' && result.value !== null) {
                return result.value;
            } else {
                const url = urls[index];
                // Asset loading failed
                return null;
            }
        });
        
        // Filter out null values and log summary
        const successful = textures.filter(t => t !== null).length;
        const failed = textures.length - successful;
        if (failed > 0) {
            // Some assets failed to load
        } else {

        }
        
        return textures.filter(t => t !== null);
    }

    // Create loading screen with progress bar only
    async function createLoadingScreen() {
        try {
            // Record when loading screen starts
            loadingScreenStartTime = Date.now();
            
            // Hide header logo during loading screen
            const mainLogo = document.getElementById('main-logo');
            const headerLogoContainer = document.getElementById('logo-container');
            if (mainLogo) mainLogo.style.display = 'none';
            if (headerLogoContainer) headerLogoContainer.style.display = 'none';
            
            // Hide audio control during loading screen
            const audioControl = document.getElementById('audio-control');
            if (audioControl) {
                audioControl.classList.remove('visible');

            }

            // Create loading screen container
            loadingScreen = new Container();
            loadingScreen.zIndex = 9999; // Always on top during loading

            // Create pure black background
            const blackBg = new Graphics();
            blackBg.rect(0, 0, app.screen.width, app.screen.height);
            blackBg.fill({ color: 0x000000 }); // Pure black
            loadingScreen.addChild(blackBg);

            // Create progress bar - centered on screen
            // Progress bar width: responsive based on screen size
            progressBarWidth = Math.min(app.screen.width, app.screen.height) * 0.4; // 40% of smaller dimension
            const progressBarHeight = 4; // Thin progress bar
            const progressBarY = app.screen.height / 2; // Center vertically

            // Progress bar container
            progressBarContainer = new Container();
            progressBarContainer.x = app.screen.width / 2; // Center horizontally
            progressBarContainer.y = progressBarY; // Center vertically

            // Progress bar background (gray)
            progressBarBg = new Graphics();
            progressBarBg.roundRect(-progressBarWidth / 2, -progressBarHeight / 2, progressBarWidth, progressBarHeight, 2);
            progressBarBg.fill({ color: 0x333333, alpha: 0.5 }); // Semi-transparent dark gray
            progressBarContainer.addChild(progressBarBg);

            // Progress bar fill (white)
            progressBarFill = new Graphics();
            progressBarFill.roundRect(-progressBarWidth / 2, -progressBarHeight / 2, 0, progressBarHeight, 2);
            progressBarFill.fill({ color: 0xFFFFFF, alpha: 0.9 }); // White with slight transparency
            progressBarContainer.addChild(progressBarFill);

            loadingScreen.addChild(progressBarContainer);

            // Initialize progress bar to 0%
            updateProgressBar(0);

            app.stage.addChild(loadingScreen);

            // Update loading screen alpha for fade out
            app.ticker.add(() => {
                if (!loadingScreen || loadingScreenAlpha <= 0) return;
                if (loadingScreenAlpha > 0) {
                    loadingScreen.alpha = loadingScreenAlpha;
                }
            });

            // Function to resize loading screen
            const resizeLoadingScreen = () => {
                // Check if loading screen still exists and hasn't been destroyed
                if (!loadingScreen || !loadingScreen.parent || loadingScreen.destroyed) {
                    return;
                }
                if (blackBg && !blackBg.destroyed) {
                    // Resize black background
                    blackBg.clear();
                    blackBg.rect(0, 0, app.screen.width, app.screen.height);
                    blackBg.fill({ color: 0x000000 });

                    // Update progress bar position and size
                    if (progressBarContainer && !progressBarContainer.destroyed) {
                        // Recalculate progress bar width based on new screen size
                        progressBarWidth = Math.min(app.screen.width, app.screen.height) * 0.4; // 40% of smaller dimension
                        const progressBarY = app.screen.height / 2; // Center vertically
                        progressBarContainer.x = app.screen.width / 2; // Center horizontally
                        progressBarContainer.y = progressBarY;

                        // Resize progress bar background
                        if (progressBarBg && !progressBarBg.destroyed) {
                            progressBarBg.clear();
                            progressBarBg.roundRect(-progressBarWidth / 2, -2, progressBarWidth, 4, 2);
                            progressBarBg.fill({ color: 0x333333, alpha: 0.5 });
                        }

                        // Resize progress bar fill (maintain current progress)
                        if (progressBarFill && !progressBarFill.destroyed) {
                            const currentWidth = progressBarWidth * assetLoadingProgress;
                            progressBarFill.clear();
                            if (currentWidth > 0) {
                                progressBarFill.roundRect(-progressBarWidth / 2, -2, currentWidth, 4, 2);
                                progressBarFill.fill({ color: 0xFFFFFF, alpha: 0.9 });
                            }
                        }
                    }
                }
            };

            // Update on resize
            loadingScreenResizeHandler = resizeLoadingScreen;
            window.addEventListener('resize', loadingScreenResizeHandler);

        } catch (error) {
            // Error creating loading screen
        }
    }

    // Function to fade out loading screen
    function fadeOutLoadingScreen() {
        if (!loadingScreen || !loadingScreen.parent) return;

        // Ensure progress bar shows actual progress before fading out
        // Show actual progress (not forced to 100% unless very close)
        if (assetLoadingProgress >= 0.95) {
            updateProgressBar(1.0); // Show 100% if 95%+ loaded
        } else {
            updateProgressBar(assetLoadingProgress); // Show actual progress
        }

        const fadeSpeed = 0.03;
        const fadeInterval = setInterval(() => {
            loadingScreenAlpha -= fadeSpeed;
            if (loadingScreenAlpha <= 0) {
                loadingScreenAlpha = 0;
                loadingScreen.visible = false;
                if (loadingScreen.parent) {
                    // Remove resize listener before destroying
                    if (loadingScreenResizeHandler) {
                        window.removeEventListener('resize', loadingScreenResizeHandler);
                        loadingScreenResizeHandler = null;
                    }
                    app.stage.removeChild(loadingScreen);
                    loadingScreen.destroy({ children: true });
                    loadingScreen = null;
                }
                clearInterval(fadeInterval);

                // Show header logo again after loading screen fades out
                const mainLogo = document.getElementById('main-logo');
                const headerLogoContainer = document.getElementById('logo-container');
                if (headerLogoContainer) {
                    headerLogoContainer.style.display = ''; // Reset display property
                    headerLogoContainer.style.opacity = '1';
                    headerLogoContainer.style.visibility = 'visible';
                }
                if (mainLogo) mainLogo.style.display = '';

                // Show audio control after loading screen finishes
                const audioControl = document.getElementById('audio-control');
                if (audioControl) {
                    audioControl.classList.add('visible');

                }

                // Show instruction animation after loading screen fades out
                showInstructionAnimation();
                
                // Show YouTube embed after loading screen finishes
                if (youtubeScreenVideoContainer && screenContainer && screenContainer.userData && screenContainer.userData.config) {
                    const screenConfig = screenContainer.userData.config;
                    if (backgroundSprite && backgroundSprite.scale) {
                        updateYouTubeVideoPosition(screenContainer, screenConfig, backgroundSprite.scale.x);
                    }
                }
            }
        }, 16); // ~60fps
    }

    // Instruction animation variables
    let instructionContainer = null;
    let instructionAlpha = 1.0;
    let instructionAnimationId = null;
    let instructionResizeHandler = null;
    let isInstructionFading = false;
    let instructionOverlayApp = null;
    let instructionOverlayContainer = null;

    // Helper to get the app used for instructions (overlay app if available)
    function getInstructionApp() {
        return instructionOverlayApp || app;
    }

    // Ensure a transparent overlay app (separate canvas) exists above DOM overlays like YouTube
    async function ensureInstructionOverlayApp() {
        if (instructionOverlayApp) {
            instructionOverlayApp.renderer.resize(window.innerWidth, window.innerHeight);
            return instructionOverlayApp;
        }

        // Create overlay container
        instructionOverlayContainer = document.createElement('div');
        instructionOverlayContainer.id = 'instruction-overlay';
        Object.assign(instructionOverlayContainer.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // Do not block interactions
            zIndex: '10000' // Above YouTube container (999) and canvas
        });
        document.body.appendChild(instructionOverlayContainer);

        // Create transparent PIXI app for overlay
        instructionOverlayApp = new PIXI.Application();
        await instructionOverlayApp.init({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
        });
        instructionOverlayApp.stage.sortableChildren = true;
        instructionOverlayContainer.appendChild(instructionOverlayApp.canvas);
        if (instructionOverlayApp.canvas && instructionOverlayApp.canvas.style) {
            instructionOverlayApp.canvas.style.pointerEvents = 'none';
        }

        return instructionOverlayApp;
    }

    // Function to detect scrollable directions
    function detectScrollableDirections() {
        const viewportWidth = app.screen.width;
        const viewportHeight = app.screen.height;

        // Get actual content dimensions (background sprite displayed size)
        let contentWidth = viewportWidth;
        let contentHeight = viewportHeight;

        if (backgroundSprite) {
            const scale = currentScale || 1;
            contentWidth = imageWidth * scale;
            contentHeight = imageHeight * scale;
        }

        // Determine which directions need scrolling
        const needsHorizontalScroll = contentWidth > viewportWidth;
        const needsVerticalScroll = contentHeight > viewportHeight;

        return {
            horizontal: needsHorizontalScroll,
            vertical: needsVerticalScroll,
            contentWidth: contentWidth,
            contentHeight: contentHeight,
            viewportWidth: viewportWidth,
            viewportHeight: viewportHeight
        };
    }

    // Function to create and show instruction animation
    async function showInstructionAnimation() {
        // Check if instruction has been shown before (commented out for testing - uncomment to show only once)
        // const instructionShown = localStorage.getItem('prometheans_instruction_shown');
        // if (instructionShown === 'true') {
        //     return; // Don't show again
        // }

        // Check if mobile/tablet
        const isMobile = typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet();

        // Detect scrollable directions
        const scrollInfo = detectScrollableDirections();

        // Ensure overlay app exists (renders above DOM overlays like YouTube)
        const instructionApp = await ensureInstructionOverlayApp();

        // Create instruction container
        instructionContainer = new Container();
        instructionContainer.zIndex = 9998; // Just below loading screen
        instructionContainer.alpha = instructionAlpha;
        instructionContainer.eventMode = 'passive'; // Don't block interactions

        // Create semi-transparent overlay
        const overlay = new Graphics();
        overlay.rect(0, 0, instructionApp.screen.width, instructionApp.screen.height);
        overlay.fill({ color: 0x000000, alpha: 0.3 }); // Semi-transparent black
        instructionContainer.addChild(overlay);

        if (isMobile) {
            // Mobile: Show swipe animation based on scrollable directions
            createSwipeAnimation(instructionContainer, scrollInfo, instructionApp);
        } else {
            // Desktop: Show mouse click + drag animation based on scrollable directions
            createMouseDragAnimation(instructionContainer, scrollInfo, instructionApp);
        }

        // Add instruction container to stage
        instructionApp.stage.addChild(instructionContainer);

        // Handle window resize
        instructionResizeHandler = () => {
            if (!instructionContainer) return;
            if (instructionOverlayApp) {
                instructionOverlayApp.renderer.resize(window.innerWidth, window.innerHeight);
            }

            // Update overlay size
            const overlay = instructionContainer.children[0];
            if (overlay && overlay instanceof Graphics) {
                overlay.clear();
                overlay.rect(0, 0, instructionApp.screen.width, instructionApp.screen.height);
                overlay.fill({ color: 0x000000, alpha: 0.3 });
            }

            // Update text positions if they exist
            instructionContainer.children.forEach((child) => {
                if (child instanceof Text) {
                    if (child.text.includes('Long press') || child.text.includes('explore')) {
                        child.x = instructionApp.screen.width / 2;
                        child.y = instructionApp.screen.height * 0.85;
                    }
                }
            });
        };

        window.addEventListener('resize', instructionResizeHandler);

        // Auto-fade after 4 seconds
        setTimeout(() => {
            fadeOutInstruction();
        }, 4000);

        // Hide on any interaction
        const hideOnInteraction = () => {
            if (instructionContainer && instructionContainer.visible) {
                fadeOutInstruction();
            }
        };

        // Listen for user interactions
        app.canvas.addEventListener('pointerdown', hideOnInteraction, { once: true });
        app.canvas.addEventListener('touchstart', hideOnInteraction, { once: true });
        app.canvas.addEventListener('mousedown', hideOnInteraction, { once: true });
    }

    // Function to create mouse click + drag animation (desktop)
    function createMouseDragAnimation(container, scrollInfo, instructionApp = getInstructionApp()) {
        const centerX = instructionApp.screen.width / 2;
        const centerY = instructionApp.screen.height / 2;
        // Responsive mouse size based on screen size
        const viewportWidth = instructionApp.screen.width;
        const viewportHeight = instructionApp.screen.height;
        const minDimension = Math.min(viewportWidth, viewportHeight);
        const mouseSize = Math.max(20, Math.min(35, 30 * (minDimension / 800)));

        // Determine animation direction based on scrollable directions
        let startX, startY, endX, endY;
        let isHorizontal = false;
        let instructionText = '';

        if (scrollInfo.horizontal && scrollInfo.vertical) {
            // Both directions scrollable - prioritize horizontal for smaller screens
            if (scrollInfo.viewportWidth < scrollInfo.viewportHeight) {
                // Portrait or narrow screen - show horizontal
                isHorizontal = true;
                startX = instructionApp.screen.width * 0.3;
                endX = instructionApp.screen.width * 0.7;
                startY = centerY;
                endY = centerY;
                instructionText = 'Long press and drag left/right to explore';
            } else {
                // Landscape or wide screen - show vertical
                isHorizontal = false;
                startX = centerX;
                endX = centerX;
                startY = instructionApp.screen.height * 0.3;
                endY = instructionApp.screen.height * 0.7;
                instructionText = 'Long press and drag up/down to explore';
            }
        } else if (scrollInfo.horizontal) {
            // Only horizontal scrolling needed
            isHorizontal = true;
            startX = instructionApp.screen.width * 0.3;
            endX = instructionApp.screen.width * 0.7;
            startY = centerY;
            endY = centerY;
            instructionText = 'Long press and drag left/right to explore';
        } else if (scrollInfo.vertical) {
            // Only vertical scrolling needed
            isHorizontal = false;
            startX = centerX;
            endX = centerX;
            startY = instructionApp.screen.height * 0.3;
            endY = instructionApp.screen.height * 0.7;
            instructionText = 'Long press and drag up/down to explore';
        } else {
            // No scrolling needed - show default vertical
            isHorizontal = false;
            startX = centerX;
            endX = centerX;
            startY = instructionApp.screen.height * 0.3;
            endY = instructionApp.screen.height * 0.7;
            instructionText = 'Long press and drag to explore';
        }

        // Create mouse cursor graphic
        const mouseCursor = new Graphics();

        // Draw mouse shape (simplified)
        const drawMouse = (x, y, isPressed = false, pressDuration = 0) => {
            if (!mouseCursor || mouseCursor.destroyed) return;
            mouseCursor.clear();
            // Mouse body (rounded rectangle)
            mouseCursor.roundRect(-mouseSize/2, -mouseSize/2, mouseSize, mouseSize * 1.5, 5);
            mouseCursor.fill({ color: 0xFFFFFF, alpha: 0.9 });
            mouseCursor.stroke({ color: 0x333333, width: 2 });

            // Left click button (highlighted when pressed, with pulsing effect for long press)
            if (isPressed) {
                const pulseAlpha = 0.8 + Math.sin(pressDuration * 0.01) * 0.2; // Pulsing effect
                mouseCursor.roundRect(-mouseSize/2, -mouseSize/2, mouseSize * 0.6, mouseSize * 0.6, 3);
                mouseCursor.fill({ color: 0x4CAF50, alpha: pulseAlpha });
            }

            // Mouse wheel line
            mouseCursor.moveTo(-mouseSize * 0.2, mouseSize * 0.1);
            mouseCursor.lineTo(mouseSize * 0.2, mouseSize * 0.1);
            mouseCursor.stroke({ color: 0x666666, width: 1 });
        };

        mouseCursor.x = centerX;
        mouseCursor.y = startY;
        drawMouse(0, 0, false, 0);
        container.addChild(mouseCursor);

        // Create drag trail (dots showing path)
        const trailGraphics = new Graphics();
        container.addChild(trailGraphics);

        // Animation state
        let animTime = 0;
        const animDuration = 3000; // 3 seconds per cycle (longer to show long press)
        let isPressing = false;
        let pressStartTime = 0;

        // Animation loop
        instructionAnimationId = instructionApp.ticker.add(() => {
            if (!instructionContainer || !instructionContainer.visible || instructionContainer.destroyed) return;
            if (!mouseCursor || mouseCursor.destroyed || !trailGraphics || trailGraphics.destroyed) return;

            animTime += instructionApp.ticker.deltaMS;
            if (animTime >= animDuration) {
                animTime = 0; // Reset animation
                isPressing = false;
                pressStartTime = 0;
            }

            const progress = (animTime % animDuration) / animDuration;

            // Long press phase (first 30% of animation - showing long press)
            if (progress < 0.3) {
                isPressing = true;
                if (pressStartTime === 0) pressStartTime = animTime;
                mouseCursor.x = startX;
                mouseCursor.y = startY;
                const pressDuration = animTime - pressStartTime;
                drawMouse(0, 0, true, pressDuration);

                // Draw press indicator (expanding circle)
                if (trailGraphics && !trailGraphics.destroyed) {
                    trailGraphics.clear();
                    const pressProgress = progress / 0.3;
                    const pressRadius = 15 + pressProgress * 20;
                    trailGraphics.circle(startX, startY, pressRadius);
                    trailGraphics.stroke({ color: 0x4CAF50, width: 2, alpha: 0.6 - pressProgress * 0.4 });
                }
            } else {
                isPressing = false;
                // Drag phase (remaining 70% - moving in detected direction)
                const dragProgress = (progress - 0.3) / 0.7;

                // Move in the appropriate direction
                let easeProgress;
                let currentX, currentY;

                if (dragProgress < 0.5) {
                    // Moving to end position
                    const moveProgress = dragProgress * 2;
                    easeProgress = moveProgress < 0.5
                        ? 2 * moveProgress * moveProgress
                        : 1 - Math.pow(-2 * moveProgress + 2, 2) / 2;

                    if (isHorizontal) {
                        currentX = startX + (endX - startX) * easeProgress;
                        currentY = startY;
                    } else {
                        currentX = startX;
                        currentY = startY + (endY - startY) * easeProgress;
                    }
                } else {
                    // Moving back to start position
                    const backProgress = (dragProgress - 0.5) * 2;
                    easeProgress = backProgress < 0.5
                        ? 2 * backProgress * backProgress
                        : 1 - Math.pow(-2 * backProgress + 2, 2) / 2;

                    if (isHorizontal) {
                        currentX = endX - (endX - startX) * easeProgress;
                        currentY = startY;
                    } else {
                        currentX = startX;
                        currentY = endY - (endY - startY) * easeProgress;
                    }
                }

                mouseCursor.x = currentX;
                mouseCursor.y = currentY;
                drawMouse(0, 0, true, 0); // Keep pressed while dragging

                // Draw trail
                if (trailGraphics && !trailGraphics.destroyed) {
                    trailGraphics.clear();
                    const trailLength = Math.min(15, Math.floor(easeProgress * 30));
                    for (let i = 0; i < trailLength; i++) {
                        const trailProgress = easeProgress - (i * 0.03);
                        if (trailProgress > 0) {
                            let trailX, trailY;
                            if (dragProgress < 0.5) {
                                if (isHorizontal) {
                                    trailX = startX + (endX - startX) * trailProgress;
                                    trailY = startY;
                                } else {
                                    trailX = startX;
                                    trailY = startY + (endY - startY) * trailProgress;
                                }
                            } else {
                                const backProgress = (dragProgress - 0.5) * 2;
                                const backEase = backProgress < 0.5
                                    ? 2 * backProgress * backProgress
                                    : 1 - Math.pow(-2 * backProgress + 2, 2) / 2;
                                if (isHorizontal) {
                                    trailX = endX - (endX - startX) * backEase;
                                    trailY = startY;
                                } else {
                                    trailX = startX;
                                    trailY = endY - (endY - startY) * backEase;
                                }
                            }
                            trailGraphics.circle(trailX, trailY, 3);
                            trailGraphics.fill({ color: 0xFFFFFF, alpha: 0.4 - (i * 0.02) });
                        }
                    }
                }
            }
        });

        // Calculate responsive font size based on screen size
        const baseFontSize = 24;
        const minFontSize = 14;
        const maxFontSize = 28;
        // Scale font size based on viewport width (smaller screens = smaller font)
        // Reuse viewportWidth and viewportHeight already declared above
        const minDimensionForFont = Math.min(viewportWidth, viewportHeight);
        // Scale: 320px (small phone) = minFontSize, 1920px (large screen) = maxFontSize
        const fontSize = Math.max(minFontSize, Math.min(maxFontSize, baseFontSize * (minDimensionForFont / 800)));

        // Add instruction text
        const instructionTextElement = new Text({
            text: instructionText,
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: fontSize,
                fill: 0xFFFFFF,
                align: 'center',
                fontWeight: 'bold',
                dropShadow: true,
                dropShadowColor: 0x000000,
                dropShadowDistance: 2,
                dropShadowBlur: 4,
                wordWrap: true,
                wordWrapWidth: viewportWidth * 0.9, // Allow text wrapping on small screens
            }
        });
        instructionTextElement.anchor.set(0.5);
        instructionTextElement.x = instructionApp.screen.width / 2;
        instructionTextElement.y = instructionApp.screen.height * 0.85;
        container.addChild(instructionTextElement);
    }

    // Function to create swipe animation (mobile)
    function createSwipeAnimation(container, scrollInfo, instructionApp = getInstructionApp()) {
        const centerX = instructionApp.screen.width / 2;
        const centerY = instructionApp.screen.height / 2;
        // Responsive finger size based on screen size
        const viewportWidth = instructionApp.screen.width;
        const viewportHeight = instructionApp.screen.height;
        const minDimension = Math.min(viewportWidth, viewportHeight);
        const fingerSize = Math.max(18, Math.min(30, 25 * (minDimension / 800)));

        // Determine animation direction based on scrollable directions
        let startX, startY, endX, endY;
        let isHorizontal = false;
        let instructionText = '';

        if (scrollInfo.horizontal && scrollInfo.vertical) {
            // Both directions scrollable - prioritize horizontal for smaller screens
            if (scrollInfo.viewportWidth < scrollInfo.viewportHeight) {
                // Portrait or narrow screen - show horizontal
                isHorizontal = true;
                startX = instructionApp.screen.width * 0.3;
                endX = instructionApp.screen.width * 0.7;
                startY = centerY;
                endY = centerY;
                instructionText = 'Long press and swipe left/right to explore';
            } else {
                // Landscape or wide screen - show vertical
                isHorizontal = false;
                startX = centerX;
                endX = centerX;
                startY = instructionApp.screen.height * 0.3;
                endY = instructionApp.screen.height * 0.7;
                instructionText = 'Long press and swipe up/down to explore';
            }
        } else if (scrollInfo.horizontal) {
            // Only horizontal scrolling needed
            isHorizontal = true;
            startX = instructionApp.screen.width * 0.3;
            endX = instructionApp.screen.width * 0.7;
            startY = centerY;
            endY = centerY;
            instructionText = 'Long press and swipe left/right to explore';
        } else if (scrollInfo.vertical) {
            // Only vertical scrolling needed
            isHorizontal = false;
            startX = centerX;
            endX = centerX;
            startY = instructionApp.screen.height * 0.3;
            endY = instructionApp.screen.height * 0.7;
            instructionText = 'Long press and swipe up/down to explore';
        } else {
            // No scrolling needed - show default vertical
            isHorizontal = false;
            startX = centerX;
            endX = centerX;
            startY = instructionApp.screen.height * 0.3;
            endY = instructionApp.screen.height * 0.7;
            instructionText = 'Long press and swipe to explore';
        }

        // Create finger/hand graphic
        const finger = new Graphics();

        const drawFinger = (x, y, isPressing = false) => {
            if (!finger || finger.destroyed) return;
            finger.clear();
            // Draw finger as a circle
            finger.circle(0, 0, fingerSize);
            finger.fill({ color: 0xFFFFFF, alpha: 0.9 });
            finger.stroke({ color: 0x333333, width: 2 });

            // Add press indicator
            if (isPressing) {
                finger.circle(0, 0, fingerSize * 0.7);
                finger.fill({ color: 0x4CAF50, alpha: 0.6 });
            }
        };

        finger.x = centerX;
        finger.y = startY;
        drawFinger(0, 0, false);
        container.addChild(finger);

        // Create swipe trail
        const trailGraphics = new Graphics();
        container.addChild(trailGraphics);

        // Animation state
        let animTime = 0;
        const animDuration = 3000; // 3 seconds per cycle

        // Animation loop
        instructionAnimationId = instructionApp.ticker.add(() => {
            if (!instructionContainer || !instructionContainer.visible || instructionContainer.destroyed) return;
            if (!finger || finger.destroyed || !trailGraphics || trailGraphics.destroyed) return;

            animTime += instructionApp.ticker.deltaMS;
            if (animTime >= animDuration) {
                animTime = 0; // Reset animation
            }

            const progress = (animTime % animDuration) / animDuration;

            // Long press phase (first 30% of animation)
            if (progress < 0.3) {
                finger.x = startX;
                finger.y = startY;
                const pressProgress = progress / 0.3;
                drawFinger(0, 0, true);

                // Draw press indicator (expanding circle)
                if (trailGraphics && !trailGraphics.destroyed) {
                    trailGraphics.clear();
                    const pressRadius = 15 + pressProgress * 20;
                    trailGraphics.circle(startX, startY, pressRadius);
                    trailGraphics.stroke({ color: 0x4CAF50, width: 2, alpha: 0.6 - pressProgress * 0.4 });
                }
            } else {
                // Swipe phase (remaining 70% - moving in detected direction)
                const swipeProgress = (progress - 0.3) / 0.7;

                // Move in the appropriate direction
                let easeProgress;
                let currentX, currentY;

                if (swipeProgress < 0.5) {
                    // Moving to end position
                    const moveProgress = swipeProgress * 2;
                    easeProgress = moveProgress < 0.5
                        ? 2 * moveProgress * moveProgress
                        : 1 - Math.pow(-2 * moveProgress + 2, 2) / 2;

                    if (isHorizontal) {
                        currentX = startX + (endX - startX) * easeProgress;
                        currentY = startY;
                    } else {
                        currentX = startX;
                        currentY = startY + (endY - startY) * easeProgress;
                    }
                } else {
                    // Moving back to start position
                    const backProgress = (swipeProgress - 0.5) * 2;
                    easeProgress = backProgress < 0.5
                        ? 2 * backProgress * backProgress
                        : 1 - Math.pow(-2 * backProgress + 2, 2) / 2;

                    if (isHorizontal) {
                        currentX = endX - (endX - startX) * easeProgress;
                        currentY = startY;
                    } else {
                        currentX = startX;
                        currentY = endY - (endY - startY) * easeProgress;
                    }
                }

                finger.x = currentX;
                finger.y = currentY;
                drawFinger(0, 0, true); // Keep pressed while swiping

                // Draw swipe trail
                if (trailGraphics && !trailGraphics.destroyed) {
                    trailGraphics.clear();
                    const trailPoints = 20;
                    for (let i = 0; i <= trailPoints; i++) {
                        const trailProgress = Math.max(0, easeProgress - (i / trailPoints) * 0.5);
                        if (trailProgress > 0) {
                            let trailX, trailY;
                            if (swipeProgress < 0.5) {
                                if (isHorizontal) {
                                    trailX = startX + (endX - startX) * trailProgress;
                                    trailY = startY;
                                } else {
                                    trailX = startX;
                                    trailY = startY + (endY - startY) * trailProgress;
                                }
                            } else {
                                const backProgress = (swipeProgress - 0.5) * 2;
                                const backEase = backProgress < 0.5
                                    ? 2 * backProgress * backProgress
                                    : 1 - Math.pow(-2 * backProgress + 2, 2) / 2;
                                if (isHorizontal) {
                                    trailX = endX - (endX - startX) * backEase;
                                    trailY = startY;
                                } else {
                                    trailX = startX;
                                    trailY = endY - (endY - startY) * backEase;
                                }
                            }
                            trailGraphics.circle(trailX, trailY, 4 - (i * 0.15));
                            trailGraphics.fill({ color: 0xFFFFFF, alpha: 0.4 - (i * 0.02) });
                        }
                    }
                }
            }
        });

        // Calculate responsive font size based on screen size
        const baseFontSize = 24;
        const minFontSize = 14;
        const maxFontSize = 28;
        // Scale font size based on viewport width (smaller screens = smaller font)
        // Reuse viewportWidth and viewportHeight already declared above
        const minDimensionForFont = Math.min(viewportWidth, viewportHeight);
        // Scale: 320px (small phone) = minFontSize, 1920px (large screen) = maxFontSize
        const fontSize = Math.max(minFontSize, Math.min(maxFontSize, baseFontSize * (minDimensionForFont / 800)));

        // Add instruction text
        const instructionTextElement = new Text({
            text: instructionText,
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: fontSize,
                fill: 0xFFFFFF,
                align: 'center',
                fontWeight: 'bold',
                dropShadow: true,
                dropShadowColor: 0x000000,
                dropShadowDistance: 2,
                dropShadowBlur: 4,
                wordWrap: true,
                wordWrapWidth: viewportWidth * 0.9, // Allow text wrapping on small screens
            }
        });
        instructionTextElement.anchor.set(0.5);
        instructionTextElement.x = app.screen.width / 2;
        instructionTextElement.y = app.screen.height * 0.85;
        container.addChild(instructionTextElement);
    }

    // Function to fade out instruction animation
    function fadeOutInstruction() {
        // Prevent multiple simultaneous fade operations
        if (isInstructionFading || !instructionContainer || !instructionContainer.parent) {
            return;
        }

        isInstructionFading = true;

        // Mark as shown in localStorage
        localStorage.setItem('prometheans_instruction_shown', 'true');

        // Remove animation ticker
        if (instructionAnimationId !== null) {
            const instructionApp = getInstructionApp();
            instructionApp.ticker.remove(instructionAnimationId);
            instructionAnimationId = null;
        }

        // Remove resize listener
        if (instructionResizeHandler) {
            window.removeEventListener('resize', instructionResizeHandler);
            instructionResizeHandler = null;
        }

        const fadeSpeed = 0.05;
        const fadeInterval = setInterval(() => {
            if (!instructionContainer) {
                clearInterval(fadeInterval);
                isInstructionFading = false;
                return;
            }

            instructionAlpha -= fadeSpeed;
            if (instructionAlpha <= 0) {
                instructionAlpha = 0;
                if (instructionContainer) {
                    instructionContainer.visible = false;
                    if (instructionContainer.parent) {
                        const instructionApp = getInstructionApp();
                        instructionApp.stage.removeChild(instructionContainer);
                        instructionContainer.destroy({ children: true });
                    }
                    instructionContainer = null;
                }
                clearInterval(fadeInterval);
                isInstructionFading = false;
            } else {
                if (instructionContainer) {
                    instructionContainer.alpha = instructionAlpha;
                }
            }
        }, 16); // ~60fps
    }

    // Wait for Digital font before showing HTML loading screen (for redirects)
    async function preloadDigitalFont() {
        try {
            if (!document.fonts || !document.fonts.ready) {
                // Font API not available
                return;
            }

            // Wait for fonts.ready with a reasonable timeout
            await Promise.race([
                document.fonts.ready,
                new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
            ]);

            // Helper function to check font with multiple variations
            function checkFont(fontFamily) {
                return document.fonts.check(`1em "${fontFamily}"`) || 
                       document.fonts.check(`1em ${fontFamily}`) ||
                       document.fonts.check(`12px "${fontFamily}"`) ||
                       document.fonts.check(`12px ${fontFamily}`);
            }

            // Check if Digital font is loaded
            let fontLoaded = checkFont('Digital');
            let attempts = 0;
            const maxAttempts = 20; // 2 seconds total (20 * 100ms)

            while (!fontLoaded && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                fontLoaded = checkFont('Digital');
                attempts++;
            }

            if (fontLoaded) {

            } else {
                // Digital font not loaded, using fallback
            }
        } catch (error) {
            // Error loading Digital font
        }
    }

    // Global function to show loading screen for redirects (HTML-based, same as community.html)
    async function showLoadingScreenForRedirect() {
        let htmlLoadingScreen = document.getElementById('redirectLoadingScreen');

        // Create loading screen if it doesn't exist
        if (!htmlLoadingScreen) {
            const loadingScreenHTML = `
                <div class="redirect-loading-screen" id="redirectLoadingScreen">
                    <div class="redirect-loading-screen-content">
                        <img src="/assets/loading_screen_logo.png" alt="The Prometheans" class="redirect-loading-logo" id="redirectLoadingLogo">
                        <div class="redirect-loading-percentage" id="redirectLoadingPercentage">0</div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('afterbegin', loadingScreenHTML);
            htmlLoadingScreen = document.getElementById('redirectLoadingScreen');
        }

        if (!htmlLoadingScreen) return;

        // Show loading screen IMMEDIATELY (don't wait for font preload)
        htmlLoadingScreen.classList.remove('hidden');
        htmlLoadingScreen.style.opacity = '1';

        // Reset logo glitch
        const loadingLogo = document.getElementById('redirectLoadingLogo');
        if (loadingLogo) {
            loadingLogo.classList.remove('stop-glitch');
        }

        // Initialize percentage counter immediately
        initRedirectLoadingCounter();
        
        // Preload font in background (non-blocking)
        preloadDigitalFont().catch(err => {
            // Font preload failed, continuing anyway
        });
    }

    // Initialize loading counter for redirects (same logic as community.html)
    function initRedirectLoadingCounter() {
        const loadingScreen = document.getElementById('redirectLoadingScreen');
        const loadingPercentage = document.getElementById('redirectLoadingPercentage');
        const loadingLogo = document.getElementById('redirectLoadingLogo');
        if (!loadingScreen || !loadingPercentage) return;

        let isRolling = false;
        let rollInterval = null;
        let currentRollValue = 1;
        const rollSpeed = 15; // Milliseconds between number changes
        const startTime = Date.now();
        const minLoadingTime = 1500; // Minimum 1.5 seconds (faster for redirects)
        let loadingComplete = false;
        let reached100 = false; // Track if we've reached 100%

        // Continuous rolling animation from 1% to 100%
        function startRolling() {
            if (isRolling) return;

            isRolling = true;
            currentRollValue = 1;

            if (rollInterval) {
                clearInterval(rollInterval);
            }

            if (loadingPercentage) {
                loadingPercentage.textContent = currentRollValue;
            }

            rollInterval = setInterval(() => {
                currentRollValue++;

                if (currentRollValue <= 100) {
                    if (loadingPercentage) {
                        loadingPercentage.textContent = currentRollValue;
                    }
                } else {
                    // Reached 100%
                    clearInterval(rollInterval);
                    rollInterval = null;
                    isRolling = false;
                    currentRollValue = 100;
                    reached100 = true;

                    if (loadingPercentage) {
                        loadingPercentage.textContent = 100;
                    }

                    // Stop logo glitch immediately when 100% is reached
                    if (loadingLogo) {
                        loadingLogo.classList.add('stop-glitch');
                    }

                    // Don't auto-hide, let the redirect function handle it
                    // The redirect will happen after 100% is reached
                }
            }, rollSpeed);
        }

        // Hide loading screen (called by redirect function after redirect happens)
        window.hideRedirectLoadingScreen = function() {
            if (currentRollValue < 100) {
                currentRollValue = 100;
                if (loadingPercentage) {
                    loadingPercentage.textContent = 100;
                }
                if (loadingLogo) {
                    loadingLogo.classList.add('stop-glitch');
                }
            }

            if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    if (loadingScreen.parentNode) {
                        loadingScreen.parentNode.removeChild(loadingScreen);
                    }
                    if (rollInterval) {
                        clearInterval(rollInterval);
                    }
                }, 300);
            }
        };

        // Start rolling immediately
        startRolling();

        // Fallback: ensure we reach 100% even if something goes wrong
        setTimeout(() => {
            if (!reached100) {
                currentRollValue = 100;
                if (loadingPercentage) {
                    loadingPercentage.textContent = 100;
                }
                if (loadingLogo) {
                    loadingLogo.classList.add('stop-glitch');
                }
                reached100 = true;
            }
        }, 2000);
    }

    // Make function globally available for redirects
    window.showLoadingScreenForRedirect = showLoadingScreenForRedirect;

    // Function to preload URL in background
    // Function to preload URL in background silently
    async function preloadURL(url) {
        return new Promise((resolve) => {

            // Use a hidden iframe to preload the page silently
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.position = 'absolute';
            iframe.style.visibility = 'hidden';
            iframe.src = url;

            let resolved = false;

            iframe.onload = () => {
                if (!resolved) {
                    resolved = true;

                    setTimeout(() => {
                        if (iframe.parentNode) {
                            iframe.parentNode.removeChild(iframe);
                        }
                    }, 100);
                    resolve(true);
                }
            };

            iframe.onerror = () => {
                if (!resolved) {
                    resolved = true;

                    setTimeout(() => {
                        if (iframe.parentNode) {
                            iframe.parentNode.removeChild(iframe);
                        }
                    }, 100);
                    resolve(true); // Resolve anyway to not block redirect
                }
            };

            document.body.appendChild(iframe);

            // Timeout after 10 seconds - don't wait forever, but give it more time for slow sites
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    if (iframe.parentNode) {
                        iframe.parentNode.removeChild(iframe);
                    }

                    resolve(true);
                }
            }, 10000);
        });
    }

    // Function to show loading screen for mutator redirect
    async function showMutatorLoadingScreen(callback, redirectURL = 'https://prometheans.talis.art/') {
        // Show loading screen
        await showLoadingScreenForRedirect();

        // Start preloading URL in background while counting
        let urlLoaded = false;
        const preloadPromise = preloadURL(redirectURL).then(() => {
            urlLoaded = true;

        });

        // Wait for loading screen to reach 100% AND URL to be loaded before redirecting
        let hasReached100 = false;
        let redirectExecuted = false;

        const checkAndRedirect = () => {
            const loadingPercentage = document.getElementById('redirectLoadingPercentage');
            if (loadingPercentage) {
                const currentValue = parseInt(loadingPercentage.textContent) || 0;
                if (currentValue >= 100 && !hasReached100) {
                    // Reached 100% for the first time
                    hasReached100 = true;

                    // Wait for both 100% AND URL to be loaded
                    const attemptRedirect = () => {
                        if (urlLoaded && !redirectExecuted) {
                            redirectExecuted = true;

                            // Brief pause at 100% to see it before redirect (same as community.html)
                            setTimeout(() => {
                                if (callback) callback();

                                // Hide HTML loading screen immediately after opening new tab to keep animations running
                                setTimeout(() => {
                                    if (window.hideRedirectLoadingScreen) {
                                        window.hideRedirectLoadingScreen();
                                    }
                                }, 100);
                            }, 500);
                        } else if (!urlLoaded) {
                            // URL not loaded yet, check again in 100ms
                            setTimeout(attemptRedirect, 100);
                        }
                    };

                    // Start checking if URL is ready
                    attemptRedirect();
                } else if (currentValue < 100) {
                    // Not at 100% yet, check again in 30ms
                    setTimeout(checkAndRedirect, 30);
                }
            } else {
                // Fallback: if element doesn't exist, wait a bit then redirect
                if (!redirectExecuted) {
                    setTimeout(() => {
                        if (!redirectExecuted) {
                            redirectExecuted = true;
                            if (callback) callback();
                        }
                    }, 2000);
                }
            }
        };

        // Start checking after a short delay to let the counter start
        setTimeout(checkAndRedirect, 100);
    }

    // Create loading screen immediately (only if enabled)
    if (ENABLE_INTRO_LOADING_SCREEN) {
        await createLoadingScreen();
    }

    // Function to update mutator capsule text position, font size, and dot position
    function updateMutatorText() {
        if (!mutatorCapsuleSprite) return;

        // Update dot position to center of mutator capsule sprite
        if (mutatorCapsuleDot) {
            mutatorCapsuleDot.x = mutatorCapsuleSprite.x;
            mutatorCapsuleDot.y = mutatorCapsuleSprite.y;

            // Position and show label text on mobile/tablet (below dot)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && mutatorCapsuleLabelText) {
                mutatorCapsuleLabelText.x = mutatorCapsuleDot.x;
                mutatorCapsuleLabelText.y = mutatorCapsuleDot.y + 40; // Position label below dot
                mutatorCapsuleLabelText.visible = true; // Always visible on mobile/tablet
            } else if (mutatorCapsuleLabelText) {
                mutatorCapsuleLabelText.visible = false; // Hide on desktop
            }
        }

        // Update text position and font size
        if (!mutatorCapsuleTextSprite) return;

        // Update font size responsively
        if (mutatorCapsuleTextSprite.userData && mutatorCapsuleTextSprite.userData.getResponsiveFontSize) {
            const newFontSize = mutatorCapsuleTextSprite.userData.getResponsiveFontSize();
            mutatorCapsuleTextSprite.style.fontSize = newFontSize;
        }

        // Only update position if not animating
        if (mutatorCapsuleTextSprite.userData && !mutatorCapsuleTextSprite.userData.isAnimating) {
            // Calculate positions (X: 2666.5, Y: 1630.5 start, Y: 1600 target) - same as CCTV
            const bg1StartX = 2666.5;
            const bg1StartY = 1630.5; // Start position
            const bg1TargetY = 1600.0; // Target position (higher up - lower Y value)

            // Get current background position and scale to convert coordinates (same as CCTV)
            if (backgroundSprite) {
                const scale = currentScale || 1;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Convert bg1 coordinates to screen coordinates
                const normalizedStartX = bg1StartX / imageWidth;
                const normalizedStartY = bg1StartY / imageHeight;
                const normalizedTargetY = bg1TargetY / imageHeight;

                const startScreenX = bg1Left + (normalizedStartX * bg1DisplayedWidth);
                const startScreenY = bg1Top + (normalizedStartY * bg1DisplayedHeight);
                const targetScreenY = bg1Top + (normalizedTargetY * bg1DisplayedHeight);

                // Start position (Y: 1630.5)
                mutatorCapsuleTextSprite.userData.startX = startScreenX;
                mutatorCapsuleTextSprite.userData.startY = startScreenY;

                // Target position (Y: 1600 - slides up 30.5 pixels, same as CCTV)
                mutatorCapsuleTextSprite.userData.targetX = startScreenX; // Same X position
                mutatorCapsuleTextSprite.userData.targetY = targetScreenY;

                // If text is visible but not animating, update its position directly
                if (mutatorCapsuleTextSprite.visible && !mutatorCapsuleTextSprite.userData.isAnimating) {
                    mutatorCapsuleTextSprite.x = mutatorCapsuleTextSprite.userData.targetX;
                    mutatorCapsuleTextSprite.y = mutatorCapsuleTextSprite.userData.targetY;
                }
            }
        }
    }

    // Function to update Board text position, font size, and dot position
    function updateBoardText() {
        if (!boardSprite) return;

        // Update dot position to center of board sprite (use base position, not animated position)
        if (boardDot) {
            // Use base position if available, otherwise use current position
            const boardX = (boardSprite.userData && boardSprite.userData.baseX !== undefined) 
                ? boardSprite.userData.baseX 
                : boardSprite.x;
            const boardY = (boardSprite.userData && boardSprite.userData.baseY !== undefined) 
                ? boardSprite.userData.baseY 
                : boardSprite.y;
            
            boardDot.x = boardX;
            boardDot.y = boardY;

            // Position and show label text on mobile/tablet (below dot)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && boardLabelText) {
                boardLabelText.x = boardDot.x;
                boardLabelText.y = boardDot.y + 40; // Position label below dot
                boardLabelText.visible = true; // Always visible on mobile/tablet
            } else if (boardLabelText) {
                boardLabelText.visible = false; // Hide on desktop
            }
        }

        // Update text position and font size
        if (!boardTextSprite) return;

        // Update font size responsively
        if (boardTextSprite.userData && boardTextSprite.userData.getResponsiveFontSize) {
            const newFontSize = boardTextSprite.userData.getResponsiveFontSize();
            boardTextSprite.style.fontSize = newFontSize;
        }

        // Update stroke position and scale to match board position and scale (use base position, not animated position)
        if (boardStrokeSprite && boardSprite) {
            // Use base position if available, otherwise use current position
            const boardX = (boardSprite.userData && boardSprite.userData.baseX !== undefined) 
                ? boardSprite.userData.baseX 
                : boardSprite.x;
            const boardY = (boardSprite.userData && boardSprite.userData.baseY !== undefined) 
                ? boardSprite.userData.baseY 
                : boardSprite.y;
            
            boardStrokeSprite.x = boardX;
            boardStrokeSprite.y = boardY;
            boardStrokeSprite.scale.set(boardSprite.scale.x, boardSprite.scale.y);
        }

        // Only update position if not animating
        if (boardTextSprite.userData && !boardTextSprite.userData.isAnimating) {
            // Use same target as other labels
            const bg1TargetX = 2666.5;
            const bg1TargetY = 1630.5;

            if (backgroundSprite) {
                const scale = currentScale || 1;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedTargetX = bg1TargetX / imageWidth;
                const normalizedTargetY = bg1TargetY / imageHeight;

                const targetScreenX = bg1Left + (normalizedTargetX * bg1DisplayedWidth);
                const targetScreenY = bg1Top + (normalizedTargetY * bg1DisplayedHeight);

                boardTextSprite.userData.targetX = targetScreenX;
                boardTextSprite.userData.targetY = targetScreenY;

                // If text is visible but not animating, update its position directly
                if (boardTextSprite.visible && !boardTextSprite.userData.isAnimating) {
                    boardTextSprite.x = boardTextSprite.userData.targetX;
                    boardTextSprite.y = boardTextSprite.userData.targetY;
                }
            }
        }
    }

    // Function to update CCTV text position, font size, and dot position
    function updateCctvText() {
        if (!cctvSprite) return;

        // Update dot position to center of CCTV sprite
        if (cctvDot) {
            cctvDot.x = cctvSprite.x;
            cctvDot.y = cctvSprite.y;

            // Position and show label text on mobile/tablet (below dot)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && cctvLabelText) {
                cctvLabelText.x = cctvDot.x;
                cctvLabelText.y = cctvDot.y + 40; // Position label below dot
                cctvLabelText.visible = true; // Always visible on mobile/tablet
            } else if (cctvLabelText) {
                cctvLabelText.visible = false; // Hide on desktop
            }
        }

        // Update text position and font size
        if (!cctvTextSprite) return;

        // Update font size responsively
        if (cctvTextSprite.userData && cctvTextSprite.userData.getResponsiveFontSize) {
            const newFontSize = cctvTextSprite.userData.getResponsiveFontSize();
            cctvTextSprite.style.fontSize = newFontSize;
        }

        // Update stroke position and scale to match CCTV position and scale
        if (cctvStrokeSprite && cctvSprite) {
            cctvStrokeSprite.x = cctvSprite.x;
            cctvStrokeSprite.y = cctvSprite.y;
            cctvStrokeSprite.scale.set(cctvSprite.scale.x, cctvSprite.scale.y);
        }

        // Wall Art stroke sprite: position and scale to match wall art sprite
        if (wallArtStrokeSprite && wallArtSprite) {
            wallArtStrokeSprite.x = wallArtSprite.x;
            wallArtStrokeSprite.y = wallArtSprite.y;
            wallArtStrokeSprite.scale.set(wallArtSprite.scale.x, wallArtSprite.scale.y);
        }

            // Only update position if not animating
        if (cctvTextSprite.userData && !cctvTextSprite.userData.isAnimating) {
            // Calculate positions (X: 2666.5, Y: 1630.5 start, Y: 1600 target)
            const bg1StartX = 2666.5;
            const bg1StartY = 1630.5; // Start position
            const bg1TargetY = 1600.0; // Target position (higher up - lower Y value)

            // Get current background position and scale to convert coordinates
            if (backgroundSprite && cctvSprite.userData && cctvSprite.userData.config) {
                const cctvConfig = cctvSprite.userData.config;
                const scale = currentScale || 1;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Convert bg1 coordinates to screen coordinates
                const normalizedStartX = bg1StartX / imageWidth;
                const normalizedStartY = bg1StartY / imageHeight;
                const normalizedTargetY = bg1TargetY / imageHeight;

                const startScreenX = bg1Left + (normalizedStartX * bg1DisplayedWidth);
                const startScreenY = bg1Top + (normalizedStartY * bg1DisplayedHeight);
                const targetScreenY = bg1Top + (normalizedTargetY * bg1DisplayedHeight);

                // Start position (Y: 1630.5)
                cctvTextSprite.userData.startX = startScreenX;
                cctvTextSprite.userData.startY = startScreenY;

                // Target position (Y: 1600 - slides up 30.5 pixels)
                cctvTextSprite.userData.targetX = startScreenX; // Same X position
                cctvTextSprite.userData.targetY = targetScreenY;
            } else {
                // Fallback: use center page position directly
                cctvTextSprite.userData.targetX = app.screen.width / 2;
                cctvTextSprite.userData.targetY = app.screen.height / 2;
                cctvTextSprite.userData.startX = cctvTextSprite.userData.targetX;
                cctvTextSprite.userData.startY = cctvTextSprite.userData.targetY + 400; // Start below, slides up
            }

            // Update sprite position if text is visible (so it moves when background is panned/resized)
            if (cctvTextSprite.visible) {
                cctvTextSprite.x = cctvTextSprite.userData.targetX;
                cctvTextSprite.y = cctvTextSprite.userData.targetY;
                cctvTextSprite.userData.currentX = cctvTextSprite.userData.targetX;
                cctvTextSprite.userData.currentY = cctvTextSprite.userData.targetY;
            }
        }
    }

    // Function to update Book text position, font size, and dot position
    function updateBookText() {
        if (!bookSprite) return;

        // Update dot position to center of book sprite
        if (bookDot) {
            bookDot.x = bookSprite.x;
            bookDot.y = bookSprite.y;

            // Position and show label text on mobile/tablet (below dot)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && bookLabelText) {
                bookLabelText.x = bookDot.x;
                bookLabelText.y = bookDot.y + 40; // Position label below dot
                bookLabelText.visible = true; // Always visible on mobile/tablet
            } else if (bookLabelText) {
                bookLabelText.visible = false; // Hide on desktop
            }
        }

        // Update text position and font size
        if (!bookTextSprite) return;

        // Update font size responsively
        if (bookTextSprite.userData && bookTextSprite.userData.getResponsiveFontSize) {
            const newFontSize = bookTextSprite.userData.getResponsiveFontSize();
            bookTextSprite.style.fontSize = newFontSize;
        }

        // Update stroke position and scale to match book sprite exactly
        if (bookStrokeSprite && bookSprite) {
            bookStrokeSprite.x = bookSprite.x;
            bookStrokeSprite.y = bookSprite.y;
            bookStrokeSprite.scale.set(bookSprite.scale.x, bookSprite.scale.y);
        }

        // Only update position if not animating
        if (bookTextSprite.userData && !bookTextSprite.userData.isAnimating) {
            // Calculate positions (same fixed position as Mutator, CCTV, and Wall Art)
            const bg1TargetX = 2666.5; // Target X position (same as Mutator, CCTV, and Wall Art)
            const bg1TargetY = 1630.5; // Target Y position (same level as Mutator, CCTV, and Wall Art)

            // Get current background position and scale to convert coordinates
            if (backgroundSprite && bookSprite.userData && bookSprite.userData.config) {
                const bookConfig = bookSprite.userData.config;
                const scale = currentScale || 1;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Convert bg1 coordinates to screen coordinates
                const normalizedTargetX = bg1TargetX / imageWidth;
                const normalizedTargetY = bg1TargetY / imageHeight;

                const targetScreenX = bg1Left + (normalizedTargetX * bg1DisplayedWidth);
                const targetScreenY = bg1Top + (normalizedTargetY * bg1DisplayedHeight);

                // Target position
                bookTextSprite.userData.targetX = targetScreenX;
                bookTextSprite.userData.targetY = targetScreenY;

                // Start position (text starts from bottom, slides up)
                const cardEjectionDistance = 100;
                bookTextSprite.userData.startX = targetScreenX; // Same X position
                bookTextSprite.userData.startY = targetScreenY + cardEjectionDistance; // Start below, slides up
            } else {
                // Fallback: use center page position directly
                bookTextSprite.userData.targetX = app.screen.width / 2;
                bookTextSprite.userData.targetY = app.screen.height / 2;
                const cardEjectionDistance = 100;
                bookTextSprite.userData.startX = bookTextSprite.userData.targetX;
                bookTextSprite.userData.startY = bookTextSprite.userData.targetY + cardEjectionDistance; // Start from bottom
            }

            // Update sprite position if text is visible (so it moves when background is panned/resized)
            if (bookTextSprite.visible) {
                bookTextSprite.x = bookTextSprite.userData.targetX;
                bookTextSprite.y = bookTextSprite.userData.targetY;
                bookTextSprite.userData.currentX = bookTextSprite.userData.targetX;
                bookTextSprite.userData.currentY = bookTextSprite.userData.targetY;
            }
        }
    }

    // Helper function to calculate effective displayed dimensions for original image
    // This accounts for CDN optimization - coordinates are based on original dimensions
    function getEffectiveDisplayedDimensions() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const originalScaleX = screenWidth / ORIGINAL_IMAGE_WIDTH;
        const originalScaleY = screenHeight / ORIGINAL_IMAGE_HEIGHT;
        const originalScale = Math.max(originalScaleX, originalScaleY);
        return {
            width: ORIGINAL_IMAGE_WIDTH * originalScale,
            height: ORIGINAL_IMAGE_HEIGHT * originalScale
        };
    }

    // Function to mute YouTube video
    function muteYouTubeVideo() {
        if (!youtubePlayer) return;
        
        try {
            const playerState = youtubePlayer.getPlayerState();
            const isReady = playerState !== undefined && playerState !== null;
            
            if (isReady) {
                youtubePlayer.mute();
            }
        } catch (error) {
            // Ignore errors - video might not be ready yet
        }
    }
    
    // Function to unmute YouTube video and set volume to 100%
    // This is called when user interacts with the page (after browser allows unmuting)
    function unmuteYouTubeVideo() {
        if (!youtubePlayer) return;
        
        // Only attempt to unmute if user has interacted with the page
        // YouTube's autoplay policy requires user interaction before unmuting
        if (!hasUserInteracted) {
            return; // Wait for user interaction
        }
        
        // Don't unmute if global audio is muted
        if (globalSpriteAudioMuted) {
            return; // Respect global mute state
        }
        
        try {
            // Check if player is ready and in a valid state
            const playerState = youtubePlayer.getPlayerState();
            const isReady = playerState !== undefined && playerState !== null;
            
            // Only attempt to unmute if player is ready and either playing or paused (not unstarted or ended)
            if (isReady && (playerState === YT.PlayerState.PLAYING || playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.BUFFERING)) {
                // Set volume first
                youtubePlayer.setVolume(100);
                
                // Attempt to unmute - this requires user interaction
                // If unmuting fails, the video will pause, so we need to resume it
                const wasPlaying = playerState === YT.PlayerState.PLAYING;
                
                try {
                    youtubePlayer.unMute();
                } catch (unmuteError) {
                    // If unmuting fails, don't let it pause the video
                    // The video should continue playing muted
                    if (wasPlaying) {
                        // Ensure video continues playing even if unmute failed
                        setTimeout(() => {
                            try {
                                const currentState = youtubePlayer.getPlayerState();
                                if (currentState === YT.PlayerState.PAUSED) {
                                    // Video was paused due to unmute failure, resume it (still muted)
                                    youtubePlayer.playVideo();
                                }
                            } catch (error) {
                                // Ignore errors when checking/resuming
                            }
                        }, 50);
                    }
                    return; // Exit early if unmute failed
                }
                
                // If video was playing and got paused due to unmute failure, resume it
                // Use a small delay to check if unmuting caused a pause
                setTimeout(() => {
                    try {
                        const currentState = youtubePlayer.getPlayerState();
                        if (wasPlaying && currentState === YT.PlayerState.PAUSED) {
                            // Video was paused due to unmute failure, resume it (still muted)
                            youtubePlayer.playVideo();
                        }
                    } catch (error) {
                        // Ignore errors when checking/resuming
                    }
                }, 100);
            }
        } catch (error) {
            // Ignore errors - video might not be ready yet or already unmuted
            // Don't log to avoid console spam
        }
    }
    
    // Function to sync YouTube video mute state with global audio mute state
    function syncYouTubeVideoMuteState() {
        if (!youtubePlayer) return;
        
        try {
            const playerState = youtubePlayer.getPlayerState();
            const isReady = playerState !== undefined && playerState !== null;
            
            if (isReady) {
                if (globalSpriteAudioMuted) {
                    // Global audio is muted, mute YouTube video
                    muteYouTubeVideo();
                } else {
                    // Global audio is unmuted, unmute YouTube video (if user has interacted)
                    if (hasUserInteracted) {
                        unmuteYouTubeVideo();
                    }
                }
            }
        } catch (error) {
            // Ignore errors - video might not be ready yet
        }
    }
    
    // Function to create YouTube video iframe overlay using YouTube IFrame API
    function createYouTubeVideoOverlay() {
        // Create outer container wrapper for border
        youtubeScreenVideoContainer = document.createElement('div');
        youtubeScreenVideoContainer.id = 'youtube-screen-video-container';
        
        // Create inner container for clip-path
        const innerContainer = document.createElement('div');
        innerContainer.id = 'youtube-screen-video-inner';
        
        // Create div for YouTube player (IFrame API will replace this)
        const playerDiv = document.createElement('div');
        playerDiv.id = 'youtube-screen-video';
        
        // Append player div to inner container
        innerContainer.appendChild(playerDiv);
        
        // Append inner container to outer container
        youtubeScreenVideoContainer.appendChild(innerContainer);
        
        // Append outer container to body
        document.body.appendChild(youtubeScreenVideoContainer);
        
        // Initially hidden, will be shown when positioned AND loading screen is done
        youtubeScreenVideoContainer.style.display = 'none';
        youtubeScreenVideoContainer.style.visibility = 'hidden'; // Extra safety to keep it hidden
        youtubeScreenVideoContainer.style.opacity = '0'; // Also set opacity to 0 for smooth transition
        
        // Add message event listener to handle YouTube's postMessage and suppress origin mismatch errors
        // This is a common issue with YouTube iframe API - the error is non-critical
        // Only add listener once (check if already added)
        if (!window.youtubeMessageListenerAdded) {
            window.addEventListener('message', (event) => {
                // Suppress YouTube postMessage origin mismatch errors
                // These are warnings from YouTube's widget API and don't affect functionality
                if (event.origin === 'https://www.youtube.com' || event.origin === 'https://www.youtube-nocookie.com') {
                    // Allow YouTube messages - this prevents the console error
                    // The error occurs because YouTube tries to postMessage but the origin check sometimes fails
                    // This is a known issue and doesn't break functionality
                    return;
                }
            });
            window.youtubeMessageListenerAdded = true;
        }
        
        // Initialize YouTube player when API is ready
        async function initializeYouTubePlayer() {
            if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
                // API not loaded yet, wait a bit and try again
                setTimeout(initializeYouTubePlayer, 100);
                return;
            }
            
            // Use pre-loaded video ID if available (loaded early in index.html)
            // Otherwise, wait a bit for it to load, or use default
            let videoId = window.YOUTUBE_VIDEO_ID || 'zlMFsDJNneE';
            
            // If video ID wasn't pre-loaded, wait a bit and check again
            if (!window.YOUTUBE_VIDEO_ID) {
                let attempts = 0;
                const maxAttempts = 30; // 3 seconds max wait
                while (!window.YOUTUBE_VIDEO_ID && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                videoId = window.YOUTUBE_VIDEO_ID || 'zlMFsDJNneE';
            }
            
            // Using pre-loaded or default video ID
            
            // Check if player div exists
            const playerDiv = document.getElementById('youtube-screen-video');
            if (!playerDiv) {
                return;
            }
            
            // If player already exists, destroy it first
            if (youtubePlayer) {
                try {
                    youtubePlayer.destroy();
                } catch (e) {
                    // Ignore errors when destroying
                }
                youtubePlayer = null;
            }
            
            // Create YouTube player with IFrame API
            try {
                youtubePlayer = new YT.Player('youtube-screen-video', {
                    videoId: videoId,
                    playerVars: {
                        'autoplay': 1,
                        'mute': 1, // Start muted (required for autoplay), will unmute after ready
                        'loop': 1,
                        'playlist': videoId,
                        'controls': 0,
                        'modestbranding': 1,
                        'rel': 0,
                        'showinfo': 0,
                        'enablejsapi': 1 // Enable JavaScript API
                    },
                    events: {
                        'onReady': onYouTubePlayerReady,
                        'onStateChange': onYouTubePlayerStateChange
                    }
                });
            } catch (error) {
                // Error creating YouTube player
            }
        }
        
        // Start initialization - wait for both YouTube IFrame API and api-config.js
        function startYouTubeInitialization() {
            // Check if YouTube IFrame API is ready
            if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
                // Wait for YouTube API to load
                const existingCallback = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = function() {
                    if (existingCallback) existingCallback();
                    // Wait for api-config.js to set API_BASE_URL
                    waitForApiConfigAndInit();
                };
                // Also try periodic check in case onYouTubeIframeAPIReady was already called
                setTimeout(() => {
                    if (typeof YT !== 'undefined' && typeof YT.Player !== 'undefined') {
                        waitForApiConfigAndInit();
                    }
                }, 500);
            } else {
                // YouTube API already loaded, wait for API_BASE_URL
                waitForApiConfigAndInit();
            }
        }
        
        // Wait for API_BASE_URL to be available, then initialize
        function waitForApiConfigAndInit() {
            if (window.API_BASE_URL) {
                initializeYouTubePlayer();
            } else {
                // Poll for API_BASE_URL (api-config.js might still be loading)
                let attempts = 0;
                const maxAttempts = 50; // 5 seconds max wait (50 * 100ms)
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (window.API_BASE_URL) {
                        clearInterval(checkInterval);
                        initializeYouTubePlayer();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        // API_BASE_URL not available, using default
                        // Set a fallback so initializeYouTubePlayer can proceed
                        window.API_BASE_URL = window.API_BASE_URL || 'http://localhost:3001';
                        initializeYouTubePlayer();
                    }
                }, 100);
            }
        }
        
        // Start initialization
        startYouTubeInitialization();
    }
    
    // YouTube player ready event handler
    function onYouTubePlayerReady(event) {
        // Set volume to 100%
        event.target.setVolume(100);
        
        // Store reference to iframe for positioning
        const playerIframe = event.target.getIframe();
        if (playerIframe) {
            youtubeScreenVideo = playerIframe;
            youtubeScreenVideo.title = '[playlist] soft songs for emotional days ☁️';
        }
        
        // If screen container exists and has config, update position to show video
        if (screenContainer && screenContainer.userData && screenContainer.userData.config) {
            const screenConfig = screenContainer.userData.config;
            // Get current scale from background
            if (backgroundSprite && backgroundSprite.scale) {
                updateYouTubeVideoPosition(screenContainer, screenConfig, backgroundSprite.scale.x);
            }
        }
        
        // Sync YouTube video mute state with global audio mute state
        // If global audio is muted, keep YouTube video muted
        syncYouTubeVideoMuteState();
        
        // Don't try to unmute here if global audio is muted or no user interaction yet
        // Browser autoplay policies require videos to start muted
    }
    
    // YouTube player state change event handler
    function onYouTubePlayerStateChange(event) {
        // When video starts playing, ensure volume is at 100%
        if (event.data === YT.PlayerState.PLAYING) {
            try {
                event.target.setVolume(100);
                
                // Sync YouTube video mute state with global audio mute state
                // This ensures the video respects the global mute setting
                syncYouTubeVideoMuteState();
            } catch (error) {
                // Volume set failed
            }
        }
    }

    // Function to update YouTube video iframe position and size to match screen container
    function updateYouTubeVideoPosition(screenContainer, screenConfig, bgScale) {
        if (!youtubeScreenVideoContainer || !screenContainer || !screenConfig) return;
        
        // Don't show YouTube embed if loading screen is still active
        const isLoadingScreenActive = loadingScreen && loadingScreenAlpha > 0 && loadingScreen.visible;
        if (isLoadingScreenActive) {
            // Keep it hidden during loading screen, but still update position for when it's ready
            youtubeScreenVideoContainer.style.display = 'none';
            youtubeScreenVideoContainer.classList.remove('visible');
            // Still update position and size so it's ready when loading screen finishes
        }
        
        // Get iframe reference - either from stored reference or from player object
        let iframeElement = youtubeScreenVideo;
        if (!iframeElement && youtubePlayer) {
            try {
                iframeElement = youtubePlayer.getIframe();
                if (iframeElement) {
                    youtubeScreenVideo = iframeElement; // Cache it
                }
            } catch (error) {
                // Could not get YouTube iframe
            }
        }
        
        // If still no iframe, we can still position the container, but skip iframe styling
        if (!iframeElement && !youtubePlayer) return;

        // Get canvas element to convert PixiJS coordinates to screen coordinates
        const canvas = app.canvas;
        if (!canvas) return;

        // Get the screen dimensions (from config)
        const screenWidth = screenConfig.screenWidth || 1116;
        const screenHeight = screenConfig.screenHeight || 706;

        // Get the screen scale from the sprite or calculate it
        let screenScale;
        if (screenConfig.scale !== null && screenConfig.scale !== undefined) {
            screenScale = screenConfig.scale * bgScale;
        } else if (screenSprite && screenSprite.texture) {
            screenScale = screenSprite.scale.x || bgScale;
        } else {
            screenScale = bgScale;
        }

        // Calculate displayed dimensions (in PixiJS world coordinates)
        const displayedWidth = screenWidth * screenScale;
        const displayedHeight = screenHeight * screenScale;

        // Get canvas bounding rect for coordinate conversion
        const canvasRect = canvas.getBoundingClientRect();
        
        // Get the screen container's center position in PixiJS coordinates
        const pixiCenterX = screenContainer.x;
        const pixiCenterY = screenContainer.y;

        // Convert PixiJS center coordinates to top-left coordinates
        const pixiTopLeftX = pixiCenterX - displayedWidth / 2;
        const pixiTopLeftY = pixiCenterY - displayedHeight / 2;

        // Convert from PixiJS coordinates to screen coordinates
        // Since canvas uses resizeTo: window, PixiJS coordinates map directly to canvas pixels
        const canvasWidth = app.screen.width;
        const canvasHeight = app.screen.height;
        
        // Calculate scale factors if canvas size differs from display size
        const scaleX = canvasRect.width / canvasWidth;
        const scaleY = canvasRect.height / canvasHeight;

        // Convert to screen coordinates
        const screenX = canvasRect.left + (pixiTopLeftX * scaleX);
        const screenY = canvasRect.top + (pixiTopLeftY * scaleY);

        // Update container position and size
        youtubeScreenVideoContainer.style.position = 'fixed';
        youtubeScreenVideoContainer.style.left = screenX + 'px';
        youtubeScreenVideoContainer.style.top = screenY + 'px';
        youtubeScreenVideoContainer.style.width = (displayedWidth * scaleX) + 'px';
        youtubeScreenVideoContainer.style.height = (displayedHeight * scaleY) + 'px';
        
        // Only show YouTube embed if loading screen is not active
        if (!isLoadingScreenActive) {
            youtubeScreenVideoContainer.style.display = 'block';
            youtubeScreenVideoContainer.style.visibility = 'visible';
            youtubeScreenVideoContainer.style.opacity = '1';
            youtubeScreenVideoContainer.classList.add('visible');
        } else {
            // Keep hidden during loading screen
            youtubeScreenVideoContainer.style.visibility = 'hidden';
            youtubeScreenVideoContainer.style.opacity = '0';
        }
        
        // Update iframe to fill container (if available)
        if (iframeElement) {
            iframeElement.style.width = '100%';
            iframeElement.style.height = '100%';
            iframeElement.style.display = 'block';
        }
    }

    // Function to resize background - Adaptive scaling based on window size
    // This function ensures all sprites (including Discord and Promo) stay fixed like glitch sprite
    function resizeBackground() {
        if (!backgroundSprite) return;

        // CRITICAL: Ensure canvas is properly sized before positioning sprites
        // This fixes sprite positioning issues on Hostinger and other hosting providers
        if (app && app.canvas) {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // Force resize if dimensions don't match
            if (app.screen.width !== windowWidth || app.screen.height !== windowHeight) {
                app.renderer.resize(windowWidth, windowHeight);
            }
        }

        // Ensure Discord and Promo are initialized before positioning (same as glitch)
        // This prevents issues if resizeBackground is called before sprites are fully loaded

        // Use actual window dimensions (not canvas dimensions affected by devicePixelRatio)
        // ALWAYS use fresh dimensions to ensure correct positioning on fullscreen
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // CRITICAL: Ensure we're using the most up-to-date dimensions
        // This is especially important for fullscreen changes

        // Use stored image dimensions (already set when loading background textures)
        // For AnimatedSprite, all frames should have the same dimensions, so we use the stored values
        if (backgroundSprite && backgroundSprite.textures && backgroundSprite.textures[0]) {
            const firstTexture = backgroundSprite.textures[0];
            imageWidth = firstTexture.width || imageWidth;
            imageHeight = firstTexture.height || imageHeight;
        } else if (backgroundSprite && backgroundSprite.texture && backgroundSprite.texture.width > 0) {
            // Fallback: use current texture dimensions
            imageWidth = backgroundSprite.texture.width;
            imageHeight = backgroundSprite.texture.height;
        }

        // Calculate scale to COVER entire screen (fill screen, no black bars)
        // This ensures the image always fills the viewport edge-to-edge
        const scaleX = screenWidth / imageWidth;
        const scaleY = screenHeight / imageHeight;
        let scale = Math.max(scaleX, scaleY); // Use max to cover (fill entire screen, no black spaces)

        // At exactly 1920x1080, ensure scale is 1.0 (100% - natural size)
        if (screenWidth === imageWidth && screenHeight === imageHeight) {
            scale = 1.0;
        }

        // Update sprite scale
        backgroundSprite.scale.set(scale);
        currentScale = scale;

        // Calculate displayed dimensions after scaling (for positioning)
        const displayedWidth = imageWidth * scale;
        const displayedHeight = imageHeight * scale;
        
        // Calculate effective displayed dimensions for original image
        // This accounts for CDN optimization - coordinates are based on original dimensions,
        // but we need to map them to the displayed space correctly
        const originalScaleX = screenWidth / ORIGINAL_IMAGE_WIDTH;
        const originalScaleY = screenHeight / ORIGINAL_IMAGE_HEIGHT;
        const originalScale = Math.max(originalScaleX, originalScaleY);
        const effectiveDisplayedWidth = ORIGINAL_IMAGE_WIDTH * originalScale;
        const effectiveDisplayedHeight = ORIGINAL_IMAGE_HEIGHT * originalScale;

        // Mutator background sprite: use custom scale and position from config
        if (mutatorBgSprite && mutatorBgSprite.texture) {
            // Check if mutator has custom config
            if (mutatorBgSprite.userData && mutatorBgSprite.userData.config) {
                const mutatorConfig = mutatorBgSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The mutator scale should be relative to bg1's scale
                if (mutatorConfig.scale !== null && mutatorConfig.scale !== undefined) {
                    // Multiply by bg1's scale so mutator scales with bg1
                    const mutatorScale = mutatorConfig.scale * scale;
                    mutatorBgSprite.scale.set(mutatorScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const mutatorWidth = mutatorBgSprite.texture.orig?.width || mutatorBgSprite.texture.width || mutatorBgSprite.texture.baseTexture.width || 1920;
                    const mutatorHeight = mutatorBgSprite.texture.orig?.height || mutatorBgSprite.texture.height || mutatorBgSprite.texture.baseTexture.height || 1080;

                    if (mutatorWidth === imageWidth && mutatorHeight === imageHeight) {
                        mutatorBgSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const mutatorScaleX = bg1DisplayedWidth / mutatorWidth;
                        const mutatorScaleY = bg1DisplayedHeight / mutatorHeight;

                        const mutatorScale = Math.max(mutatorScaleX, mutatorScaleY);

                        mutatorBgSprite.scale.set(mutatorScale);
                    }
                }
            } else {

                const mutatorWidth = mutatorBgSprite.texture.orig?.width || mutatorBgSprite.texture.width || mutatorBgSprite.texture.baseTexture.width || 1920;
                const mutatorHeight = mutatorBgSprite.texture.orig?.height || mutatorBgSprite.texture.height || mutatorBgSprite.texture.baseTexture.height || 1080;

                if (mutatorWidth === imageWidth && mutatorHeight === imageHeight) {
                    mutatorBgSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const mutatorScaleX = bg1DisplayedWidth / mutatorWidth;
                    const mutatorScaleY = bg1DisplayedHeight / mutatorHeight;

                    const mutatorScale = Math.max(mutatorScaleX, mutatorScaleY);

                    mutatorBgSprite.scale.set(mutatorScale);
                }
            }
        }

        // Mutator capsule sprite: use custom scale and position from config - same technique as cup
        if (mutatorCapsuleSprite && mutatorCapsuleSprite.texture) {
            // Check if capsule has custom config
            if (mutatorCapsuleSprite.userData && mutatorCapsuleSprite.userData.config) {
                const capsuleConfig = mutatorCapsuleSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale - same technique as cup
                // The capsule scale should be relative to bg1's scale
                // Example: if capsuleConfig.scale = 0.4 and bg1 scale = 2.0, then capsule scale = 0.4 * 2.0 = 0.8
                if (capsuleConfig.scale !== null && capsuleConfig.scale !== undefined) {
                    // Multiply by bg1's scale so capsule scales with bg1
                    const capsuleScale = capsuleConfig.scale * scale;
                    mutatorCapsuleSprite.scale.set(capsuleScale);

                    // Scale stroke overlay to match capsule
                    if (mutatorCapsuleStrokeSprite) {
                        mutatorCapsuleStrokeSprite.scale.set(capsuleScale);
                    }
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const capsuleWidth = mutatorCapsuleSprite.texture.orig?.width || mutatorCapsuleSprite.texture.width || mutatorCapsuleSprite.texture.baseTexture.width || 1920;
                    const capsuleHeight = mutatorCapsuleSprite.texture.orig?.height || mutatorCapsuleSprite.texture.height || mutatorCapsuleSprite.texture.baseTexture.height || 1080;

                    if (capsuleWidth === imageWidth && capsuleHeight === imageHeight) {
                        mutatorCapsuleSprite.scale.set(scale);
                        // Scale stroke overlay to match capsule
                        if (mutatorCapsuleStrokeSprite) {
                            mutatorCapsuleStrokeSprite.scale.set(scale);
                        }
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const capsuleScaleX = bg1DisplayedWidth / capsuleWidth;
                        const capsuleScaleY = bg1DisplayedHeight / capsuleHeight;

                        const capsuleScale = Math.max(capsuleScaleX, capsuleScaleY);

                        mutatorCapsuleSprite.scale.set(capsuleScale);
                        // Scale stroke overlay to match capsule
                        if (mutatorCapsuleStrokeSprite) {
                            mutatorCapsuleStrokeSprite.scale.set(capsuleScale);
                        }
                    }
                }
            } else {
                // Default: scale to match bg1's displayed size exactly
                const capsuleWidth = mutatorCapsuleSprite.texture.orig?.width || mutatorCapsuleSprite.texture.width || mutatorCapsuleSprite.texture.baseTexture.width || 1920;
                const capsuleHeight = mutatorCapsuleSprite.texture.orig?.height || mutatorCapsuleSprite.texture.height || mutatorCapsuleSprite.texture.baseTexture.height || 1080;

                if (capsuleWidth === imageWidth && capsuleHeight === imageHeight) {
                    mutatorCapsuleSprite.scale.set(scale);
                    // Scale stroke overlay to match capsule
                    if (mutatorCapsuleStrokeSprite) {
                        mutatorCapsuleStrokeSprite.scale.set(scale);
                    }
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const capsuleScaleX = bg1DisplayedWidth / capsuleWidth;
                    const capsuleScaleY = bg1DisplayedHeight / capsuleHeight;

                    const capsuleScale = Math.max(capsuleScaleX, capsuleScaleY);

                    mutatorCapsuleSprite.scale.set(capsuleScale);
                    // Scale stroke overlay to match capsule
                    if (mutatorCapsuleStrokeSprite) {
                        mutatorCapsuleStrokeSprite.scale.set(capsuleScale);
                    }
                }
            }
        }

        // Cup sprite: use custom scale and position from config
        if (cupSprite && cupSprite.texture) {
            // Check if cup has custom config
            if (cupSprite.userData && cupSprite.userData.config) {
                const cupConfig = cupSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The cup scale should be relative to bg1's scale
                // Example: if cupConfig.scale = 0.4 and bg1 scale = 2.0, then cup scale = 0.4 * 2.0 = 0.8
                if (cupConfig.scale !== null && cupConfig.scale !== undefined) {
                    // Multiply by bg1's scale so cup scales with bg1
                    const cupScale = cupConfig.scale * scale;
                    cupSprite.scale.set(cupScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const cupWidth = cupSprite.texture.orig?.width || cupSprite.texture.width || cupSprite.texture.baseTexture.width || 1920;
                    const cupHeight = cupSprite.texture.orig?.height || cupSprite.texture.height || cupSprite.texture.baseTexture.height || 1080;

                    if (cupWidth === imageWidth && cupHeight === imageHeight) {
                        cupSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const cupScaleX = bg1DisplayedWidth / cupWidth;
                        const cupScaleY = bg1DisplayedHeight / cupHeight;

                        const cupScale = Math.max(cupScaleX, cupScaleY);
                        cupSprite.scale.set(cupScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const cupWidth = cupSprite.texture.orig?.width || cupSprite.texture.width || cupSprite.texture.baseTexture.width || 1920;
                const cupHeight = cupSprite.texture.orig?.height || cupSprite.texture.height || cupSprite.texture.baseTexture.height || 1080;

                if (cupWidth === imageWidth && cupHeight === imageHeight) {
                    cupSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const cupScaleX = bg1DisplayedWidth / cupWidth;
                    const cupScaleY = bg1DisplayedHeight / cupHeight;

                    const cupScale = Math.max(cupScaleX, cupScaleY);
                    cupSprite.scale.set(cupScale);
                }
            }
        }

        // Glitch sprite: use custom scale and position from config - same technique as cup
        if (glitchSprite && glitchSprite.texture) {
            // Check if glitch has custom config
            if (glitchSprite.userData && glitchSprite.userData.config) {
                const glitchConfig = glitchSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The glitch scale should be relative to bg1's scale
                if (glitchConfig.scale !== null && glitchConfig.scale !== undefined) {
                    // Multiply by bg1's scale so glitch scales with bg1
                    const glitchScale = glitchConfig.scale * scale;
                    glitchSprite.scale.set(glitchScale);
                    // Store base scale for hover effects
                    if (glitchSprite.userData) {
                        glitchSprite.userData.baseScale = glitchScale;
                    }
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const glitchWidth = glitchSprite.texture.orig?.width || glitchSprite.texture.width || glitchSprite.texture.baseTexture.width || 1920;
                    const glitchHeight = glitchSprite.texture.orig?.height || glitchSprite.texture.height || glitchSprite.texture.baseTexture.height || 1080;

                    if (glitchWidth === imageWidth && glitchHeight === imageHeight) {
                        glitchSprite.scale.set(scale);
                        // Store base scale for hover effects
                        if (glitchSprite.userData) {
                            glitchSprite.userData.baseScale = scale;
                        }
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const glitchScaleX = bg1DisplayedWidth / glitchWidth;
                        const glitchScaleY = bg1DisplayedHeight / glitchHeight;

                        const glitchScale = Math.max(glitchScaleX, glitchScaleY);
                        glitchSprite.scale.set(glitchScale);
                        // Store base scale for hover effects
                        if (glitchSprite.userData) {
                            glitchSprite.userData.baseScale = glitchScale;
                        }
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const glitchWidth = glitchSprite.texture.orig?.width || glitchSprite.texture.width || glitchSprite.texture.baseTexture.width || 1920;
                const glitchHeight = glitchSprite.texture.orig?.height || glitchSprite.texture.height || glitchSprite.texture.baseTexture.height || 1080;

                if (glitchWidth === imageWidth && glitchHeight === imageHeight) {
                    glitchSprite.scale.set(scale);
                    // Store base scale for hover effects
                    if (glitchSprite.userData) {
                        glitchSprite.userData.baseScale = scale;
                    }
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const glitchScaleX = bg1DisplayedWidth / glitchWidth;
                    const glitchScaleY = bg1DisplayedHeight / glitchHeight;

                    const glitchScale = Math.max(glitchScaleX, glitchScaleY);
                    glitchSprite.scale.set(glitchScale);
                    // Store base scale for hover effects
                    if (glitchSprite.userData) {
                        glitchSprite.userData.baseScale = glitchScale;
                    }
                }
            }
        }

        // Eye logo sprite: use custom scale and position from config - same technique as cup
        if (eyeLogoSprite && eyeLogoSprite.texture) {
            // Check if eye has custom config
            if (eyeLogoSprite.userData && eyeLogoSprite.userData.config) {
                const eyeConfig = eyeLogoSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The eye scale should be relative to bg1's scale
                if (eyeConfig.scale !== null && eyeConfig.scale !== undefined) {
                    // Multiply by bg1's scale so eye scales with bg1
                    const eyeScale = eyeConfig.scale * scale;
                    eyeLogoSprite.scale.set(eyeScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const eyeWidth = eyeLogoSprite.texture.orig?.width || eyeLogoSprite.texture.width || eyeLogoSprite.texture.baseTexture.width || 1920;
                    const eyeHeight = eyeLogoSprite.texture.orig?.height || eyeLogoSprite.texture.height || eyeLogoSprite.texture.baseTexture.height || 1080;

                    if (eyeWidth === imageWidth && eyeHeight === imageHeight) {
                        eyeLogoSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const eyeScaleX = bg1DisplayedWidth / eyeWidth;
                        const eyeScaleY = bg1DisplayedHeight / eyeHeight;

                        const eyeScale = Math.max(eyeScaleX, eyeScaleY);
                        eyeLogoSprite.scale.set(eyeScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const eyeWidth = eyeLogoSprite.texture.orig?.width || eyeLogoSprite.texture.width || eyeLogoSprite.texture.baseTexture.width || 1920;
                const eyeHeight = eyeLogoSprite.texture.orig?.height || eyeLogoSprite.texture.height || eyeLogoSprite.texture.baseTexture.height || 1080;

                if (eyeWidth === imageWidth && eyeHeight === imageHeight) {
                    eyeLogoSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const eyeScaleX = bg1DisplayedWidth / eyeWidth;
                    const eyeScaleY = bg1DisplayedHeight / eyeHeight;

                    const eyeScale = Math.max(eyeScaleX, eyeScaleY);
                    eyeLogoSprite.scale.set(eyeScale);
                }
            }
        }

        // Discord sprite: use custom scale and position from config - same technique as CCTV
        if (discordSprite && discordSprite.texture) {
            // Check if Discord has custom config
            if (discordSprite.userData && discordSprite.userData.config) {
                const discordConfig = discordSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                if (discordConfig.scale !== null && discordConfig.scale !== undefined) {
                    // Multiply by bg1's scale so Discord scales with bg1
                    const discordScale = discordConfig.scale * scale;
                    discordSprite.scale.set(discordScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const discordWidth = discordSprite.texture.orig?.width || discordSprite.texture.width || discordSprite.texture.baseTexture.width || 246;
                    const discordHeight = discordSprite.texture.orig?.height || discordSprite.texture.height || discordSprite.texture.baseTexture.height || 158;

                    if (discordWidth === imageWidth && discordHeight === imageHeight) {
                        discordSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const discordScaleX = bg1DisplayedWidth / discordWidth;
                        const discordScaleY = bg1DisplayedHeight / discordHeight;

                        const discordScale = Math.max(discordScaleX, discordScaleY);
                        discordSprite.scale.set(discordScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const discordWidth = discordSprite.texture.orig?.width || discordSprite.texture.width || discordSprite.texture.baseTexture.width || 246;
                const discordHeight = discordSprite.texture.orig?.height || discordSprite.texture.height || discordSprite.texture.baseTexture.height || 158;

                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const discordScaleX = bg1DisplayedWidth / discordWidth;
                const discordScaleY = bg1DisplayedHeight / discordHeight;

                const discordScale = Math.max(discordScaleX, discordScaleY);
                discordSprite.scale.set(discordScale);
            }
        }

        // Promo sprite: use custom scale and position from config - same technique as Discord and CCTV
        if (promoSprite && promoSprite.texture) {
            // Check if Promo has custom config
            if (promoSprite.userData && promoSprite.userData.config) {
                const promoConfig = promoSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                if (promoConfig.scale !== null && promoConfig.scale !== undefined) {
                    // Multiply by bg1's scale so Promo scales with bg1
                    const promoScale = promoConfig.scale * scale;
                    promoSprite.scale.set(promoScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const promoWidth = promoSprite.texture.orig?.width || promoSprite.texture.width || promoSprite.texture.baseTexture.width || 223;
                    const promoHeight = promoSprite.texture.orig?.height || promoSprite.texture.height || promoSprite.texture.baseTexture.height || 178;

                    if (promoWidth === imageWidth && promoHeight === imageHeight) {
                        promoSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const promoScaleX = bg1DisplayedWidth / promoWidth;
                        const promoScaleY = bg1DisplayedHeight / promoHeight;

                        const promoScale = Math.max(promoScaleX, promoScaleY);
                        promoSprite.scale.set(promoScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const promoWidth = promoSprite.texture.orig?.width || promoSprite.texture.width || promoSprite.texture.baseTexture.width || 223;
                const promoHeight = promoSprite.texture.orig?.height || promoSprite.texture.height || promoSprite.texture.baseTexture.height || 178;

                if (promoWidth === imageWidth && promoHeight === imageHeight) {
                    promoSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const promoScaleX = bg1DisplayedWidth / promoWidth;
                    const promoScaleY = bg1DisplayedHeight / promoHeight;

                    const promoScale = Math.max(promoScaleX, promoScaleY);
                    promoSprite.scale.set(promoScale);
                }
            }
        }

        // Telegram sprite: use custom scale and position from config - same technique as Discord and Promo
        if (telegramSprite && telegramSprite.texture) {
            // Check if Telegram has custom config
            if (telegramSprite.userData && telegramSprite.userData.config) {
                const telegramConfig = telegramSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                if (telegramConfig.scale !== null && telegramConfig.scale !== undefined) {
                    // Multiply by bg1's scale so Telegram scales with bg1
                    const telegramScale = telegramConfig.scale * scale;
                    telegramSprite.scale.set(telegramScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const telegramWidth = telegramSprite.texture.orig?.width || telegramSprite.texture.width || telegramSprite.texture.baseTexture.width || 300;
                    const telegramHeight = telegramSprite.texture.orig?.height || telegramSprite.texture.height || telegramSprite.texture.baseTexture.height || 244;

                    if (telegramWidth === imageWidth && telegramHeight === imageHeight) {
                        telegramSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const telegramScaleX = bg1DisplayedWidth / telegramWidth;
                        const telegramScaleY = bg1DisplayedHeight / telegramHeight;

                        const telegramScale = Math.max(telegramScaleX, telegramScaleY);
                        telegramSprite.scale.set(telegramScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const telegramWidth = telegramSprite.texture.orig?.width || telegramSprite.texture.width || telegramSprite.texture.baseTexture.width || 300;
                const telegramHeight = telegramSprite.texture.orig?.height || telegramSprite.texture.height || telegramSprite.texture.baseTexture.height || 244;

                if (telegramWidth === imageWidth && telegramHeight === imageHeight) {
                    telegramSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const telegramScaleX = bg1DisplayedWidth / telegramWidth;
                    const telegramScaleY = bg1DisplayedHeight / telegramHeight;

                    const telegramScale = Math.max(telegramScaleX, telegramScaleY);
                    telegramSprite.scale.set(telegramScale);
                }
            }
        }

        // Lights off sprite: use custom scale and position from config - same technique as cup
        if (lightsOffSprite && lightsOffSprite.texture) {
            // Check if lights off has custom config
            if (lightsOffSprite.userData && lightsOffSprite.userData.config) {
                const lightsOffConfig = lightsOffSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The lights off scale should be relative to bg1's scale
                if (lightsOffConfig.scale !== null && lightsOffConfig.scale !== undefined) {
                    // Multiply by bg1's scale so lights off scales with bg1
                    const lightsOffScale = lightsOffConfig.scale * scale;
                    lightsOffSprite.scale.set(lightsOffScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const lightsOffWidth = lightsOffSprite.texture.orig?.width || lightsOffSprite.texture.width || lightsOffSprite.texture.baseTexture.width || 672;
                    const lightsOffHeight = lightsOffSprite.texture.orig?.height || lightsOffSprite.texture.height || lightsOffSprite.texture.baseTexture.height || 1087;

                    if (lightsOffWidth === imageWidth && lightsOffHeight === imageHeight) {
                        lightsOffSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const lightsOffScaleX = bg1DisplayedWidth / lightsOffWidth;
                        const lightsOffScaleY = bg1DisplayedHeight / lightsOffHeight;

                        const lightsOffScale = Math.max(lightsOffScaleX, lightsOffScaleY);
                        lightsOffSprite.scale.set(lightsOffScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const lightsOffWidth = lightsOffSprite.texture.orig?.width || lightsOffSprite.texture.width || lightsOffSprite.texture.baseTexture.width || 672;
                const lightsOffHeight = lightsOffSprite.texture.orig?.height || lightsOffSprite.texture.height || lightsOffSprite.texture.baseTexture.height || 1087;

                if (lightsOffWidth === imageWidth && lightsOffHeight === imageHeight) {
                    lightsOffSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const lightsOffScaleX = bg1DisplayedWidth / lightsOffWidth;
                    const lightsOffScaleY = bg1DisplayedHeight / lightsOffHeight;

                    const lightsOffScale = Math.max(lightsOffScaleX, lightsOffScaleY);
                    lightsOffSprite.scale.set(lightsOffScale);
                }
            }
        }

        // Lights ray sprite: use custom scale and position from config - same technique as CCTV
        if (lightsRaySprite && lightsRaySprite.texture) {
            // Check if lights ray has custom config
            if (lightsRaySprite.userData && lightsRaySprite.userData.config) {
                const lightsRayConfig = lightsRaySprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The lights ray scale should be relative to bg1's scale
                if (lightsRayConfig.scale !== null && lightsRayConfig.scale !== undefined) {
                    // Multiply by bg1's scale so lights ray scales with bg1
                    const lightsRayScale = lightsRayConfig.scale * scale;
                    lightsRaySprite.scale.set(lightsRayScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const lightsRayWidth = lightsRaySprite.texture.orig?.width || lightsRaySprite.texture.width || lightsRaySprite.texture.baseTexture.width || 1920;
                    const lightsRayHeight = lightsRaySprite.texture.orig?.height || lightsRaySprite.texture.height || lightsRaySprite.texture.baseTexture.height || 1080;

                    if (lightsRayWidth === imageWidth && lightsRayHeight === imageHeight) {
                        lightsRaySprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const lightsRayScaleX = bg1DisplayedWidth / lightsRayWidth;
                        const lightsRayScaleY = bg1DisplayedHeight / lightsRayHeight;

                        const lightsRayScale = Math.max(lightsRayScaleX, lightsRayScaleY);
                        lightsRaySprite.scale.set(lightsRayScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const lightsRayWidth = lightsRaySprite.texture.orig?.width || lightsRaySprite.texture.width || lightsRaySprite.texture.baseTexture.width || 1920;
                const lightsRayHeight = lightsRaySprite.texture.orig?.height || lightsRaySprite.texture.height || lightsRaySprite.texture.baseTexture.height || 1080;

                if (lightsRayWidth === imageWidth && lightsRayHeight === imageHeight) {
                    lightsRaySprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const lightsRayScaleX = bg1DisplayedWidth / lightsRayWidth;
                    const lightsRayScaleY = bg1DisplayedHeight / lightsRayHeight;

                    const lightsRayScale = Math.max(lightsRayScaleX, lightsRayScaleY);
                    lightsRaySprite.scale.set(lightsRayScale);
                }
            }
        }

        // Lights switch sprite: use custom scale and position from config - same technique as lights_off
        if (lightsSwitchSprite && lightsSwitchSprite.texture) {
            // Check if lights switch has custom config
            if (lightsSwitchSprite.userData && lightsSwitchSprite.userData.config) {
                const lightsSwitchConfig = lightsSwitchSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The lights switch scale should be relative to bg1's scale
                if (lightsSwitchConfig.scale !== null && lightsSwitchConfig.scale !== undefined) {
                    // Multiply by bg1's scale so lights switch scales with bg1
                    const lightsSwitchScale = lightsSwitchConfig.scale * scale;
                    lightsSwitchSprite.scale.set(lightsSwitchScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const lightsSwitchWidth = lightsSwitchSprite.texture.orig?.width || lightsSwitchSprite.texture.width || lightsSwitchSprite.texture.baseTexture.width || 109;
                    const lightsSwitchHeight = lightsSwitchSprite.texture.orig?.height || lightsSwitchSprite.texture.height || lightsSwitchSprite.texture.baseTexture.height || 843;

                    if (lightsSwitchWidth === imageWidth && lightsSwitchHeight === imageHeight) {
                        lightsSwitchSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const lightsSwitchScaleX = bg1DisplayedWidth / lightsSwitchWidth;
                        const lightsSwitchScaleY = bg1DisplayedHeight / lightsSwitchHeight;

                        const lightsSwitchScale = Math.max(lightsSwitchScaleX, lightsSwitchScaleY);
                        lightsSwitchSprite.scale.set(lightsSwitchScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const lightsSwitchWidth = lightsSwitchSprite.texture.orig?.width || lightsSwitchSprite.texture.width || lightsSwitchSprite.texture.baseTexture.width || 109;
                const lightsSwitchHeight = lightsSwitchSprite.texture.orig?.height || lightsSwitchSprite.texture.height || lightsSwitchSprite.texture.baseTexture.height || 843;

                if (lightsSwitchWidth === imageWidth && lightsSwitchHeight === imageHeight) {
                    lightsSwitchSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const lightsSwitchScaleX = bg1DisplayedWidth / lightsSwitchWidth;
                    const lightsSwitchScaleY = bg1DisplayedHeight / lightsSwitchHeight;

                    const lightsSwitchScale = Math.max(lightsSwitchScaleX, lightsSwitchScaleY);
                    lightsSwitchSprite.scale.set(lightsSwitchScale);
                }
            }
        }

        // Board sprite: use custom scale and position from config - same technique as cup
        if (boardSprite && boardSprite.texture) {
            if (boardSprite.userData && boardSprite.userData.config) {
                const boardConfig = boardSprite.userData.config;

                if (boardConfig.scale !== null && boardConfig.scale !== undefined) {
                    const boardScale = boardConfig.scale * scale;
                    boardSprite.scale.set(boardScale);
                    // Also scale stroke sprite
                    if (boardStrokeSprite) {
                        boardStrokeSprite.scale.set(boardScale);
                    }
                } else {
                    const boardWidth = boardSprite.texture.orig?.width || boardSprite.texture.width || boardSprite.texture.baseTexture.width || 109;
                    const boardHeight = boardSprite.texture.orig?.height || boardSprite.texture.height || boardSprite.texture.baseTexture.height || 843;

                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const boardScaleX = bg1DisplayedWidth / boardWidth;
                    const boardScaleY = bg1DisplayedHeight / boardHeight;

                    const boardScale = Math.max(boardScaleX, boardScaleY);
                    boardSprite.scale.set(boardScale);
                    // Also scale stroke sprite
                    if (boardStrokeSprite) {
                        boardStrokeSprite.scale.set(boardScale);
                    }
                }

                // Position sprite using config
                if (backgroundSprite) {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                    const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                    const normalizedX = boardConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                    const normalizedY = boardConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                    boardSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + boardConfig.offsetX;
                    boardSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + boardConfig.offsetY;
                    boardSprite.visible = true;
                    // Update base position for hover animation (true position that never changes during animation)
                    if (boardSprite.userData) {
                        boardSprite.userData.baseX = boardSprite.x;
                        boardSprite.userData.baseY = boardSprite.y;
                        // If not animating, also update original position
                        if (!boardSprite.userData.isAnimating) {
                            boardSprite.userData.originalX = boardSprite.x;
                            boardSprite.userData.originalY = boardSprite.y;
                        }
                    }

                    // Update stroke position and scale to match board
                    if (boardStrokeSprite && boardSprite) {
                        boardStrokeSprite.x = boardSprite.x;
                        boardStrokeSprite.y = boardSprite.y;
                        boardStrokeSprite.scale.set(boardSprite.scale.x, boardSprite.scale.y);
                    }
                }

                // Position dot at center of board and update size
                if (boardDot) {
                    boardDot.userData.baseRadius = boardDot.userData.baseRadius || 4;
                    boardDot.x = boardSprite.x;
                    boardDot.y = boardSprite.y;
                    boardDot.visible = true;
                }

                // Position label text on mobile/tablet (below dot)
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && boardLabelText && boardDot) {
                    boardLabelText.x = boardDot.x;
                    boardLabelText.y = boardDot.y + 40;
                    boardLabelText.visible = true;
                    app.stage.removeChild(boardLabelText);
                    app.stage.addChild(boardLabelText);
                } else if (boardLabelText) {
                    boardLabelText.visible = false;
                }

            } else {
                // Default: same position/scale as bg1
                const boardWidth = boardSprite.texture.orig?.width || boardSprite.texture.width || boardSprite.texture.baseTexture.width || 109;
                const boardHeight = boardSprite.texture.orig?.height || boardSprite.texture.height || boardSprite.texture.baseTexture.height || 843;

                if (boardWidth === imageWidth && boardHeight === imageHeight) {
                    boardSprite.scale.set(scale);
                    if (boardStrokeSprite) {
                        boardStrokeSprite.scale.set(scale);
                    }
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const boardScaleX = bg1DisplayedWidth / boardWidth;
                    const boardScaleY = bg1DisplayedHeight / boardHeight;

                    const boardScale = Math.max(boardScaleX, boardScaleY);
                    boardSprite.scale.set(boardScale);
                    if (boardStrokeSprite) {
                        boardStrokeSprite.scale.set(boardScale);
                    }
                }

                boardSprite.x = backgroundSprite.x;
                boardSprite.y = backgroundSprite.y;
                boardSprite.visible = true;
                // Update base position for hover animation (true position that never changes during animation)
                if (boardSprite.userData) {
                    boardSprite.userData.baseX = boardSprite.x;
                    boardSprite.userData.baseY = boardSprite.y;
                    // If not animating, also update original position
                    if (!boardSprite.userData.isAnimating) {
                        boardSprite.userData.originalX = boardSprite.x;
                        boardSprite.userData.originalY = boardSprite.y;
                    }
                }
                if (boardStrokeSprite) {
                    boardStrokeSprite.x = boardSprite.x;
                    boardStrokeSprite.y = boardSprite.y;
                }

                if (boardDot) {
                    boardDot.x = boardSprite.x;
                    boardDot.y = boardSprite.y;
                    boardDot.visible = true;
                }
            }
        }

        // CCTV sprite: use custom scale and position from config - same technique as cup
        if (cctvSprite && cctvSprite.texture) {
            // Check if CCTV has custom config
            if (cctvSprite.userData && cctvSprite.userData.config) {
                const cctvConfig = cctvSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The CCTV scale should be relative to bg1's scale
                if (cctvConfig.scale !== null && cctvConfig.scale !== undefined) {
                    // Multiply by bg1's scale so CCTV scales with bg1
                    const cctvScale = cctvConfig.scale * scale;
                    cctvSprite.scale.set(cctvScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const cctvWidth = cctvSprite.texture.orig?.width || cctvSprite.texture.width || cctvSprite.texture.baseTexture.width || 1920;
                    const cctvHeight = cctvSprite.texture.orig?.height || cctvSprite.texture.height || cctvSprite.texture.baseTexture.height || 1080;

                    if (cctvWidth === imageWidth && cctvHeight === imageHeight) {
                        cctvSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const cctvScaleX = bg1DisplayedWidth / cctvWidth;
                        const cctvScaleY = bg1DisplayedHeight / cctvHeight;

                        const cctvScale = Math.max(cctvScaleX, cctvScaleY);
                        cctvSprite.scale.set(cctvScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const cctvWidth = cctvSprite.texture.orig?.width || cctvSprite.texture.width || cctvSprite.texture.baseTexture.width || 1920;
                const cctvHeight = cctvSprite.texture.orig?.height || cctvSprite.texture.height || cctvSprite.texture.baseTexture.height || 1080;

                if (cctvWidth === imageWidth && cctvHeight === imageHeight) {
                    cctvSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const cctvScaleX = bg1DisplayedWidth / cctvWidth;
                    const cctvScaleY = bg1DisplayedHeight / cctvHeight;

                    const cctvScale = Math.max(cctvScaleX, cctvScaleY);
                    cctvSprite.scale.set(cctvScale);
                }
            }
        }

        // Wall Art sprite: use custom scale and position from config - same technique as CCTV
        if (wallArtSprite && wallArtSprite.texture) {
            // Check if Wall Art has custom config
            if (wallArtSprite.userData && wallArtSprite.userData.config) {
                const wallArtConfig = wallArtSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                if (wallArtConfig.scale !== null && wallArtConfig.scale !== undefined) {
                    // Multiply by bg1's scale so wall art scales with bg1
                    const wallArtScale = wallArtConfig.scale * scale;
                    wallArtSprite.scale.set(wallArtScale);
                    // Also scale stroke sprite
                    if (wallArtStrokeSprite) {
                        wallArtStrokeSprite.scale.set(wallArtScale);
                    }
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const wallArtWidth = wallArtSprite.texture.orig?.width || wallArtSprite.texture.width || wallArtSprite.texture.baseTexture.width || 1920;
                    const wallArtHeight = wallArtSprite.texture.orig?.height || wallArtSprite.texture.height || wallArtSprite.texture.baseTexture.height || 1080;

                    if (wallArtWidth === imageWidth && wallArtHeight === imageHeight) {
                        wallArtSprite.scale.set(scale);
                        if (wallArtStrokeSprite) {
                            wallArtStrokeSprite.scale.set(scale);
                        }
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const wallArtScaleX = bg1DisplayedWidth / wallArtWidth;
                        const wallArtScaleY = bg1DisplayedHeight / wallArtHeight;

                        const wallArtScale = Math.max(wallArtScaleX, wallArtScaleY);
                        wallArtSprite.scale.set(wallArtScale);
                        if (wallArtStrokeSprite) {
                            wallArtStrokeSprite.scale.set(wallArtScale);
                        }
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const wallArtWidth = wallArtSprite.texture.orig?.width || wallArtSprite.texture.width || wallArtSprite.texture.baseTexture.width || 1920;
                const wallArtHeight = wallArtSprite.texture.orig?.height || wallArtSprite.texture.height || wallArtSprite.texture.baseTexture.height || 1080;

                if (wallArtWidth === imageWidth && wallArtHeight === imageHeight) {
                    wallArtSprite.scale.set(scale);
                    if (wallArtStrokeSprite) {
                        wallArtStrokeSprite.scale.set(scale);
                    }
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const wallArtScaleX = bg1DisplayedWidth / wallArtWidth;
                    const wallArtScaleY = bg1DisplayedHeight / wallArtHeight;

                    const wallArtScale = Math.max(wallArtScaleX, wallArtScaleY);
                    wallArtSprite.scale.set(wallArtScale);
                    if (wallArtStrokeSprite) {
                        wallArtStrokeSprite.scale.set(wallArtScale);
                    }
                }
            }
        }

        // Blaised sprite: use custom scale and position from config - same technique as CCTV
        if (blaisedSprite && blaisedSprite.texture) {
            // Check if Blaised has custom config
            if (blaisedSprite.userData && blaisedSprite.userData.config) {
                const blaisedConfig = blaisedSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The Blaised scale should be relative to bg1's scale
                if (blaisedConfig.scale !== null && blaisedConfig.scale !== undefined) {
                    // Multiply by bg1's scale so Blaised scales with bg1
                    const blaisedScale = blaisedConfig.scale * scale;
                    blaisedSprite.scale.set(blaisedScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const blaisedWidth = blaisedSprite.texture.orig?.width || blaisedSprite.texture.width || blaisedSprite.texture.baseTexture.width || 1920;
                    const blaisedHeight = blaisedSprite.texture.orig?.height || blaisedSprite.texture.height || blaisedSprite.texture.baseTexture.height || 1080;

                    if (blaisedWidth === imageWidth && blaisedHeight === imageHeight) {
                        blaisedSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const blaisedScaleX = bg1DisplayedWidth / blaisedWidth;
                        const blaisedScaleY = bg1DisplayedHeight / blaisedHeight;

                        const blaisedScale = Math.max(blaisedScaleX, blaisedScaleY);
                        blaisedSprite.scale.set(blaisedScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const blaisedWidth = blaisedSprite.texture.orig?.width || blaisedSprite.texture.width || blaisedSprite.texture.baseTexture.width || 1920;
                const blaisedHeight = blaisedSprite.texture.orig?.height || blaisedSprite.texture.height || blaisedSprite.texture.baseTexture.height || 1080;

                if (blaisedWidth === imageWidth && blaisedHeight === imageHeight) {
                    blaisedSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const blaisedScaleX = bg1DisplayedWidth / blaisedWidth;
                    const blaisedScaleY = bg1DisplayedHeight / blaisedHeight;

                    const blaisedScale = Math.max(blaisedScaleX, blaisedScaleY);
                    blaisedSprite.scale.set(blaisedScale);
                }
            }
        }

        // Blaised Aura sprite: use custom scale and position from config - same technique as Blaised
        if (blaisedAuraSprite && blaisedAuraSprite.texture) {
            // Check if Blaised Aura has custom config
            if (blaisedAuraSprite.userData && blaisedAuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAuraSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The Blaised Aura scale should be relative to bg1's scale
                if (blaisedAuraConfig.scale !== null && blaisedAuraConfig.scale !== undefined) {
                    // Multiply by bg1's scale so Blaised Aura scales with bg1
                    const blaisedAuraScale = blaisedAuraConfig.scale * scale;
                    blaisedAuraSprite.scale.set(blaisedAuraScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const blaisedAuraWidth = blaisedAuraSprite.texture.orig?.width || blaisedAuraSprite.texture.width || blaisedAuraSprite.texture.baseTexture.width || 1920;
                    const blaisedAuraHeight = blaisedAuraSprite.texture.orig?.height || blaisedAuraSprite.texture.height || blaisedAuraSprite.texture.baseTexture.height || 1080;

                    if (blaisedAuraWidth === imageWidth && blaisedAuraHeight === imageHeight) {
                        blaisedAuraSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const blaisedAuraScaleX = bg1DisplayedWidth / blaisedAuraWidth;
                        const blaisedAuraScaleY = bg1DisplayedHeight / blaisedAuraHeight;

                        const blaisedAuraScale = Math.max(blaisedAuraScaleX, blaisedAuraScaleY);
                        blaisedAuraSprite.scale.set(blaisedAuraScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const blaisedAuraWidth = blaisedAuraSprite.texture.orig?.width || blaisedAuraSprite.texture.width || blaisedAuraSprite.texture.baseTexture.width || 1920;
                const blaisedAuraHeight = blaisedAuraSprite.texture.orig?.height || blaisedAuraSprite.texture.height || blaisedAuraSprite.texture.baseTexture.height || 1080;

                if (blaisedAuraWidth === imageWidth && blaisedAuraHeight === imageHeight) {
                    blaisedAuraSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const blaisedAuraScaleX = bg1DisplayedWidth / blaisedAuraWidth;
                    const blaisedAuraScaleY = bg1DisplayedHeight / blaisedAuraHeight;

                    const blaisedAuraScale = Math.max(blaisedAuraScaleX, blaisedAuraScaleY);
                    blaisedAuraSprite.scale.set(blaisedAuraScale);
                }
            }
        }

        // Blaised Action2 sprite: use same scale as blaised sprite
        if (blaisedAction2Sprite && blaisedAction2Sprite.texture && blaisedSprite) {
            blaisedAction2Sprite.scale.set(blaisedSprite.scale.x, blaisedSprite.scale.y);
        }

        // Blaised Action2 Aura sprite: use same scale as blaised aura sprite
        if (blaisedAction2AuraSprite && blaisedAction2AuraSprite.texture && blaisedAuraSprite) {
            blaisedAction2AuraSprite.scale.set(blaisedAuraSprite.scale.x, blaisedAuraSprite.scale.y);
        }

        // Blaised Action3 sprite: use custom scale and position from config (different position from default)
        if (blaisedAction3Sprite && blaisedAction3Sprite.texture) {
            // Check if Blaised Action3 has custom config
            if (blaisedAction3Sprite.userData && blaisedAction3Sprite.userData.config) {
                const blaisedAction3Config = blaisedAction3Sprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The Blaised Action3 scale should be relative to bg1's scale
                if (blaisedAction3Config.scale !== null && blaisedAction3Config.scale !== undefined) {
                    // Multiply by bg1's scale so Blaised Action3 scales with bg1
                    const blaisedAction3Scale = blaisedAction3Config.scale * scale;
                    blaisedAction3Sprite.scale.set(blaisedAction3Scale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const blaisedAction3Width = blaisedAction3Sprite.texture.orig?.width || blaisedAction3Sprite.texture.width || blaisedAction3Sprite.texture.baseTexture.width || 1920;
                    const blaisedAction3Height = blaisedAction3Sprite.texture.orig?.height || blaisedAction3Sprite.texture.height || blaisedAction3Sprite.texture.baseTexture.height || 1080;

                    if (blaisedAction3Width === imageWidth && blaisedAction3Height === imageHeight) {
                        blaisedAction3Sprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const blaisedAction3ScaleX = bg1DisplayedWidth / blaisedAction3Width;
                        const blaisedAction3ScaleY = bg1DisplayedHeight / blaisedAction3Height;

                        const blaisedAction3Scale = Math.max(blaisedAction3ScaleX, blaisedAction3ScaleY);
                        blaisedAction3Sprite.scale.set(blaisedAction3Scale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const blaisedAction3Width = blaisedAction3Sprite.texture.orig?.width || blaisedAction3Sprite.texture.width || blaisedAction3Sprite.texture.baseTexture.width || 1920;
                const blaisedAction3Height = blaisedAction3Sprite.texture.orig?.height || blaisedAction3Sprite.texture.height || blaisedAction3Sprite.texture.baseTexture.height || 1080;

                if (blaisedAction3Width === imageWidth && blaisedAction3Height === imageHeight) {
                    blaisedAction3Sprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const blaisedAction3ScaleX = bg1DisplayedWidth / blaisedAction3Width;
                    const blaisedAction3ScaleY = bg1DisplayedHeight / blaisedAction3Height;

                    const blaisedAction3Scale = Math.max(blaisedAction3ScaleX, blaisedAction3ScaleY);
                    blaisedAction3Sprite.scale.set(blaisedAction3Scale);
                }
            }
        }

        // Blaised Action3 Aura sprite: use custom scale and position from config (same position as action3)
        if (blaisedAction3AuraSprite && blaisedAction3AuraSprite.texture) {
            // Check if Blaised Action3 Aura has custom config
            if (blaisedAction3AuraSprite.userData && blaisedAction3AuraSprite.userData.config) {
                const blaisedAction3AuraConfig = blaisedAction3AuraSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The Blaised Action3 Aura scale should be relative to bg1's scale
                if (blaisedAction3AuraConfig.scale !== null && blaisedAction3AuraConfig.scale !== undefined) {
                    // Multiply by bg1's scale so Blaised Action3 Aura scales with bg1
                    const blaisedAction3AuraScale = blaisedAction3AuraConfig.scale * scale;
                    blaisedAction3AuraSprite.scale.set(blaisedAction3AuraScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const blaisedAction3AuraWidth = blaisedAction3AuraSprite.texture.orig?.width || blaisedAction3AuraSprite.texture.width || blaisedAction3AuraSprite.texture.baseTexture.width || 1920;
                    const blaisedAction3AuraHeight = blaisedAction3AuraSprite.texture.orig?.height || blaisedAction3AuraSprite.texture.height || blaisedAction3AuraSprite.texture.baseTexture.height || 1080;

                    if (blaisedAction3AuraWidth === imageWidth && blaisedAction3AuraHeight === imageHeight) {
                        blaisedAction3AuraSprite.scale.set(scale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const blaisedAction3AuraScaleX = bg1DisplayedWidth / blaisedAction3AuraWidth;
                        const blaisedAction3AuraScaleY = bg1DisplayedHeight / blaisedAction3AuraHeight;

                        const blaisedAction3AuraScale = Math.max(blaisedAction3AuraScaleX, blaisedAction3AuraScaleY);
                        blaisedAction3AuraSprite.scale.set(blaisedAction3AuraScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const blaisedAction3AuraWidth = blaisedAction3AuraSprite.texture.orig?.width || blaisedAction3AuraSprite.texture.width || blaisedAction3AuraSprite.texture.baseTexture.width || 1920;
                const blaisedAction3AuraHeight = blaisedAction3AuraSprite.texture.orig?.height || blaisedAction3AuraSprite.texture.height || blaisedAction3AuraSprite.texture.baseTexture.height || 1080;

                if (blaisedAction3AuraWidth === imageWidth && blaisedAction3AuraHeight === imageHeight) {
                    blaisedAction3AuraSprite.scale.set(scale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const blaisedAction3AuraScaleX = bg1DisplayedWidth / blaisedAction3AuraWidth;
                    const blaisedAction3AuraScaleY = bg1DisplayedHeight / blaisedAction3AuraHeight;

                    const blaisedAction3AuraScale = Math.max(blaisedAction3AuraScaleX, blaisedAction3AuraScaleY);
                    blaisedAction3AuraSprite.scale.set(blaisedAction3AuraScale);
                }
            }
        }

        // Book sprite: use custom scale and position from config - same technique as CCTV
        if (bookSprite && bookSprite.texture) {
            // Check if book has custom config
            if (bookSprite.userData && bookSprite.userData.config) {
                const bookConfig = bookSprite.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The book scale should be relative to bg1's scale
                if (bookConfig.scale !== null && bookConfig.scale !== undefined) {
                    // Multiply by bg1's scale so book scales with bg1
                    const bookScale = bookConfig.scale * scale;
                    bookSprite.scale.set(bookScale);
                    // Scale stroke sprite to match book sprite exactly
                    if (bookStrokeSprite) {
                        bookStrokeSprite.scale.set(bookSprite.scale.x, bookSprite.scale.y);
                    }
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const bookWidth = bookSprite.texture.orig?.width || bookSprite.texture.width || bookSprite.texture.baseTexture.width || 1920;
                    const bookHeight = bookSprite.texture.orig?.height || bookSprite.texture.height || bookSprite.texture.baseTexture.height || 1080;

                    if (bookWidth === imageWidth && bookHeight === imageHeight) {
                        bookSprite.scale.set(scale);
                        // Scale stroke sprite to match book sprite exactly
                        if (bookStrokeSprite) {
                            bookStrokeSprite.scale.set(bookSprite.scale.x, bookSprite.scale.y);
                        }
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const bookScaleX = bg1DisplayedWidth / bookWidth;
                        const bookScaleY = bg1DisplayedHeight / bookHeight;

                        const bookScale = Math.max(bookScaleX, bookScaleY);
                        bookSprite.scale.set(bookScale);
                        // Scale stroke sprite to match book sprite exactly
                        if (bookStrokeSprite) {
                            bookStrokeSprite.scale.set(bookSprite.scale.x, bookSprite.scale.y);
                        }
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const bookWidth = bookSprite.texture.orig?.width || bookSprite.texture.width || bookSprite.texture.baseTexture.width || 1920;
                const bookHeight = bookSprite.texture.orig?.height || bookSprite.texture.height || bookSprite.texture.baseTexture.height || 1080;

                if (bookWidth === imageWidth && bookHeight === imageHeight) {
                    bookSprite.scale.set(scale);
                    // Scale stroke sprite to match book sprite exactly
                    if (bookStrokeSprite) {
                        bookStrokeSprite.scale.set(bookSprite.scale.x, bookSprite.scale.y);
                    }
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const bookScaleX = bg1DisplayedWidth / bookWidth;
                    const bookScaleY = bg1DisplayedHeight / bookHeight;

                    const bookScale = Math.max(bookScaleX, bookScaleY);
                    bookSprite.scale.set(bookScale);
                    // Scale stroke sprite to match book sprite exactly
                    if (bookStrokeSprite) {
                        bookStrokeSprite.scale.set(bookSprite.scale.x, bookSprite.scale.y);
                    }
                }
            }
        }

        // Screen container: use custom scale and position from config - same technique as book
        if (screenContainer && screenSprite && screenSprite.texture) {
            // Check if screen has custom config
            if (screenContainer.userData && screenContainer.userData.config) {
                const screenConfig = screenContainer.userData.config;

                // Use custom scale if specified, otherwise use bg1 scale
                // The screen scale should be relative to bg1's scale
                let screenScale;
                if (screenConfig.scale !== null && screenConfig.scale !== undefined) {
                    // Multiply by bg1's scale so screen scales with bg1
                    screenScale = screenConfig.scale * scale;
                    screenSprite.scale.set(screenScale);
                } else {
                    // Auto-scale to match bg1 (original behavior)
                    const screenWidth = screenSprite.texture.orig?.width || screenSprite.texture.width || screenSprite.texture.baseTexture.width || 1920;
                    const screenHeight = screenSprite.texture.orig?.height || screenSprite.texture.height || screenSprite.texture.baseTexture.height || 1080;

                    if (screenWidth === imageWidth && screenHeight === imageHeight) {
                        screenScale = scale;
                        screenSprite.scale.set(screenScale);
                    } else {
                        const bg1DisplayedWidth = imageWidth * scale;
                        const bg1DisplayedHeight = imageHeight * scale;

                        const screenScaleX = bg1DisplayedWidth / screenWidth;
                        const screenScaleY = bg1DisplayedHeight / screenHeight;

                        screenScale = Math.max(screenScaleX, screenScaleY);
                        screenSprite.scale.set(screenScale);
                    }
                }
            } else {
                // Default behavior: scale to match bg1
                const screenWidth = screenSprite.texture.orig?.width || screenSprite.texture.width || screenSprite.texture.baseTexture.width || 1920;
                const screenHeight = screenSprite.texture.orig?.height || screenSprite.texture.height || screenSprite.texture.baseTexture.height || 1080;

                let screenScale;
                if (screenWidth === imageWidth && screenHeight === imageHeight) {
                    screenScale = scale;
                    screenSprite.scale.set(screenScale);
                } else {
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;

                    const screenScaleX = bg1DisplayedWidth / screenWidth;
                    const screenScaleY = bg1DisplayedHeight / screenHeight;

                    screenScale = Math.max(screenScaleX, screenScaleY);
                    screenSprite.scale.set(screenScale);
                }
            }
        }

        // Only reposition the sprite if not dragging (preserve position during drag)
        // IMPORTANT: Always recenter background on resize to ensure sprites stay fixed
        // This ensures Discord, Promo, and all sprites maintain correct positions
        if (!isDragging) {
            // For cover mode: center the image so it always fills the screen
            // This ensures no black spaces appear - the image will extend beyond viewport edges
            // but will always fill the visible area completely

            // Center horizontally - image will always fill width or extend beyond
            backgroundSprite.x = screenWidth / 2;

            // Center vertically - image will always fill height or extend beyond
            // This ensures no black spaces at top or bottom
            backgroundSprite.y = screenHeight / 2;

            // CRITICAL: Background is now recentered. All sprites (including Discord and Promo)
            // will be positioned relative to this centered background, ensuring they stay fixed
            // like glitch sprite across all screen sizes and fullscreen changes

            // Mutator background sprite: position using config (bg1.png coordinates)
            if (mutatorBgSprite && mutatorBgSprite.userData && mutatorBgSprite.userData.config) {
                const mutatorConfig = mutatorBgSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                // Calculate displayed dimensions based on loaded image (which may be optimized by CDN)
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Normalize coordinates using ORIGINAL image dimensions (before CDN optimization)
                // Then map to the loaded image's displayed space
                const normalizedX = mutatorConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = mutatorConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                // The coordinates are in original image space, but the displayed image is the loaded (optimized) image
                // We need to scale the normalized coordinates to match the loaded image's displayed dimensions
                // Since both images scale to fill the screen, the aspect ratio is maintained
                mutatorBgSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + mutatorConfig.offsetX;
                mutatorBgSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + mutatorConfig.offsetY;
            } else if (mutatorBgSprite) {
                // Default: same position as bg1
                mutatorBgSprite.x = backgroundSprite.x;
                mutatorBgSprite.y = backgroundSprite.y;
            }

            // Mutator capsule sprite: position using config (bg1.png coordinates) - same technique as cup
            if (mutatorCapsuleSprite && mutatorCapsuleSprite.userData && mutatorCapsuleSprite.userData.config) {
                const capsuleConfig = mutatorCapsuleSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates - same technique as cup
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Convert bg1.png coordinates (0-imageWidth, 0-imageHeight) to world coordinates
                const normalizedX = capsuleConfig.bg1X / ORIGINAL_IMAGE_WIDTH; // 0-1
                const normalizedY = capsuleConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT; // 0-1

                mutatorCapsuleSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + capsuleConfig.offsetX;
                mutatorCapsuleSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + capsuleConfig.offsetY;

                // Position stroke overlay to match capsule
                if (mutatorCapsuleStrokeSprite) {
                    mutatorCapsuleStrokeSprite.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleStrokeSprite.y = mutatorCapsuleSprite.y;
                }

                // Position dot and circle text at center of capsule
                if (mutatorCapsuleDot) {
                    mutatorCapsuleDot.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleDot.y = mutatorCapsuleSprite.y;
                }
                // Position label text on mobile/tablet (below dot)
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && mutatorCapsuleLabelText) {
                    mutatorCapsuleLabelText.x = mutatorCapsuleDot.x;
                    mutatorCapsuleLabelText.y = mutatorCapsuleDot.y + 40;
                }
                // Position circle text: on desktop, only when hidden
                if (mutatorCapsuleCircleText && !mutatorCapsuleCircleText.visible) {
                    // On desktop: only position when hidden (when visible, it follows cursor)
                    mutatorCapsuleCircleText.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleCircleText.y = mutatorCapsuleSprite.y;
                }
            } else if (mutatorCapsuleSprite) {
                // Default: same position as bg1
                mutatorCapsuleSprite.x = backgroundSprite.x;
                mutatorCapsuleSprite.y = backgroundSprite.y;

                // Position stroke overlay to match capsule
                if (mutatorCapsuleStrokeSprite) {
                    mutatorCapsuleStrokeSprite.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleStrokeSprite.y = mutatorCapsuleSprite.y;
                }

                // Position dot and circle text at center of capsule
                if (mutatorCapsuleDot) {
                    mutatorCapsuleDot.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleDot.y = mutatorCapsuleSprite.y;
                }
                // Position label text on mobile/tablet (below dot)
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && mutatorCapsuleLabelText) {
                    mutatorCapsuleLabelText.x = mutatorCapsuleDot.x;
                    mutatorCapsuleLabelText.y = mutatorCapsuleDot.y + 40;
                }
                // Position circle text: on desktop, only when hidden
                if (mutatorCapsuleCircleText && !mutatorCapsuleCircleText.visible) {
                    // On desktop: only position when hidden (when visible, it follows cursor)
                    mutatorCapsuleCircleText.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleCircleText.y = mutatorCapsuleSprite.y;
                }
            }

            // Cup sprite: position using config (bg1.png coordinates)
            if (cupSprite && cupSprite.userData && cupSprite.userData.config) {
                const cupConfig = cupSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                // bg1.png is centered at backgroundSprite.x, backgroundSprite.y
                // bg1.png's displayed size = imageWidth * scale x imageHeight * scale
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                // Calculate position relative to bg1's top-left corner
                // bg1X: 0 = left edge, imageWidth = right edge of bg1.png
                // bg1Y: 0 = top edge, imageHeight = bottom edge of bg1.png
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Convert bg1.png coordinates (0-imageWidth, 0-imageHeight) to world coordinates
                const normalizedX = cupConfig.bg1X / ORIGINAL_IMAGE_WIDTH; // 0-1
                const normalizedY = cupConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT; // 0-1

                cupSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + cupConfig.offsetX;
                cupSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + cupConfig.offsetY;

                // Always update base position for animation (even if animating)
                // This ensures cup stays in correct position when background moves during animation
                if (cupSprite.userData) {
                    cupSprite.userData.originalX = cupSprite.x;
                    cupSprite.userData.originalY = cupSprite.y;
                }
            } else if (cupSprite) {
                // Default: same position as bg1
                cupSprite.x = backgroundSprite.x;
                cupSprite.y = backgroundSprite.y;

                // Always update base position for animation (even if animating)
                // This ensures cup stays in correct position when background moves during animation
                if (cupSprite.userData) {
                    cupSprite.userData.originalX = cupSprite.x;
                    cupSprite.userData.originalY = cupSprite.y;
                }
            }

            // Glitch sprite: position using config (bg1.png coordinates) - same technique as cup
            if (glitchSprite && glitchSprite.userData && glitchSprite.userData.config) {
                const glitchConfig = glitchSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                // bg1.png is centered at backgroundSprite.x, backgroundSprite.y
                // bg1.png's displayed size = imageWidth * scale x imageHeight * scale
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                // Calculate position relative to bg1's top-left corner
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Convert bg1.png coordinates (in original space 0-ORIGINAL_IMAGE_WIDTH) to world coordinates
                // Coordinates are in original space (5333x3558), but background is displayed from optimized image (1600x1067)
                // Normalize by original dimensions, then multiply by displayed width (which accounts for the scale)
                const normalizedX = glitchConfig.bg1X / ORIGINAL_IMAGE_WIDTH; // 0-1 in original space
                const normalizedY = glitchConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT; // 0-1 in original space

                glitchSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + glitchConfig.offsetX;
                glitchSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + glitchConfig.offsetY;
            } else if (glitchSprite) {
                // Default: same position as bg1
                glitchSprite.x = backgroundSprite.x;
                glitchSprite.y = backgroundSprite.y;
            }

            // Discord sprite: position using config (bg1.png coordinates) - same technique as glitch
            if (discordSprite && discordSprite.userData && discordSprite.userData.config) {
                const discordConfig = discordSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates - same as working sprites
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Calculate effective displayed dimensions based on ORIGINAL image dimensions
                // This accounts for CDN optimization where loaded image may be different size
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;
                
                // Recalculate bg1Left/bg1Top based on effective dimensions
                const bg1LeftEffective = backgroundSprite.x - effectiveDisplayedWidth / 2;
                const bg1TopEffective = backgroundSprite.y - effectiveDisplayedHeight / 2;

                // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                // Coordinates are in original space (5333x3558), normalize directly to 0-1 range
                const normalizedX = discordConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = discordConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                discordSprite.x = bg1LeftEffective + (normalizedX * effectiveDisplayedWidth) + discordConfig.offsetX;
                discordSprite.y = bg1TopEffective + (normalizedY * effectiveDisplayedHeight) + discordConfig.offsetY;
            } else if (discordSprite) {
                // Default: same position as bg1
                discordSprite.x = backgroundSprite.x;
                discordSprite.y = backgroundSprite.y;
            }

            // Promo sprite: position using config (bg1.png coordinates) - same technique as glitch
            if (promoSprite && promoSprite.userData && promoSprite.userData.config) {
                const promoConfig = promoSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates - same as working sprites
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Calculate effective displayed dimensions based on ORIGINAL image dimensions
                // This accounts for CDN optimization where loaded image may be different size
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;
                
                // Recalculate bg1Left/bg1Top based on effective dimensions
                const bg1LeftEffective = backgroundSprite.x - effectiveDisplayedWidth / 2;
                const bg1TopEffective = backgroundSprite.y - effectiveDisplayedHeight / 2;

                // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                // Coordinates are in original space (5333x3558), normalize directly to 0-1 range
                const normalizedX = promoConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = promoConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                promoSprite.x = bg1LeftEffective + (normalizedX * effectiveDisplayedWidth) + promoConfig.offsetX;
                promoSprite.y = bg1TopEffective + (normalizedY * effectiveDisplayedHeight) + promoConfig.offsetY;
            } else if (promoSprite) {
                // Default: same position as bg1
                promoSprite.x = backgroundSprite.x;
                promoSprite.y = backgroundSprite.y;
            }

            // Telegram sprite: position using config (bg1.png coordinates) - same technique as glitch
            if (telegramSprite && telegramSprite.userData && telegramSprite.userData.config) {
                const telegramConfig = telegramSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates - same as working sprites
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Calculate effective displayed dimensions based on ORIGINAL image dimensions
                // This accounts for CDN optimization where loaded image may be different size
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;
                
                // Recalculate bg1Left/bg1Top based on effective dimensions
                const bg1LeftEffective = backgroundSprite.x - effectiveDisplayedWidth / 2;
                const bg1TopEffective = backgroundSprite.y - effectiveDisplayedHeight / 2;

                // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                // Coordinates are in original space (5333x3558), normalize directly to 0-1 range
                const normalizedX = telegramConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = telegramConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                telegramSprite.x = bg1LeftEffective + (normalizedX * effectiveDisplayedWidth) + telegramConfig.offsetX;
                telegramSprite.y = bg1TopEffective + (normalizedY * effectiveDisplayedHeight) + telegramConfig.offsetY;
            } else if (telegramSprite) {
                // Default: same position as bg1
                telegramSprite.x = backgroundSprite.x;
                telegramSprite.y = backgroundSprite.y;
            }

            // Blaised sprite: position using config (bg1.png coordinates) - same technique as glitch
            if (blaisedSprite && blaisedSprite.userData && blaisedSprite.userData.config) {
                const blaisedConfig = blaisedSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                blaisedSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;
            } else if (blaisedSprite) {
                // Default: same position as bg1
                blaisedSprite.x = backgroundSprite.x;
                blaisedSprite.y = backgroundSprite.y;
            }

            // Blaised Aura sprite: position using config (bg1.png coordinates) - same as blaised sprite
            if (blaisedAuraSprite && blaisedAuraSprite.userData && blaisedAuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAuraSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                blaisedAuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
            } else if (blaisedAuraSprite) {
                // Default: same position as bg1
                blaisedAuraSprite.x = backgroundSprite.x;
                blaisedAuraSprite.y = backgroundSprite.y;
            }

            // Blaised Action2 sprite: position using config (same as blaised sprite)
            if (blaisedAction2Sprite && blaisedAction2Sprite.userData && blaisedAction2Sprite.userData.config) {
                const blaisedConfig = blaisedAction2Sprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction2Sprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedAction2Sprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;
            } else if (blaisedAction2Sprite) {
                blaisedAction2Sprite.x = backgroundSprite.x;
                blaisedAction2Sprite.y = backgroundSprite.y;
            }

            // Blaised Action2 Aura sprite: position using config (same as blaised aura sprite)
            if (blaisedAction2AuraSprite && blaisedAction2AuraSprite.userData && blaisedAction2AuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAction2AuraSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction2AuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAction2AuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
            } else if (blaisedAction2AuraSprite) {
                blaisedAction2AuraSprite.x = backgroundSprite.x;
                blaisedAction2AuraSprite.y = backgroundSprite.y;
            }

            // Blaised Action3 sprite: position using config (different position from default blaised sprite)
            if (blaisedAction3Sprite && blaisedAction3Sprite.userData && blaisedAction3Sprite.userData.config) {
                const blaisedConfig = blaisedAction3Sprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction3Sprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedAction3Sprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;
            } else if (blaisedAction3Sprite) {
                blaisedAction3Sprite.x = backgroundSprite.x;
                blaisedAction3Sprite.y = backgroundSprite.y;
            }

            // Blaised Action3 Aura sprite: position using config (same position as action3 sprite)
            if (blaisedAction3AuraSprite && blaisedAction3AuraSprite.userData && blaisedAction3AuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAction3AuraSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction3AuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAction3AuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
            } else if (blaisedAction3AuraSprite) {
                blaisedAction3AuraSprite.x = backgroundSprite.x;
                blaisedAction3AuraSprite.y = backgroundSprite.y;
            }

            // Blaised Action2 sprite: position using config (same as blaised sprite)
            if (blaisedAction2Sprite && blaisedAction2Sprite.userData && blaisedAction2Sprite.userData.config) {
                const blaisedConfig = blaisedAction2Sprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction2Sprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedAction2Sprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;
            } else if (blaisedAction2Sprite) {
                blaisedAction2Sprite.x = backgroundSprite.x;
                blaisedAction2Sprite.y = backgroundSprite.y;
            }

            // Blaised Action2 Aura sprite: position using config (same as blaised aura sprite)
            if (blaisedAction2AuraSprite && blaisedAction2AuraSprite.userData && blaisedAction2AuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAction2AuraSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction2AuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAction2AuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
            } else if (blaisedAction2AuraSprite) {
                blaisedAction2AuraSprite.x = backgroundSprite.x;
                blaisedAction2AuraSprite.y = backgroundSprite.y;
            }

            // Blaised Action3 sprite: position using config (different position from default blaised sprite)
            if (blaisedAction3Sprite && blaisedAction3Sprite.userData && blaisedAction3Sprite.userData.config) {
                const blaisedConfig = blaisedAction3Sprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction3Sprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedAction3Sprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;
            } else if (blaisedAction3Sprite) {
                blaisedAction3Sprite.x = backgroundSprite.x;
                blaisedAction3Sprite.y = backgroundSprite.y;
            }

            // Blaised Action3 Aura sprite: position using config (same position as action3 sprite)
            if (blaisedAction3AuraSprite && blaisedAction3AuraSprite.userData && blaisedAction3AuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAction3AuraSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction3AuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAction3AuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
            } else if (blaisedAction3AuraSprite) {
                blaisedAction3AuraSprite.x = backgroundSprite.x;
                blaisedAction3AuraSprite.y = backgroundSprite.y;
            }

            // Lights off sprite: position using config (bg1.png coordinates) - same technique as cup
            // Note: Anchor is at (0.5, 0) so sprite swings from top. Position is based on center coordinates.
            if (lightsOffSprite && lightsOffSprite.userData && lightsOffSprite.userData.config) {
                const lightsOffConfig = lightsOffSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                // bg1.png is centered at backgroundSprite.x, backgroundSprite.y
                // bg1.png's displayed size = imageWidth * scale x imageHeight * scale
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                // Calculate position relative to bg1's top-left corner
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Convert bg1.png coordinates (in original space 0-ORIGINAL_IMAGE_WIDTH) to world coordinates
                // Coordinates are in original space (5333x3558), but background is displayed from optimized image (1600x1067)
                // Normalize by original dimensions, then multiply by displayed width (which accounts for the scale)
                const normalizedX = lightsOffConfig.bg1X / ORIGINAL_IMAGE_WIDTH; // 0-1 in original space
                const normalizedY = lightsOffConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT; // 0-1 in original space

                // Calculate center position
                const centerX = bg1Left + (normalizedX * bg1DisplayedWidth) + lightsOffConfig.offsetX;
                const centerY = bg1Top + (normalizedY * bg1DisplayedHeight) + lightsOffConfig.offsetY;

                // Since anchor is at (0.5, 0), we need to adjust Y to position the top at the correct location
                // The config bg1Y is the center Y, but we want the top to be at the correct position
                // Get the sprite's scaled height
                const lightsOffHeight = lightsOffSprite.texture?.orig?.height || lightsOffSprite.texture?.height || 1087;
                const scaledHeight = lightsOffHeight * lightsOffSprite.scale.y;

                // Position so that the top (anchor at 0.5, 0) aligns with the top of the designated area
                // Top Y in bg1 coordinates is 0, center Y is 543, so top should be at centerY - scaledHeight/2
                lightsOffSprite.x = centerX;
                lightsOffSprite.y = centerY - scaledHeight / 2;
            } else if (lightsOffSprite) {
                // Default: same position as bg1
                lightsOffSprite.x = backgroundSprite.x;
                lightsOffSprite.y = backgroundSprite.y;
            }

            // Lights switch sprite: position using config (bg1.png coordinates) - same technique as cup
            // Note: Anchor is at (0.5, 0) so sprite swings from top. Position is based on center coordinates.
            if (lightsSwitchSprite && lightsSwitchSprite.userData && lightsSwitchSprite.userData.config) {
                const lightsSwitchConfig = lightsSwitchSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                // bg1.png is centered at backgroundSprite.x, backgroundSprite.y
                // bg1.png's displayed size = imageWidth * scale x imageHeight * scale
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                // Calculate position relative to bg1's top-left corner
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Convert bg1.png coordinates (in original space 0-ORIGINAL_IMAGE_WIDTH) to world coordinates
                // Coordinates are in original space (5333x3558), but background is displayed from optimized image (1600x1067)
                // Normalize by original dimensions, then multiply by displayed width (which accounts for the scale)
                const normalizedX = lightsSwitchConfig.bg1X / ORIGINAL_IMAGE_WIDTH; // 0-1 in original space
                const normalizedY = lightsSwitchConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT; // 0-1 in original space

                // Calculate center position
                const centerX = bg1Left + (normalizedX * bg1DisplayedWidth) + lightsSwitchConfig.offsetX;
                const centerY = bg1Top + (normalizedY * bg1DisplayedHeight) + lightsSwitchConfig.offsetY;

                // Since anchor is at (0.5, 0), we need to adjust Y to position the top at the correct location
                // The config bg1Y is the center Y, but we want the top to be at the correct position
                // Get the sprite's scaled height
                const lightsSwitchHeight = lightsSwitchSprite.texture?.orig?.height || lightsSwitchSprite.texture?.height || 843;
                const scaledHeight = lightsSwitchHeight * lightsSwitchSprite.scale.y;

                // Position so that the top (anchor at 0.5, 0) aligns with the top of the designated area
                lightsSwitchSprite.x = centerX;
                lightsSwitchSprite.y = centerY - scaledHeight / 2;
            } else if (lightsSwitchSprite) {
                // Default: same position as bg1
                lightsSwitchSprite.x = backgroundSprite.x;
                lightsSwitchSprite.y = backgroundSprite.y;
            }

            // Lights ray sprite: position using config (bg1.png coordinates) - same technique as cup
            if (lightsRaySprite && lightsRaySprite.userData && lightsRaySprite.userData.config) {
                const lightsRayConfig = lightsRaySprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                // bg1.png is centered at backgroundSprite.x, backgroundSprite.y
                // bg1.png's displayed size = imageWidth * scale x imageHeight * scale
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                // Calculate position relative to bg1's top-left corner
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Convert bg1.png coordinates (in original space 0-ORIGINAL_IMAGE_WIDTH) to world coordinates
                // Coordinates are in original space (5333x3558), but background is displayed from optimized image (1600x1067)
                // Normalize by original dimensions, then multiply by displayed width (which accounts for the scale)
                const normalizedX = lightsRayConfig.bg1X / ORIGINAL_IMAGE_WIDTH; // 0-1 in original space
                const normalizedY = lightsRayConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT; // 0-1 in original space

                lightsRaySprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + lightsRayConfig.offsetX;
                lightsRaySprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + lightsRayConfig.offsetY;
            } else if (lightsRaySprite) {
                // Default: same position as bg1
                lightsRaySprite.x = backgroundSprite.x;
                lightsRaySprite.y = backgroundSprite.y;
            }

            // Eye logo sprite: position using config (bg1.png coordinates) - same technique as cup
            if (eyeLogoSprite && eyeLogoSprite.userData && eyeLogoSprite.userData.config) {
                const eyeConfig = eyeLogoSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = eyeConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = eyeConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                eyeLogoSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + eyeConfig.offsetX;
                eyeLogoSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + eyeConfig.offsetY;
            } else if (eyeLogoSprite) {
                // Default: same position as bg1
                eyeLogoSprite.x = backgroundSprite.x;
                eyeLogoSprite.y = backgroundSprite.y;
            }

            // CCTV sprite: position using config (bg1.png coordinates) - same technique as cup
            if (cctvSprite && cctvSprite.userData && cctvSprite.userData.config) {
                const cctvConfig = cctvSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = cctvConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = cctvConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                cctvSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + cctvConfig.offsetX;
                cctvSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + cctvConfig.offsetY;
            } else if (cctvSprite) {
                // Default: same position as bg1
                cctvSprite.x = backgroundSprite.x;
                cctvSprite.y = backgroundSprite.y;
            }

            // Wall Art sprite: position using config (bg1.png coordinates) - same technique as CCTV
            if (wallArtSprite && wallArtSprite.userData && wallArtSprite.userData.config) {
                const wallArtConfig = wallArtSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates - same as working sprites
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Calculate effective displayed dimensions based on ORIGINAL image dimensions
                // This accounts for CDN optimization where loaded image may be different size
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;
                
                // Recalculate bg1Left/bg1Top based on effective dimensions
                const bg1LeftEffective = backgroundSprite.x - effectiveDisplayedWidth / 2;
                const bg1TopEffective = backgroundSprite.y - effectiveDisplayedHeight / 2;

                // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                // Coordinates are in original space (5333x3558), normalize directly to 0-1 range
                const normalizedX = wallArtConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = wallArtConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                wallArtSprite.x = bg1LeftEffective + (normalizedX * effectiveDisplayedWidth) + wallArtConfig.offsetX;
                wallArtSprite.y = bg1TopEffective + (normalizedY * effectiveDisplayedHeight) + wallArtConfig.offsetY;

                // Position dot at center of wall art
                if (wallArtDot) {
                    wallArtDot.x = wallArtSprite.x;
                    wallArtDot.y = wallArtSprite.y;
                }
            // Position label text on mobile/tablet (below dot)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && wallArtLabelText && wallArtDot) {
                wallArtLabelText.x = wallArtDot.x;
                wallArtLabelText.y = wallArtDot.y + 40;
                wallArtLabelText.visible = true; // Make sure it's visible on mobile/tablet
                // Ensure text is on top by bringing it to front
                app.stage.removeChild(wallArtLabelText);
                app.stage.addChild(wallArtLabelText);
            } else if (wallArtLabelText) {
                wallArtLabelText.visible = false; // Hide on desktop
            }
            } else if (wallArtSprite) {
                // Default: same position as bg1
                wallArtSprite.x = backgroundSprite.x;
                wallArtSprite.y = backgroundSprite.y;

                // Position dot at center of wall art
                if (wallArtDot) {
                    wallArtDot.x = wallArtSprite.x;
                    wallArtDot.y = wallArtSprite.y;
                }
            // Position label text on mobile/tablet (below dot)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && wallArtLabelText && wallArtDot) {
                wallArtLabelText.x = wallArtDot.x;
                wallArtLabelText.y = wallArtDot.y + 40;
                wallArtLabelText.visible = true; // Make sure it's visible on mobile/tablet
                // Ensure text is on top by bringing it to front
                app.stage.removeChild(wallArtLabelText);
                app.stage.addChild(wallArtLabelText);
            } else if (wallArtLabelText) {
                wallArtLabelText.visible = false; // Hide on desktop
            }
            }

            // Book sprite: position using config (bg1.png coordinates) - same technique as CCTV
            if (bookSprite && bookSprite.userData && bookSprite.userData.config) {
                const bookConfig = bookSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = bookConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = bookConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                bookSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + bookConfig.offsetX;
                bookSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + bookConfig.offsetY;

                // Position stroke overlay to match book sprite exactly
                if (bookStrokeSprite) {
                    bookStrokeSprite.x = bookSprite.x;
                    bookStrokeSprite.y = bookSprite.y;
                }

                // Position dot at center of book
                if (bookDot) {
                    bookDot.x = bookSprite.x;
                    bookDot.y = bookSprite.y;
                }
                // Position label text on mobile/tablet (below dot)
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && bookLabelText && bookDot) {
                    bookLabelText.x = bookDot.x;
                    bookLabelText.y = bookDot.y + 40;
                    bookLabelText.visible = true; // Make sure it's visible on mobile/tablet
                    // Ensure text is on top by bringing it to front
                    app.stage.removeChild(bookLabelText);
                    app.stage.addChild(bookLabelText);
                } else if (bookLabelText) {
                    bookLabelText.visible = false; // Hide on desktop
                }
            } else if (bookSprite) {
                // Default: same position as bg1 - book sprite always moves with background
                bookSprite.x = backgroundSprite.x;
                bookSprite.y = backgroundSprite.y;

                // Position stroke overlay to match book sprite exactly
                if (bookStrokeSprite) {
                    bookStrokeSprite.x = bookSprite.x;
                    bookStrokeSprite.y = bookSprite.y;
                }
            }

            // Board sprite: position using config (bg1.png coordinates) - same technique as CCTV
            if (boardSprite && boardSprite.userData && boardSprite.userData.config) {
                const boardConfig = boardSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = boardConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = boardConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                boardSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + boardConfig.offsetX;
                boardSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + boardConfig.offsetY;
                // Update original position for hover animation
                if (boardSprite.userData) {
                    boardSprite.userData.originalX = boardSprite.x;
                    boardSprite.userData.originalY = boardSprite.y;
                }
                boardSprite.visible = true;

                // Update stroke position and scale to match board position and scale
                if (boardStrokeSprite && boardSprite) {
                    boardStrokeSprite.x = boardSprite.x;
                    boardStrokeSprite.y = boardSprite.y;
                    boardStrokeSprite.scale.set(boardSprite.scale.x, boardSprite.scale.y);
                }

                if (boardDot) {
                    boardDot.x = boardSprite.x;
                    boardDot.y = boardSprite.y;
                    boardDot.visible = true;
                }

                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && boardLabelText && boardDot) {
                    boardLabelText.x = boardDot.x;
                    boardLabelText.y = boardDot.y + 40;
                    boardLabelText.visible = true;
                    app.stage.removeChild(boardLabelText);
                    app.stage.addChild(boardLabelText);
                } else if (boardLabelText) {
                    boardLabelText.visible = false;
                }

                if (boardCircleText && !boardCircleText.visible) {
                    boardCircleText.x = boardSprite.x;
                    boardCircleText.y = boardSprite.y;
                }
            } else if (boardSprite) {
                boardSprite.x = backgroundSprite.x;
                boardSprite.y = backgroundSprite.y;
                boardSprite.visible = true;
                // Update base position for hover animation (true position that never changes during animation)
                if (boardSprite.userData) {
                    boardSprite.userData.baseX = boardSprite.x;
                    boardSprite.userData.baseY = boardSprite.y;
                    // If not animating, also update original position
                    if (!boardSprite.userData.isAnimating) {
                        boardSprite.userData.originalX = boardSprite.x;
                        boardSprite.userData.originalY = boardSprite.y;
                    }
                }
                if (boardDot) {
                    boardDot.x = boardSprite.x;
                    boardDot.y = boardSprite.y;
                    boardDot.visible = true;
                }
            }

            // Screen container: position using config (bg1.png coordinates) - same technique as book
            if (screenContainer && screenContainer.userData && screenContainer.userData.config) {
                const screenConfig = screenContainer.userData.config;

                // Convert bg1.png coordinates to world coordinates
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = screenConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = screenConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                screenContainer.x = bg1Left + (normalizedX * bg1DisplayedWidth) + screenConfig.offsetX;
                screenContainer.y = bg1Top + (normalizedY * bg1DisplayedHeight) + screenConfig.offsetY;

                // Make screen container visible once positioned
                screenContainer.visible = true;
                
                // Position and size YouTube video iframe to match screen container
                updateYouTubeVideoPosition(screenContainer, screenConfig, scale);
            } else if (screenContainer) {
                // Default: same position as bg1 - screen container always moves with background
                screenContainer.x = backgroundSprite.x;
                screenContainer.y = backgroundSprite.y;
                screenContainer.visible = true;
                
                // Hide YouTube video if no config
                if (youtubeScreenVideoContainer) {
                    youtubeScreenVideoContainer.style.display = 'none';
                    youtubeScreenVideoContainer.classList.remove('visible');
                }
            }

            // Update mutator capsule text position and font size
            updateMutatorText();

        // Update Board text position and font size
        updateBoardText();

            // Update CCTV text position and font size
            updateCctvText();

            // Update Book text position and font size
            updateBookText();

        } else {
            // When dragging, mutator and cup follow background position (using config if available)
            if (mutatorBgSprite && mutatorBgSprite.userData && mutatorBgSprite.userData.config) {
                const mutatorConfig = mutatorBgSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = mutatorConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = mutatorConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                mutatorBgSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + mutatorConfig.offsetX;
                mutatorBgSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + mutatorConfig.offsetY;
            } else if (mutatorBgSprite) {
                mutatorBgSprite.x = backgroundSprite.x;
                mutatorBgSprite.y = backgroundSprite.y;
            }

            if (mutatorCapsuleSprite && mutatorCapsuleSprite.userData && mutatorCapsuleSprite.userData.config) {
                const capsuleConfig = mutatorCapsuleSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = capsuleConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = capsuleConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                mutatorCapsuleSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + capsuleConfig.offsetX;
                mutatorCapsuleSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + capsuleConfig.offsetY;

                // Position stroke overlay to match capsule
                if (mutatorCapsuleStrokeSprite) {
                    mutatorCapsuleStrokeSprite.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleStrokeSprite.y = mutatorCapsuleSprite.y;
                }

                // Position dot and circle text at center of capsule
                if (mutatorCapsuleDot) {
                    mutatorCapsuleDot.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleDot.y = mutatorCapsuleSprite.y;
                }
                // Position label text on mobile/tablet (below dot)
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && mutatorCapsuleLabelText) {
                    mutatorCapsuleLabelText.x = mutatorCapsuleDot.x;
                    mutatorCapsuleLabelText.y = mutatorCapsuleDot.y + 40;
                }
                // Position circle text: on desktop, only when hidden
                if (mutatorCapsuleCircleText && !mutatorCapsuleCircleText.visible) {
                    // On desktop: only position when hidden (when visible, it follows cursor)
                    mutatorCapsuleCircleText.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleCircleText.y = mutatorCapsuleSprite.y;
                }
            } else if (mutatorCapsuleSprite) {
                mutatorCapsuleSprite.x = backgroundSprite.x;
                mutatorCapsuleSprite.y = backgroundSprite.y;

                // Position stroke overlay to match capsule
                if (mutatorCapsuleStrokeSprite) {
                    mutatorCapsuleStrokeSprite.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleStrokeSprite.y = mutatorCapsuleSprite.y;
                }

                // Position dot and circle text at center of capsule
                if (mutatorCapsuleDot) {
                    mutatorCapsuleDot.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleDot.y = mutatorCapsuleSprite.y;
                }
                // Position label text on mobile/tablet (below dot)
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && mutatorCapsuleLabelText) {
                    mutatorCapsuleLabelText.x = mutatorCapsuleDot.x;
                    mutatorCapsuleLabelText.y = mutatorCapsuleDot.y + 40;
                }
                // Position circle text: on desktop, only when hidden
                if (mutatorCapsuleCircleText && !mutatorCapsuleCircleText.visible) {
                    // On desktop: only position when hidden (when visible, it follows cursor)
                    mutatorCapsuleCircleText.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleCircleText.y = mutatorCapsuleSprite.y;
                }
            }
            // Cup sprite: position using config during drag (same logic)
            if (cupSprite && cupSprite.userData && cupSprite.userData.config) {
                const cupConfig = cupSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = cupConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = cupConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                cupSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + cupConfig.offsetX;
                cupSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + cupConfig.offsetY;

                // Always update base position for animation (even if animating)
                // This ensures cup stays in correct position when background moves during animation
                if (cupSprite.userData) {
                    cupSprite.userData.originalX = cupSprite.x;
                    cupSprite.userData.originalY = cupSprite.y;
                }
            } else if (cupSprite) {
                cupSprite.x = backgroundSprite.x;
                // Adjust Y position to account for anchor being at bottom instead of center
                const yAdjust = cupSprite.userData?.yOffsetAdjustment || 0;
                cupSprite.y = backgroundSprite.y + yAdjust;

                // Always update base position for animation (even if animating)
                // This ensures cup stays in correct position when background moves during animation
                if (cupSprite.userData) {
                    cupSprite.userData.originalX = cupSprite.x;
                    cupSprite.userData.originalY = cupSprite.y;
                }
            }

            // Glitch sprite: position using config (bg1.png coordinates) - same technique as cup
            if (glitchSprite && glitchSprite.userData && glitchSprite.userData.config) {
                const glitchConfig = glitchSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                // bg1.png is centered at backgroundSprite.x, backgroundSprite.y
                // bg1.png's displayed size = imageWidth * scale x imageHeight * scale
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                // Calculate position relative to bg1's top-left corner
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Convert bg1.png coordinates (in original space 0-ORIGINAL_IMAGE_WIDTH) to world coordinates
                // Coordinates are in original space (5333x3558), but background is displayed from optimized image (1600x1067)
                // Normalize by original dimensions, then multiply by displayed width (which accounts for the scale)
                const normalizedX = glitchConfig.bg1X / ORIGINAL_IMAGE_WIDTH; // 0-1 in original space
                const normalizedY = glitchConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT; // 0-1 in original space

                glitchSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + glitchConfig.offsetX;
                glitchSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + glitchConfig.offsetY;
            } else if (glitchSprite) {
                // Default: same position as bg1
                glitchSprite.x = backgroundSprite.x;
                glitchSprite.y = backgroundSprite.y;
            }

            // Discord sprite: position using config (bg1.png coordinates) - same technique as glitch
            if (discordSprite && discordSprite.userData && discordSprite.userData.config) {
                const discordConfig = discordSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates - same as working sprites
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Calculate effective displayed dimensions based on ORIGINAL image dimensions
                // This accounts for CDN optimization where loaded image may be different size
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;
                
                // Recalculate bg1Left/bg1Top based on effective dimensions
                const bg1LeftEffective = backgroundSprite.x - effectiveDisplayedWidth / 2;
                const bg1TopEffective = backgroundSprite.y - effectiveDisplayedHeight / 2;

                // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                // Coordinates are in original space (5333x3558), normalize directly to 0-1 range
                const normalizedX = discordConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = discordConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                discordSprite.x = bg1LeftEffective + (normalizedX * effectiveDisplayedWidth) + discordConfig.offsetX;
                discordSprite.y = bg1TopEffective + (normalizedY * effectiveDisplayedHeight) + discordConfig.offsetY;
            } else if (discordSprite) {
                // Default: same position as bg1
                discordSprite.x = backgroundSprite.x;
                discordSprite.y = backgroundSprite.y;
            }

            // Promo sprite: position using config (bg1.png coordinates) - same technique as glitch
            if (promoSprite && promoSprite.userData && promoSprite.userData.config) {
                const promoConfig = promoSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates - same as working sprites
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Calculate effective displayed dimensions based on ORIGINAL image dimensions
                // This accounts for CDN optimization where loaded image may be different size
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;
                
                // Recalculate bg1Left/bg1Top based on effective dimensions
                const bg1LeftEffective = backgroundSprite.x - effectiveDisplayedWidth / 2;
                const bg1TopEffective = backgroundSprite.y - effectiveDisplayedHeight / 2;

                // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                // Coordinates are in original space (5333x3558), normalize directly to 0-1 range
                const normalizedX = promoConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = promoConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                promoSprite.x = bg1LeftEffective + (normalizedX * effectiveDisplayedWidth) + promoConfig.offsetX;
                promoSprite.y = bg1TopEffective + (normalizedY * effectiveDisplayedHeight) + promoConfig.offsetY;
            } else if (promoSprite) {
                // Default: same position as bg1
                promoSprite.x = backgroundSprite.x;
                promoSprite.y = backgroundSprite.y;
            }

            // Telegram sprite: position using config (bg1.png coordinates) - same technique as glitch
            if (telegramSprite && telegramSprite.userData && telegramSprite.userData.config) {
                const telegramConfig = telegramSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates - same as working sprites
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Calculate effective displayed dimensions based on ORIGINAL image dimensions
                // This accounts for CDN optimization where loaded image may be different size
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;
                
                // Recalculate bg1Left/bg1Top based on effective dimensions
                const bg1LeftEffective = backgroundSprite.x - effectiveDisplayedWidth / 2;
                const bg1TopEffective = backgroundSprite.y - effectiveDisplayedHeight / 2;

                // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                // Coordinates are in original space (5333x3558), normalize directly to 0-1 range
                const normalizedX = telegramConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = telegramConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                telegramSprite.x = bg1LeftEffective + (normalizedX * effectiveDisplayedWidth) + telegramConfig.offsetX;
                telegramSprite.y = bg1TopEffective + (normalizedY * effectiveDisplayedHeight) + telegramConfig.offsetY;
            } else if (telegramSprite) {
                // Default: same position as bg1
                telegramSprite.x = backgroundSprite.x;
                telegramSprite.y = backgroundSprite.y;
            }

            // Blaised sprite: position using config (bg1.png coordinates) - same technique as glitch
            if (blaisedSprite && blaisedSprite.userData && blaisedSprite.userData.config) {
                const blaisedConfig = blaisedSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                blaisedSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;
            } else if (blaisedSprite) {
                // Default: same position as bg1
                blaisedSprite.x = backgroundSprite.x;
                blaisedSprite.y = backgroundSprite.y;
            }

            // Blaised Aura sprite: position using config (bg1.png coordinates) - same as blaised sprite
            if (blaisedAuraSprite && blaisedAuraSprite.userData && blaisedAuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAuraSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                blaisedAuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
            } else if (blaisedAuraSprite) {
                // Default: same position as bg1
                blaisedAuraSprite.x = backgroundSprite.x;
                blaisedAuraSprite.y = backgroundSprite.y;
            }

            // Blaised Action2 sprite: position using config (same as blaised sprite)
            if (blaisedAction2Sprite && blaisedAction2Sprite.userData && blaisedAction2Sprite.userData.config) {
                const blaisedConfig = blaisedAction2Sprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction2Sprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedAction2Sprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;
            } else if (blaisedAction2Sprite) {
                blaisedAction2Sprite.x = backgroundSprite.x;
                blaisedAction2Sprite.y = backgroundSprite.y;
            }

            // Blaised Action2 Aura sprite: position using config (same as blaised aura sprite)
            if (blaisedAction2AuraSprite && blaisedAction2AuraSprite.userData && blaisedAction2AuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAction2AuraSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction2AuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAction2AuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
            } else if (blaisedAction2AuraSprite) {
                blaisedAction2AuraSprite.x = backgroundSprite.x;
                blaisedAction2AuraSprite.y = backgroundSprite.y;
            }

            // Blaised Action3 sprite: position using config (different position from default blaised sprite)
            if (blaisedAction3Sprite && blaisedAction3Sprite.userData && blaisedAction3Sprite.userData.config) {
                const blaisedConfig = blaisedAction3Sprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction3Sprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedAction3Sprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;
            } else if (blaisedAction3Sprite) {
                blaisedAction3Sprite.x = backgroundSprite.x;
                blaisedAction3Sprite.y = backgroundSprite.y;
            }

            // Blaised Action3 Aura sprite: position using config (same position as action3 sprite)
            if (blaisedAction3AuraSprite && blaisedAction3AuraSprite.userData && blaisedAction3AuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAction3AuraSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction3AuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAction3AuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
            } else if (blaisedAction3AuraSprite) {
                blaisedAction3AuraSprite.x = backgroundSprite.x;
                blaisedAction3AuraSprite.y = backgroundSprite.y;
            }

            // Lights off sprite: position using config during drag (same logic)
            if (lightsOffSprite && lightsOffSprite.userData && lightsOffSprite.userData.config) {
                const lightsOffConfig = lightsOffSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = lightsOffConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = lightsOffConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                // Calculate effective displayed dimensions for original image
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;

                // Calculate center position
                const centerX = bg1Left + (normalizedX * effectiveDisplayedWidth) + lightsOffConfig.offsetX;
                const centerY = bg1Top + (normalizedY * effectiveDisplayedHeight) + lightsOffConfig.offsetY;

                // Since anchor is at (0.5, 0), adjust Y to position the top correctly
                const lightsOffHeight = lightsOffSprite.texture?.orig?.height || lightsOffSprite.texture?.height || 1087;
                const scaledHeight = lightsOffHeight * lightsOffSprite.scale.y;

                lightsOffSprite.x = centerX;
                lightsOffSprite.y = centerY - scaledHeight / 2;
            } else if (lightsOffSprite) {
                lightsOffSprite.x = backgroundSprite.x;
                lightsOffSprite.y = backgroundSprite.y;
            }

            // Lights switch sprite: position using config during drag (same logic)
            if (lightsSwitchSprite && lightsSwitchSprite.userData && lightsSwitchSprite.userData.config) {
                const lightsSwitchConfig = lightsSwitchSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = lightsSwitchConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = lightsSwitchConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                // Calculate effective displayed dimensions for original image
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;

                // Calculate center position
                const centerX = bg1Left + (normalizedX * effectiveDisplayedWidth) + lightsSwitchConfig.offsetX;
                const centerY = bg1Top + (normalizedY * effectiveDisplayedHeight) + lightsSwitchConfig.offsetY;

                // Since anchor is at (0.5, 0), adjust Y to position the top correctly
                const lightsSwitchHeight = lightsSwitchSprite.texture?.orig?.height || lightsSwitchSprite.texture?.height || 843;
                const scaledHeight = lightsSwitchHeight * lightsSwitchSprite.scale.y;

                lightsSwitchSprite.x = centerX;
                lightsSwitchSprite.y = centerY - scaledHeight / 2;
            } else if (lightsSwitchSprite) {
                lightsSwitchSprite.x = backgroundSprite.x;
                lightsSwitchSprite.y = backgroundSprite.y;
            }

            // Lights ray sprite: position using config during drag (same logic)
            if (lightsRaySprite && lightsRaySprite.userData && lightsRaySprite.userData.config) {
                const lightsRayConfig = lightsRaySprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = lightsRayConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = lightsRayConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                // Calculate effective displayed dimensions for original image
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;

                lightsRaySprite.x = bg1Left + (normalizedX * effectiveDisplayedWidth) + lightsRayConfig.offsetX;
                lightsRaySprite.y = bg1Top + (normalizedY * effectiveDisplayedHeight) + lightsRayConfig.offsetY;
            } else if (lightsRaySprite) {
                lightsRaySprite.x = backgroundSprite.x;
                lightsRaySprite.y = backgroundSprite.y;
            }

            // Eye logo sprite: position using config during drag (same logic)
            if (eyeLogoSprite && eyeLogoSprite.userData && eyeLogoSprite.userData.config) {
                const eyeConfig = eyeLogoSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = eyeConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = eyeConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                eyeLogoSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + eyeConfig.offsetX;
                eyeLogoSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + eyeConfig.offsetY;
            } else if (eyeLogoSprite) {
                eyeLogoSprite.x = backgroundSprite.x;
                eyeLogoSprite.y = backgroundSprite.y;
            }

            // CCTV sprite: position using config during drag (same logic)
            if (cctvSprite && cctvSprite.userData && cctvSprite.userData.config) {
                const cctvConfig = cctvSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = cctvConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = cctvConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                cctvSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + cctvConfig.offsetX;
                cctvSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + cctvConfig.offsetY;
            } else if (cctvSprite) {
                cctvSprite.x = backgroundSprite.x;
                cctvSprite.y = backgroundSprite.y;
            }

            // Wall Art sprite: position using config (bg1.png coordinates) - same technique as CCTV
            if (wallArtSprite && wallArtSprite.userData && wallArtSprite.userData.config) {
                const wallArtConfig = wallArtSprite.userData.config;

                // Convert bg1.png coordinates to world coordinates - same as working sprites
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                // Calculate effective displayed dimensions based on ORIGINAL image dimensions
                // This accounts for CDN optimization where loaded image may be different size
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;
                
                // Recalculate bg1Left/bg1Top based on effective dimensions
                const bg1LeftEffective = backgroundSprite.x - effectiveDisplayedWidth / 2;
                const bg1TopEffective = backgroundSprite.y - effectiveDisplayedHeight / 2;

                // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                // Coordinates are in original space (5333x3558), normalize directly to 0-1 range
                const normalizedX = wallArtConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = wallArtConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                wallArtSprite.x = bg1LeftEffective + (normalizedX * effectiveDisplayedWidth) + wallArtConfig.offsetX;
                wallArtSprite.y = bg1TopEffective + (normalizedY * effectiveDisplayedHeight) + wallArtConfig.offsetY;

                // Position dot at center of wall art
                if (wallArtDot) {
                    wallArtDot.x = wallArtSprite.x;
                    wallArtDot.y = wallArtSprite.y;
                }
            // Position label text on mobile/tablet (below dot)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && wallArtLabelText && wallArtDot) {
                wallArtLabelText.x = wallArtDot.x;
                wallArtLabelText.y = wallArtDot.y + 40;
                wallArtLabelText.visible = true; // Make sure it's visible on mobile/tablet
                // Ensure text is on top by bringing it to front
                app.stage.removeChild(wallArtLabelText);
                app.stage.addChild(wallArtLabelText);
            } else if (wallArtLabelText) {
                wallArtLabelText.visible = false; // Hide on desktop
            }
            } else if (wallArtSprite) {
                // Default: same position as bg1
                wallArtSprite.x = backgroundSprite.x;
                wallArtSprite.y = backgroundSprite.y;

                // Position dot at center of wall art
                if (wallArtDot) {
                    wallArtDot.x = wallArtSprite.x;
                    wallArtDot.y = wallArtSprite.y;
                }
            // Position label text on mobile/tablet (below dot)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && wallArtLabelText && wallArtDot) {
                wallArtLabelText.x = wallArtDot.x;
                wallArtLabelText.y = wallArtDot.y + 40;
                wallArtLabelText.visible = true; // Make sure it's visible on mobile/tablet
                // Ensure text is on top by bringing it to front
                app.stage.removeChild(wallArtLabelText);
                app.stage.addChild(wallArtLabelText);
            } else if (wallArtLabelText) {
                wallArtLabelText.visible = false; // Hide on desktop
            }
            }

            // Book sprite: position using config during drag (same logic)
            if (bookSprite && bookSprite.userData && bookSprite.userData.config) {
                const bookConfig = bookSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = bookConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = bookConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                // Calculate new position - book sprite always moves with background (no cursor offset)
                bookSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + bookConfig.offsetX;
                bookSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + bookConfig.offsetY;

                // Position stroke overlay to match book sprite exactly
                if (bookStrokeSprite) {
                    bookStrokeSprite.x = bookSprite.x;
                    bookStrokeSprite.y = bookSprite.y;
                }

                // Position dot at center of book
                if (bookDot) {
                    bookDot.x = bookSprite.x;
                    bookDot.y = bookSprite.y;
                }
            } else if (bookSprite) {
                bookSprite.x = backgroundSprite.x;
                bookSprite.y = backgroundSprite.y;
                
                // Update base position for cursor-following animation
                if (bookSprite.userData) {
                    if (!bookSprite.userData.isHovered) {
                        bookSprite.userData.baseX = bookSprite.x;
                        bookSprite.userData.baseY = bookSprite.y;
                    } else {
                        // If hovered, update base position and adjust current position to maintain offset
                        const offsetX = bookSprite.x - (bookSprite.userData.baseX || bookSprite.x);
                        const offsetY = bookSprite.y - (bookSprite.userData.baseY || bookSprite.y);
                        bookSprite.userData.baseX = bookSprite.x;
                        bookSprite.userData.baseY = bookSprite.y;
                        // Maintain the cursor offset
                        bookSprite.x = bookSprite.userData.baseX + offsetX;
                        bookSprite.y = bookSprite.userData.baseY + offsetY;
                    }
                }

                // Position stroke overlay to match book sprite exactly
                if (bookStrokeSprite) {
                    bookStrokeSprite.x = bookSprite.x;
                    bookStrokeSprite.y = bookSprite.y;
                }
            }

            // Board sprite: position using config during drag (same logic as CCTV)
            if (boardSprite && boardSprite.userData && boardSprite.userData.config) {
                const boardConfig = boardSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;

                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                const normalizedX = boardConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = boardConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                boardSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + boardConfig.offsetX;
                boardSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + boardConfig.offsetY;
                // Update original position for hover animation
                if (boardSprite.userData) {
                    boardSprite.userData.originalX = boardSprite.x;
                    boardSprite.userData.originalY = boardSprite.y;
                }
                boardSprite.visible = true;

                // Update stroke position and scale to match board position and scale
                if (boardStrokeSprite && boardSprite) {
                    boardStrokeSprite.x = boardSprite.x;
                    boardStrokeSprite.y = boardSprite.y;
                    boardStrokeSprite.scale.set(boardSprite.scale.x, boardSprite.scale.y);
                }

                if (boardDot) {
                    boardDot.x = boardSprite.x;
                    boardDot.y = boardSprite.y;
                    boardDot.visible = true;
                }

                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && boardLabelText && boardDot) {
                    boardLabelText.x = boardDot.x;
                    boardLabelText.y = boardDot.y + 40;
                    boardLabelText.visible = true;
                    app.stage.removeChild(boardLabelText);
                    app.stage.addChild(boardLabelText);
                } else if (boardLabelText) {
                    boardLabelText.visible = false;
                }

                if (boardCircleText && !boardCircleText.visible) {
                    boardCircleText.x = boardSprite.x;
                    boardCircleText.y = boardSprite.y;
                }
            } else if (boardSprite) {
                boardSprite.x = backgroundSprite.x;
                boardSprite.y = backgroundSprite.y;
                boardSprite.visible = true;
                // Update base position for hover animation (true position that never changes during animation)
                if (boardSprite.userData) {
                    boardSprite.userData.baseX = boardSprite.x;
                    boardSprite.userData.baseY = boardSprite.y;
                    // If not animating, also update original position
                    if (!boardSprite.userData.isAnimating) {
                        boardSprite.userData.originalX = boardSprite.x;
                        boardSprite.userData.originalY = boardSprite.y;
                    }
                }
                if (boardDot) {
                    boardDot.x = boardSprite.x;
                    boardDot.y = boardSprite.y;
                    boardDot.visible = true;
                }
            }

            // Update mutator capsule text position and font size
            updateMutatorText();

            // Update Board text position and font size
            updateBoardText();

            // Update CCTV text position and font size
            updateCctvText();

        }
    }

    // Get mouse/touch position relative to the canvas
    function getPointerPosition(event) {
        const rect = app.canvas.getBoundingClientRect();

        // Handle touch events
        if (event.touches && event.touches.length > 0) {
            return {
                x: event.touches[0].clientX - rect.left,
                y: event.touches[0].clientY - rect.top
            };
        }

        // Handle changedTouches for touchend events
        if (event.changedTouches && event.changedTouches.length > 0) {
            return {
                x: event.changedTouches[0].clientX - rect.left,
                y: event.changedTouches[0].clientY - rect.top
            };
        }

        // Handle mouse events
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    // Handle mouse/touch down - start dragging
    function onPointerDown(event) {
        if (!backgroundSprite) return;

        // Handle multi-touch - only allow single touch for panning
        if (event.touches && event.touches.length > 1) {
            return;
        }

        const pointer = getPointerPosition(event);

        // Convert DOM coordinates to PixiJS coordinates for bounds checking
        const rect = app.canvas.getBoundingClientRect();
        const scaleX = app.canvas.width / rect.width;
        const scaleY = app.canvas.height / rect.height;
        const pixiX = pointer.x * scaleX;
        const pixiY = pointer.y * scaleY;

        // Check if pointer is over an interactive element (CCTV dot, mutator capsule dot, etc.)
        // Don't start dragging if touching an interactive element
        // Use try-catch since some variables might not be defined yet
        try {
            // Check CCTV dot bounds
            if (cctvDot && cctvDot.parent && cctvDot.visible) {
                const dotBounds = cctvDot.getBounds();
                if (pixiX >= dotBounds.x - dotBounds.width/2 && pixiX <= dotBounds.x + dotBounds.width/2 &&
                    pixiY >= dotBounds.y - dotBounds.height/2 && pixiY <= dotBounds.y + dotBounds.height/2) {
                    // Touching CCTV dot - don't start dragging
                    return;
                }
            }

            // Check Board dot bounds
            if (boardDot && boardDot.parent && boardDot.visible) {
                const dotBounds = boardDot.getBounds();
                if (pixiX >= dotBounds.x - dotBounds.width/2 && pixiX <= dotBounds.x + dotBounds.width/2 &&
                    pixiY >= dotBounds.y - dotBounds.height/2 && pixiY <= dotBounds.y + dotBounds.height/2) {
                    // Touching board dot - don't start dragging
                    return;
                }
            }

            // Check mutator capsule dot bounds
            if (mutatorCapsuleDot && mutatorCapsuleDot.parent && mutatorCapsuleDot.visible) {
                const dotBounds = mutatorCapsuleDot.getBounds();
                if (pixiX >= dotBounds.x - dotBounds.width/2 && pixiX <= dotBounds.x + dotBounds.width/2 &&
                    pixiY >= dotBounds.y - dotBounds.height/2 && pixiY <= dotBounds.y + dotBounds.height/2) {
                    // Touching mutator capsule dot - don't start dragging
                    return;
                }
            }

            // Check other interactive sprites
            if (glitchSprite && glitchSprite.parent && glitchSprite.visible && glitchSprite.getBounds) {
                const bounds = glitchSprite.getBounds();
                if (pixiX >= bounds.x && pixiX <= bounds.x + bounds.width &&
                    pixiY >= bounds.y && pixiY <= bounds.y + bounds.height) {
                    return;
                }
            }

            if (cupSprite && cupSprite.parent && cupSprite.visible && cupSprite.getBounds) {
                const bounds = cupSprite.getBounds();
                if (pixiX >= bounds.x && pixiX <= bounds.x + bounds.width &&
                    pixiY >= bounds.y && pixiY <= bounds.y + bounds.height) {
                    return;
                }
            }

            if (eyeLogoSprite && eyeLogoSprite.parent && eyeLogoSprite.visible && eyeLogoSprite.getBounds) {
                const bounds = eyeLogoSprite.getBounds();
                if (pixiX >= bounds.x && pixiX <= bounds.x + bounds.width &&
                    pixiY >= bounds.y && pixiY <= bounds.y + bounds.height) {
                    return;
                }
            }

            // Check book dot bounds
            if (bookDot && bookDot.parent && bookDot.visible) {
                const dotBounds = bookDot.getBounds();
                if (pixiX >= dotBounds.x - dotBounds.width/2 && pixiX <= dotBounds.x + dotBounds.width/2 &&
                    pixiY >= dotBounds.y - dotBounds.height/2 && pixiY <= dotBounds.y + dotBounds.height/2) {
                    // Touching book dot - don't start dragging
                    return;
                }
            }
        } catch (e) {
            // Variables not defined yet or bounds check failed, continue with panning
        }

        // Not over an interactive element, allow panning
        // Stop board sprite animation if it's animating (prevents position drift during pan)
        if (boardSprite && boardSprite.userData && boardSprite.userData.isAnimating) {
            boardSprite.userData.isAnimating = false;
            boardSprite.rotation = 0;
            // Reset to base position immediately
            if (boardSprite.userData.baseX !== undefined && boardSprite.userData.baseY !== undefined) {
                boardSprite.x = boardSprite.userData.baseX;
                boardSprite.y = boardSprite.userData.baseY;
            }
            if (boardStrokeSprite) {
                boardStrokeSprite.rotation = 0;
                boardStrokeSprite.x = boardSprite.x;
                boardStrokeSprite.y = boardSprite.y;
            }
        }
        
        isDragging = true;
        dragStart.x = pointer.x;
        dragStart.y = pointer.y;
        spriteStart.x = backgroundSprite.x;
        spriteStart.y = backgroundSprite.y;
        // Initialize wall art pan tracking
        wallArtLastPanPosition.x = pointer.x;
        wallArtLastPanPosition.y = pointer.y;

        // No custom cursor - use default
        event.preventDefault();
        // Don't stop propagation here - let it bubble if needed
    }

    // Handle mouse/touch move - update sprite position while dragging
    function onPointerMove(event) {
        if (!backgroundSprite || !isDragging) return;

        // Handle multi-touch - stop dragging if multiple touches
        if (event.touches && event.touches.length > 1) {
            isDragging = false;
            return;
        }

        const pointer = getPointerPosition(event);
        const deltaX = pointer.x - dragStart.x;
        const deltaY = pointer.y - dragStart.y;

        // Track panning movement for wall art animation (separate from drag state to avoid glitching)
        if (wallArtSprite && advanceWallArtFrame) {
            const panDeltaX = pointer.x - wallArtLastPanPosition.x;
            const panDeltaY = pointer.y - wallArtLastPanPosition.y;
            const panDistance = Math.sqrt(panDeltaX * panDeltaX + panDeltaY * panDeltaY);

            // Only trigger if panning distance exceeds threshold
            if (panDistance > wallArtPanThreshold) {
                // Determine primary panning direction
                if (Math.abs(panDeltaX) > Math.abs(panDeltaY)) {
                    // Horizontal panning (left/right)
                    if (panDeltaX > 0) {
                        // Panned right - advance frame forward
                        advanceWallArtFrame(1);
                    } else {
                        // Panned left - advance frame backward
                        advanceWallArtFrame(-1);
                    }
                } else {
                    // Vertical panning (top/bottom)
                    if (panDeltaY > 0) {
                        // Panned down - advance frame forward
                        advanceWallArtFrame(1);
                    } else {
                        // Panned up - advance frame backward
                        advanceWallArtFrame(-1);
                    }
                }
                // Update last pan position (don't interfere with drag state)
                wallArtLastPanPosition.x = pointer.x;
                wallArtLastPanPosition.y = pointer.y;
            }
        }

        let newX = spriteStart.x + deltaX;
        let newY = spriteStart.y + deltaY;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const scaledWidth = imageWidth * currentScale;
        const scaledHeight = imageHeight * currentScale;

        const overflowX = Math.max(0, scaledWidth - screenWidth);
        const overflowY = Math.max(0, scaledHeight - screenHeight);

        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;

        const minX = centerX - overflowX / 2;
        const maxX = centerX + overflowX / 2;
        const minY = centerY - overflowY / 2;
        const maxY = centerY + overflowY / 2;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        backgroundSprite.x = newX;
        backgroundSprite.y = newY;

        // Mutator background sprite: update position during drag (maintain relative position to bg1)
        if (mutatorBgSprite) {
            if (mutatorBgSprite.userData && mutatorBgSprite.userData.config) {
                const mutatorConfig = mutatorBgSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = mutatorConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = mutatorConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                mutatorBgSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + mutatorConfig.offsetX;
                mutatorBgSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + mutatorConfig.offsetY;
            } else {
                mutatorBgSprite.x = newX;
                mutatorBgSprite.y = newY;
            }
        }

        // Mutator capsule sprite: update position during drag (maintain relative position to bg1)
        if (mutatorCapsuleSprite) {
            if (mutatorCapsuleSprite.userData && mutatorCapsuleSprite.userData.config) {
                const capsuleConfig = mutatorCapsuleSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = capsuleConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = capsuleConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                mutatorCapsuleSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + capsuleConfig.offsetX;
                mutatorCapsuleSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + capsuleConfig.offsetY;

                // Position stroke overlay to match capsule
                if (mutatorCapsuleStrokeSprite) {
                    mutatorCapsuleStrokeSprite.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleStrokeSprite.y = mutatorCapsuleSprite.y;
                }

                // Position dot and circle text at center of capsule
                if (mutatorCapsuleDot) {
                    mutatorCapsuleDot.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleDot.y = mutatorCapsuleSprite.y;
                }
                // Position label text on mobile/tablet (below dot)
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && mutatorCapsuleLabelText) {
                    mutatorCapsuleLabelText.x = mutatorCapsuleDot.x;
                    mutatorCapsuleLabelText.y = mutatorCapsuleDot.y + 40;
                }
                // Position circle text: on desktop, only when hidden
                if (mutatorCapsuleCircleText && !mutatorCapsuleCircleText.visible) {
                    // On desktop: only position when hidden (when visible, it follows cursor)
                    mutatorCapsuleCircleText.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleCircleText.y = mutatorCapsuleSprite.y;
                }
            } else {
                mutatorCapsuleSprite.x = newX;
                mutatorCapsuleSprite.y = newY;

                // Position stroke overlay to match capsule
                if (mutatorCapsuleStrokeSprite) {
                    mutatorCapsuleStrokeSprite.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleStrokeSprite.y = mutatorCapsuleSprite.y;
                }

                // Position dot and circle text at center of capsule
                if (mutatorCapsuleDot) {
                    mutatorCapsuleDot.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleDot.y = mutatorCapsuleSprite.y;
                }
                // Position label text on mobile/tablet (below dot)
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && mutatorCapsuleLabelText) {
                    mutatorCapsuleLabelText.x = mutatorCapsuleDot.x;
                    mutatorCapsuleLabelText.y = mutatorCapsuleDot.y + 40;
                }
                // Position circle text: on desktop, only when hidden
                if (mutatorCapsuleCircleText && !mutatorCapsuleCircleText.visible) {
                    // On desktop: only position when hidden (when visible, it follows cursor)
                    mutatorCapsuleCircleText.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleCircleText.y = mutatorCapsuleSprite.y;
                }
            }
        }

        // Cup sprite: update position during drag (maintain relative position to bg1)
        if (cupSprite) {
            if (cupSprite.userData && cupSprite.userData.config) {
                // Use config-based positioning during drag
                const cupConfig = cupSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = cupConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = cupConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                cupSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + cupConfig.offsetX;
                cupSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + cupConfig.offsetY;
            } else {
                cupSprite.x = newX;
                cupSprite.y = newY;
            }

            // Always update base position for animation (even if animating)
            // This ensures cup stays in correct position when background moves during animation
            if (cupSprite.userData) {
                cupSprite.userData.originalX = cupSprite.x;
                cupSprite.userData.originalY = cupSprite.y;
            }
        }

        // Glitch sprite: update position during drag (maintain relative position to bg1)
        if (glitchSprite) {
            if (glitchSprite.userData && glitchSprite.userData.config) {
                // Use config-based positioning during drag
                const glitchConfig = glitchSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;
                
                const normalizedX = glitchConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = glitchConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                glitchSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + glitchConfig.offsetX;
                glitchSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + glitchConfig.offsetY;
            } else {
                glitchSprite.x = newX;
                glitchSprite.y = newY;
            }
        }

        // Eye logo sprite: update position during drag (maintain relative position to bg1)
        if (eyeLogoSprite) {
            if (eyeLogoSprite.userData && eyeLogoSprite.userData.config) {
                // Use config-based positioning during drag
                const eyeConfig = eyeLogoSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = eyeConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = eyeConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                eyeLogoSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + eyeConfig.offsetX;
                eyeLogoSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + eyeConfig.offsetY;
            } else {
                eyeLogoSprite.x = newX;
                eyeLogoSprite.y = newY;
            }
        }

        // CCTV sprite: update position during drag (maintain relative position to bg1)
        if (cctvSprite) {
            if (cctvSprite.userData && cctvSprite.userData.config) {
                // Use config-based positioning during drag
                const cctvConfig = cctvSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = cctvConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = cctvConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                cctvSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + cctvConfig.offsetX;
                cctvSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + cctvConfig.offsetY;
            } else {
                cctvSprite.x = newX;
                cctvSprite.y = newY;
            }

        // Board sprite: update position during drag (maintain relative position to bg1)
        if (boardSprite) {
            if (boardSprite.userData && boardSprite.userData.config) {
                // Use config-based positioning during drag
                const boardConfig = boardSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = boardConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = boardConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                const newBoardX = bg1Left + (normalizedX * bg1DisplayedWidth) + boardConfig.offsetX;
                const newBoardY = bg1Top + (normalizedY * bg1DisplayedHeight) + boardConfig.offsetY;
                
                // If board is animating, stop animation and reset to base position first
                if (boardSprite.userData && boardSprite.userData.isAnimating) {
                    boardSprite.userData.isAnimating = false;
                    boardSprite.rotation = 0;
                    if (boardStrokeSprite) {
                        boardStrokeSprite.rotation = 0;
                    }
                }
                
                boardSprite.x = newBoardX;
                boardSprite.y = newBoardY;
                
                // Update base position for hover animation (true position that never changes during animation)
                if (boardSprite.userData) {
                    boardSprite.userData.baseX = newBoardX;
                    boardSprite.userData.baseY = newBoardY;
                    boardSprite.userData.originalX = newBoardX;
                    boardSprite.userData.originalY = newBoardY;
                }

                // Update stroke position and scale to match board
                if (boardStrokeSprite && boardSprite) {
                    boardStrokeSprite.x = boardSprite.x;
                    boardStrokeSprite.y = boardSprite.y;
                    boardStrokeSprite.scale.set(boardSprite.scale.x, boardSprite.scale.y);
                }

                // Update dot position
                if (boardDot) {
                    boardDot.x = boardSprite.x;
                    boardDot.y = boardSprite.y;
                }
            } else {
                boardSprite.x = newX;
                boardSprite.y = newY;
                if (boardStrokeSprite) {
                    boardStrokeSprite.x = boardSprite.x;
                    boardStrokeSprite.y = boardSprite.y;
                }
                if (boardDot) {
                    boardDot.x = boardSprite.x;
                    boardDot.y = boardSprite.y;
                }
            }
            }

        // Discord sprite: update position during drag (maintain relative position to bg1)
        if (discordSprite) {
            if (discordSprite.userData && discordSprite.userData.config) {
                // Use config-based positioning during drag
                const discordConfig = discordSprite.userData.config;
                
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;
                
                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = discordConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = discordConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                discordSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + discordConfig.offsetX;
                discordSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + discordConfig.offsetY;

                // Update scale during drag
                if (discordConfig.scale !== null && discordConfig.scale !== undefined) {
                    const discordScale = discordConfig.scale * currentScale;
                    discordSprite.scale.set(discordScale);
                } else {
                    discordSprite.scale.set(currentScale);
                }
            } else {
                discordSprite.x = newX;
                discordSprite.y = newY;
            }
        }

        // Promo sprite: update position during drag (maintain relative position to bg1)
        if (promoSprite) {
            if (promoSprite.userData && promoSprite.userData.config) {
                // Use config-based positioning during drag
                const promoConfig = promoSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;
                
                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = promoConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = promoConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                promoSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + promoConfig.offsetX;
                promoSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + promoConfig.offsetY;

                // Update scale during drag
                if (promoConfig.scale !== null && promoConfig.scale !== undefined) {
                    const promoScale = promoConfig.scale * currentScale;
                    promoSprite.scale.set(promoScale);
                } else {
                    promoSprite.scale.set(currentScale);
                }
            } else {
                promoSprite.x = newX;
                promoSprite.y = newY;
            }
        }

        // Telegram sprite: update position during drag (maintain relative position to bg1)
        if (telegramSprite) {
            if (telegramSprite.userData && telegramSprite.userData.config) {
                // Use config-based positioning during drag
                const telegramConfig = telegramSprite.userData.config;
                
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;
                
                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = telegramConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = telegramConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                telegramSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + telegramConfig.offsetX;
                telegramSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + telegramConfig.offsetY;

                // Update scale during drag
                if (telegramConfig.scale !== null && telegramConfig.scale !== undefined) {
                    const telegramScale = telegramConfig.scale * currentScale;
                    telegramSprite.scale.set(telegramScale);
                } else {
                    telegramSprite.scale.set(currentScale);
                }
            } else {
                telegramSprite.x = newX;
                telegramSprite.y = newY;
            }
        }

        // Blaised sprite: update position during drag (maintain relative position to bg1)
        if (blaisedSprite) {
            if (blaisedSprite.userData && blaisedSprite.userData.config) {
                // Use config-based positioning during drag
                const blaisedConfig = blaisedSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                blaisedSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;

                // Update scale during drag
                if (blaisedConfig.scale !== null && blaisedConfig.scale !== undefined) {
                    const blaisedScale = blaisedConfig.scale * currentScale;
                    blaisedSprite.scale.set(blaisedScale);
                } else {
                    blaisedSprite.scale.set(currentScale);
                }
            } else {
                blaisedSprite.x = newX;
                blaisedSprite.y = newY;
            }
        }

        // Blaised Aura sprite: update position during drag (maintain relative position to bg1)
        if (blaisedAuraSprite) {
            if (blaisedAuraSprite.userData && blaisedAuraSprite.userData.config) {
                // Use config-based positioning during drag
                const blaisedAuraConfig = blaisedAuraSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                blaisedAuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
                
                // Update scale during drag
                if (blaisedAuraConfig.scale !== null && blaisedAuraConfig.scale !== undefined) {
                    const blaisedAuraScale = blaisedAuraConfig.scale * currentScale;
                    blaisedAuraSprite.scale.set(blaisedAuraScale);
                } else {
                    blaisedAuraSprite.scale.set(currentScale);
                }
            } else {
                blaisedAuraSprite.x = newX;
                blaisedAuraSprite.y = newY;
            }
        }
        
        // Update bubble chat position immediately during drag to keep it aligned with sprite
        // This ensures bubble stays in correct position relative to sprite during panning
        if (window.blaisedUpdateBubblePosition && blaisedBubbleContainer && blaisedBubbleContainer.visible) {
            // Prefer blaisedSprite over aura sprite for bubble positioning during drag
            const sprite = blaisedSprite || blaisedAuraSprite;
            if (sprite) {
                // Force immediate update to prevent lag during horizontal panning
                window.blaisedUpdateBubblePosition(sprite);
            }
        }

        // Blaised Action2 sprite: update position during drag (same as blaised sprite)
        if (blaisedAction2Sprite) {
            if (blaisedAction2Sprite.userData && blaisedAction2Sprite.userData.config) {
                const blaisedConfig = blaisedAction2Sprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;
                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;
                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction2Sprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedAction2Sprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;
                if (blaisedConfig.scale !== null && blaisedConfig.scale !== undefined) {
                    const blaisedScale = blaisedConfig.scale * currentScale;
                    blaisedAction2Sprite.scale.set(blaisedScale);
                } else {
                    blaisedAction2Sprite.scale.set(currentScale);
                }
            } else {
                blaisedAction2Sprite.x = newX;
                blaisedAction2Sprite.y = newY;
            }
        }

        // Blaised Action2 Aura sprite: update position during drag (same as blaised aura sprite)
        if (blaisedAction2AuraSprite) {
            if (blaisedAction2AuraSprite.userData && blaisedAction2AuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAction2AuraSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;
                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;
                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction2AuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAction2AuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
                if (blaisedAuraConfig.scale !== null && blaisedAuraConfig.scale !== undefined) {
                    const blaisedAuraScale = blaisedAuraConfig.scale * currentScale;
                    blaisedAction2AuraSprite.scale.set(blaisedAuraScale);
                } else {
                    blaisedAction2AuraSprite.scale.set(currentScale);
                }
            } else {
                blaisedAction2AuraSprite.x = newX;
                blaisedAction2AuraSprite.y = newY;
            }
        }

        // Blaised Action3 sprite: update position during drag (different position from default blaised sprite)
        if (blaisedAction3Sprite) {
            if (blaisedAction3Sprite.userData && blaisedAction3Sprite.userData.config) {
                const blaisedConfig = blaisedAction3Sprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;
                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;
                const normalizedX = blaisedConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction3Sprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedConfig.offsetX;
                blaisedAction3Sprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedConfig.offsetY;
                if (blaisedConfig.scale !== null && blaisedConfig.scale !== undefined) {
                    const blaisedScale = blaisedConfig.scale * currentScale;
                    blaisedAction3Sprite.scale.set(blaisedScale);
                } else {
                    blaisedAction3Sprite.scale.set(currentScale);
                }
            } else {
                blaisedAction3Sprite.x = newX;
                blaisedAction3Sprite.y = newY;
            }
        }

        // Blaised Action3 Aura sprite: update position during drag (same position as action3 sprite)
        if (blaisedAction3AuraSprite) {
            if (blaisedAction3AuraSprite.userData && blaisedAction3AuraSprite.userData.config) {
                const blaisedAuraConfig = blaisedAction3AuraSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;
                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;
                const normalizedX = blaisedAuraConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = blaisedAuraConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                blaisedAction3AuraSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + blaisedAuraConfig.offsetX;
                blaisedAction3AuraSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + blaisedAuraConfig.offsetY;
                if (blaisedAuraConfig.scale !== null && blaisedAuraConfig.scale !== undefined) {
                    const blaisedAuraScale = blaisedAuraConfig.scale * currentScale;
                    blaisedAction3AuraSprite.scale.set(blaisedAuraScale);
                } else {
                    blaisedAction3AuraSprite.scale.set(currentScale);
                }
            } else {
                blaisedAction3AuraSprite.x = newX;
                blaisedAction3AuraSprite.y = newY;
            }
        }

        // Lights off sprite: update position during drag (maintain relative position to bg1)
        if (lightsOffSprite) {
            if (lightsOffSprite.userData && lightsOffSprite.userData.config) {
                // Use config-based positioning during drag
                const lightsOffConfig = lightsOffSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = lightsOffConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = lightsOffConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                // Calculate effective displayed dimensions for original image
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;

                // Calculate center position
                const centerX = bg1Left + (normalizedX * effectiveDisplayedWidth) + lightsOffConfig.offsetX;
                const centerY = bg1Top + (normalizedY * effectiveDisplayedHeight) + lightsOffConfig.offsetY;

                // Since anchor is at (0.5, 0), adjust Y to position the top correctly
                const lightsOffHeight = lightsOffSprite.texture?.orig?.height || lightsOffSprite.texture?.height || 1087;
                const scaledHeight = lightsOffHeight * lightsOffSprite.scale.y;

                lightsOffSprite.x = centerX;
                lightsOffSprite.y = centerY - scaledHeight / 2;

                // Update scale during drag
                if (lightsOffConfig.scale !== null && lightsOffConfig.scale !== undefined) {
                    const lightsOffScale = lightsOffConfig.scale * currentScale;
                    lightsOffSprite.scale.set(lightsOffScale);
                } else {
                    lightsOffSprite.scale.set(currentScale);
                }
            } else {
                lightsOffSprite.x = newX;
                lightsOffSprite.y = newY;
            }
        }

        // Lights ray sprite: update position during drag (maintain relative position to bg1)
        if (lightsRaySprite) {
            if (lightsRaySprite.userData && lightsRaySprite.userData.config) {
                // Use config-based positioning during drag
                const lightsRayConfig = lightsRaySprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = lightsRayConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = lightsRayConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                // Calculate effective displayed dimensions for original image
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;

                lightsRaySprite.x = bg1Left + (normalizedX * effectiveDisplayedWidth) + lightsRayConfig.offsetX;
                lightsRaySprite.y = bg1Top + (normalizedY * effectiveDisplayedHeight) + lightsRayConfig.offsetY;

                // Update scale during drag
                if (lightsRayConfig.scale !== null && lightsRayConfig.scale !== undefined) {
                    const lightsRayScale = lightsRayConfig.scale * currentScale;
                    lightsRaySprite.scale.set(lightsRayScale);
                } else {
                    lightsRaySprite.scale.set(currentScale);
                }
            } else {
                lightsRaySprite.x = newX;
                lightsRaySprite.y = newY;
            }
        }

        // Lights switch sprite: update position during drag (maintain relative position to bg1)
        if (lightsSwitchSprite) {
            if (lightsSwitchSprite.userData && lightsSwitchSprite.userData.config) {
                // Use config-based positioning during drag
                const lightsSwitchConfig = lightsSwitchSprite.userData.config;
                const bg1DisplayedWidth = imageWidth * currentScale;
                const bg1DisplayedHeight = imageHeight * currentScale;

                const bg1Left = newX - bg1DisplayedWidth / 2;
                const bg1Top = newY - bg1DisplayedHeight / 2;

                const normalizedX = lightsSwitchConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = lightsSwitchConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                // Calculate effective displayed dimensions for original image
                const effectiveDims = getEffectiveDisplayedDimensions();
                const effectiveDisplayedWidth = effectiveDims.width;
                const effectiveDisplayedHeight = effectiveDims.height;

                // Calculate center position
                const centerX = bg1Left + (normalizedX * effectiveDisplayedWidth) + lightsSwitchConfig.offsetX;
                const centerY = bg1Top + (normalizedY * effectiveDisplayedHeight) + lightsSwitchConfig.offsetY;

                // Since anchor is at (0.5, 0), adjust Y to position the top correctly
                const lightsSwitchHeight = lightsSwitchSprite.texture?.orig?.height || lightsSwitchSprite.texture?.height || 843;
                const scaledHeight = lightsSwitchHeight * lightsSwitchSprite.scale.y;

                lightsSwitchSprite.x = centerX;
                lightsSwitchSprite.y = centerY - scaledHeight / 2;

                // Update scale during drag
                if (lightsSwitchConfig.scale !== null && lightsSwitchConfig.scale !== undefined) {
                    const lightsSwitchScale = lightsSwitchConfig.scale * currentScale;
                    lightsSwitchSprite.scale.set(lightsSwitchScale);
                } else {
                    lightsSwitchSprite.scale.set(currentScale);
                }
            } else {
                lightsSwitchSprite.x = newX;
                lightsSwitchSprite.y = newY;
            }
        }

            // Wall Art sprite: update position during drag (maintain relative position to bg1)
            if (wallArtSprite) {
                if (wallArtSprite.userData && wallArtSprite.userData.config) {
                    // Use config-based positioning during drag
                    const wallArtConfig = wallArtSprite.userData.config;
                    const bg1DisplayedWidth = imageWidth * currentScale;
                    const bg1DisplayedHeight = imageHeight * currentScale;

                    const bg1Left = newX - bg1DisplayedWidth / 2;
                    const bg1Top = newY - bg1DisplayedHeight / 2;

                    // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                    const normalizedX = wallArtConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                    const normalizedY = wallArtConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                    wallArtSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + wallArtConfig.offsetX;
                    wallArtSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + wallArtConfig.offsetY;

                    // Position dot at center of wall art
                    if (wallArtDot) {
                        wallArtDot.x = wallArtSprite.x;
                        wallArtDot.y = wallArtSprite.y;
                    }
            // Position label text on mobile/tablet (below dot)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && wallArtLabelText && wallArtDot) {
                wallArtLabelText.x = wallArtDot.x;
                wallArtLabelText.y = wallArtDot.y + 40;
                wallArtLabelText.visible = true; // Make sure it's visible on mobile/tablet
                // Ensure text is on top by bringing it to front
                app.stage.removeChild(wallArtLabelText);
                app.stage.addChild(wallArtLabelText);
            } else if (wallArtLabelText) {
                wallArtLabelText.visible = false; // Hide on desktop
            }
                } else {
                    wallArtSprite.x = newX;
                    wallArtSprite.y = newY;

                    // Position dot at center of wall art
                    if (wallArtDot) {
                        wallArtDot.x = wallArtSprite.x;
                        wallArtDot.y = wallArtSprite.y;
                    }
            // Position label text on mobile/tablet (below dot)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && wallArtLabelText && wallArtDot) {
                wallArtLabelText.x = wallArtDot.x;
                wallArtLabelText.y = wallArtDot.y + 40;
                wallArtLabelText.visible = true; // Make sure it's visible on mobile/tablet
                // Ensure text is on top by bringing it to front
                app.stage.removeChild(wallArtLabelText);
                app.stage.addChild(wallArtLabelText);
            } else if (wallArtLabelText) {
                wallArtLabelText.visible = false; // Hide on desktop
            }
                }
            }

            // Book sprite: update position during drag (maintain relative position to bg1)
            if (bookSprite) {
                if (bookSprite.userData && bookSprite.userData.config) {
                    // Use config-based positioning during drag
                    const bookConfig = bookSprite.userData.config;
                    const bg1DisplayedWidth = imageWidth * currentScale;
                    const bg1DisplayedHeight = imageHeight * currentScale;

                    const bg1Left = newX - bg1DisplayedWidth / 2;
                    const bg1Top = newY - bg1DisplayedHeight / 2;

                    const normalizedX = bookConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                    const normalizedY = bookConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                    bookSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + bookConfig.offsetX;
                    bookSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + bookConfig.offsetY;

                    // Position stroke overlay to match book sprite exactly
                    if (bookStrokeSprite) {
                        bookStrokeSprite.x = bookSprite.x;
                        bookStrokeSprite.y = bookSprite.y;
                    }

                    // Position dot at center of book
                    if (bookDot) {
                        bookDot.x = bookSprite.x;
                        bookDot.y = bookSprite.y;
                    }
                } else {
                    bookSprite.x = newX;
                    bookSprite.y = newY;

                    // Position stroke overlay to match book sprite exactly
                    if (bookStrokeSprite) {
                        bookStrokeSprite.x = bookSprite.x;
                        bookStrokeSprite.y = bookSprite.y;
                    }

                    // Position dot at center of book
                    if (bookDot) {
                        bookDot.x = bookSprite.x;
                        bookDot.y = bookSprite.y;
                    }
                }
            }

            // Screen container: update position during drag (maintain relative position to bg1)
            if (screenContainer) {
                if (screenContainer.userData && screenContainer.userData.config) {
                    // Use config-based positioning during drag
                    const screenConfig = screenContainer.userData.config;
                    const bg1DisplayedWidth = imageWidth * currentScale;
                    const bg1DisplayedHeight = imageHeight * currentScale;

                    const bg1Left = newX - bg1DisplayedWidth / 2;
                    const bg1Top = newY - bg1DisplayedHeight / 2;

                    const normalizedX = screenConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                    const normalizedY = screenConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                    screenContainer.x = bg1Left + (normalizedX * bg1DisplayedWidth) + screenConfig.offsetX;
                    screenContainer.y = bg1Top + (normalizedY * bg1DisplayedHeight) + screenConfig.offsetY;
                    
                    // Update YouTube video position during drag
                    updateYouTubeVideoPosition(screenContainer, screenConfig, currentScale);
                } else {
                    screenContainer.x = newX;
                    screenContainer.y = newY;
                }
            }

            // Update mutator capsule text position and font size
            updateMutatorText();

            // Update Board text position and font size
            updateBoardText();

            // Update CCTV text position and font size
            updateCctvText();

            // Update Book text position and font size
            updateBookText();
        }

        event.preventDefault();
    }

    // Handle mouse/touch up - stop dragging
    function onPointerUp(event) {
        if (!isDragging) return;

        isDragging = false;

        // Stop wall art animation when dragging stops
        if (stopWallArtAnimation && wallArtIsAnimating) {
            // Clear any pending timeout
            if (wallArtAnimationTimeout) {
                clearTimeout(wallArtAnimationTimeout);
                wallArtAnimationTimeout = null;
            }
            // Stop animation immediately
            stopWallArtAnimation();
        }

        // Don't set cursor here - let the ticker and hover handlers update it appropriately
        // They will set it to 'pointer' if circle is active, or 'default'/'grab' otherwise
        event.preventDefault();
    }

    // Setup panning event listeners
    function setupPanning() {
        if (!app.canvas) return;

        // Mouse events (desktop)
        app.canvas.addEventListener('mousedown', onPointerDown);
        document.addEventListener('mousemove', onPointerMove);
        document.addEventListener('mouseup', onPointerUp);

        // Touch events (mobile) - use passive: false to allow preventDefault
        app.canvas.addEventListener('touchstart', onPointerDown, { passive: false });
        document.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('touchend', onPointerUp, { passive: false });
        document.addEventListener('touchcancel', onPointerUp, { passive: false });

        app.canvas.style.cursor = 'grab';
    }

    // Count total assets to load for progress tracking
    // Background: 3 frames
    // Mutator: 1 bg + 10 capsules + 1 stroke = 12
    // Cup: 1
    // Glitch: 6 frames
    // Eye logo: 2 (open + closed)
    // CCTV: 3 frames + 3 strokes = 6
    // Discord: 8 frames
    // Promo: 10 frames
    // Telegram: 9 frames
    // Blaised: 1 frame (static) + 6 auras = 7
    // Wall art: 6 frames + 6 strokes = 12
    // Book: 1 + 1 stroke = 2
    // Lights: 3 (off, switch, ray)
    // Total: 3 + 7 + 1 + 6 + 2 + 6 + 8 + 10 + 9 + 12 + 12 + 2 + 3 + 1 (screen) = 94
    totalAssetsToLoad = 94;
    loadedAssetsCount = 0;

    // Load the background textures using Assets API (bg1.avif, bg2.avif, bg3.avif)
    try {

        // Load all 3 background frames in parallel for faster loading
        const backgroundUrls = Array.from({ length: 3 }, (_, i) => `/assets/bg${i + 1}.avif`);
        const backgroundTextures = await loadAssetsInParallel(backgroundUrls);
        
        // Validate that we have at least one background texture
        if (!backgroundTextures || backgroundTextures.length === 0) {
            // CRITICAL: No background textures loaded
            throw new Error('Failed to load any background textures');
        }
        
        backgroundTextures.forEach((texture, i) => {
            if (texture) {

            }
        });

        // Get dimensions from first frame
        const firstTexture = backgroundTextures[0];
        if (!firstTexture) {
            // CRITICAL: First background texture is missing
            throw new Error('First background texture failed to load');
        }
        imageWidth = firstTexture.width || 1920;
        imageHeight = firstTexture.height || 1080;

        // Create AnimatedSprite from the background textures
        backgroundSprite = new AnimatedSprite(backgroundTextures);
        backgroundSprite.anchor.set(0.5);

        // Configure background animation settings
        backgroundSprite.animationSpeed = 0.1; // Speed of animation (0.1 = 10% of ticker speed, slower animation)
        backgroundSprite.loop = true; // Loop the animation

        // Hide sprite initially until resizeBackground positions it correctly
        backgroundSprite.visible = false;
        backgroundSprite.alpha = 1.0;

        backgroundSprite.play(); // Start the animation

        app.stage.addChild(backgroundSprite);

        try {
            // Load mutator background (static image with hue animation)
            const mutatorBgTexture = await loadAssetWithProgress('/assets/mutator_bg.png');
            mutatorBgSprite = new Sprite(mutatorBgTexture);
            mutatorBgSprite.anchor.set(0.5);

            // Load mutator capsule frames for animation

            const mutatorCapsuleTexturePaths = Array.from({ length: 10 }, (_, index) => `/assets/mutator_capsule${index + 1}.png`);
            // Load all mutator capsule frames in parallel for faster loading
            const mutatorCapsuleTextures = await loadAssetsInParallel(mutatorCapsuleTexturePaths);
            
            // Validate that we have at least some capsule textures
            if (!mutatorCapsuleTextures || mutatorCapsuleTextures.length === 0) {
                // CRITICAL: No mutator capsule textures loaded
                throw new Error('Failed to load mutator capsule textures');
            }
            
            mutatorCapsuleTextures.forEach((texture, i) => {
                if (texture) {

                } else {
                    // Failed to load mutator capsule texture
                }
            });

            // Load mutator capsule stroke overlay for hover effect
            const mutatorCapsuleStrokeTexture = await loadAssetWithProgress('/assets/mutator_capsule_stroke.png');

            // Create AnimatedSprite from the capsule textures
            // Animation will loop through all loaded capsule textures
            mutatorCapsuleSprite = new AnimatedSprite(mutatorCapsuleTextures);
            mutatorCapsuleSprite.anchor.set(0.5);

            // Store global reference for visibility handler
            globalMutatorCapsuleSprite = mutatorCapsuleSprite;

            // Configure capsule animation settings
            mutatorCapsuleSprite.animationSpeed = 0.15; // Speed of animation (0.15 = 15% of ticker speed, reduced for slower animation)
            mutatorCapsuleSprite.loop = true; // Loop the animation

            // Store animation speed for hover effects
            mutatorCapsuleSprite.userData = mutatorCapsuleSprite.userData || {};
            mutatorCapsuleSprite.userData.baseAnimationSpeed = 0.15; // Reduced base speed for slower animation
            mutatorCapsuleSprite.userData.isOverCapsule = false;
            mutatorCapsuleSprite.userData.cursorDistance = 1;
            mutatorCapsuleSprite.userData.lastFrame = -1; // Track previous frame for loop detection

            // Hide sprite initially until resizeBackground positions it correctly
            mutatorCapsuleSprite.visible = false;
            mutatorCapsuleSprite.alpha = 1.0;

            mutatorCapsuleSprite.play(); // Start the animation

            // Ticker to speed up animation at the end (last frame) for faster loop
            app.ticker.add(() => {
                if (!mutatorCapsuleSprite || !mutatorCapsuleSprite.userData) return;

                const data = mutatorCapsuleSprite.userData;
                const currentFrame = Math.floor(mutatorCapsuleSprite.currentFrame);
                const totalFrames = mutatorCapsuleTextures.length;
                const lastFrameIndex = totalFrames - 1; // Frame 9 (mutator_capsule10.png)

                // Check if hover is active (stroke visible indicates hover)
                const isHoverActive = mutatorCapsuleStrokeSprite && mutatorCapsuleStrokeSprite.visible;
                const hoverSpeedMultiplier = 5.0; // Increased for more dramatic glitch effect (was 3.0)
                const targetNormalSpeed = isHoverActive ?
                    (data.baseAnimationSpeed * hoverSpeedMultiplier) :
                    data.baseAnimationSpeed;

                // Speed up when reaching the last frame (frame 9)
                if (currentFrame === lastFrameIndex) {
                    // Set faster speed for quick transition back to frame 0
                    mutatorCapsuleSprite.animationSpeed = targetNormalSpeed * 5.0; // 5x faster
                } else if (currentFrame === 0 && data.lastFrame === lastFrameIndex) {
                    // Just looped back to frame 0, reset to normal speed based on hover state
                    mutatorCapsuleSprite.animationSpeed = targetNormalSpeed;
                }

                data.lastFrame = currentFrame;
            });

            // Get capsule dimensions (use first frame as reference) - same technique as cup
            const firstCapsuleTexture = mutatorCapsuleTextures[0];
            if (!firstCapsuleTexture) {
                // CRITICAL: First mutator capsule texture is missing
                throw new Error('First mutator capsule texture failed to load');
            }
            const capsuleImageWidth = firstCapsuleTexture?.orig?.width || firstCapsuleTexture?.width || firstCapsuleTexture?.baseTexture?.width || 1920;
            const capsuleImageHeight = firstCapsuleTexture?.orig?.height || firstCapsuleTexture?.height || firstCapsuleTexture?.baseTexture?.height || 1080;

            // Mutator capsule positioning and sizing config - same technique as cup
            // Position on bg1.png (in pixels):
            // Left X: 1176, Right X: 2412, Top Y: 584, Bottom Y: 2472
            // Center X: (1176 + 2412) / 2 = 1794
            // Center Y: (584 + 2472) / 2 = 1528
            // Dimensions: width: 1236 pixels, height: 1888 pixels (on bg1.png)
            const mutatorCapsuleConfig = {
                // Capsule dimensions (on bg1.png coordinate space)
                capsuleWidth: 1236,
                capsuleHeight: 1888,

                // Position on bg1.png (center of capsule)
                bg1X: 1794, // Center X position on bg1.png
                bg1Y: 1528, // Center Y position on bg1.png

                // Scale: calculated to make capsule fit its designated space on bg1.png
                // Same technique as cup - relative to bg1's scale
                // The scale will be: (designated size on bg1) / (actual image size) * (bg1 scale)
                // But we store the relative scale factor here, which gets multiplied by bg1 scale in resizeBackground
                scale: 1.0, // Will be calculated below, then multiplied by scaleMultiplier

                // Scale multiplier: adjust this to make capsule larger or smaller
                // 1.0 = calculated size, 0.5 = 50% size, 2.0 = 200% size, etc.
                // Example: 0.5 = smaller, 1.5 = larger, 2.0 = twice as big
                scaleMultiplier: 1.0, // <-- Change this value to rescale: 0.5 = smaller, 1.5 = larger

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make capsule image fit into designated space on bg1.png
            // We want capsule to take up capsuleWidth pixels on bg1
            // So: actualCapsuleWidth * scale = capsuleWidth
            // Therefore: scale = capsuleWidth / actualCapsuleWidth (relative to bg1's coordinate space)
            // NOTE: capsuleWidth is in original image coordinate space, so we need to scale it proportionally
            if (capsuleImageWidth && capsuleImageHeight && mutatorCapsuleConfig.capsuleWidth && mutatorCapsuleConfig.capsuleHeight) {
                // Scale capsuleWidth/capsuleHeight proportionally based on image optimization
                const imageScaleFactorX = imageWidth / ORIGINAL_IMAGE_WIDTH;
                const imageScaleFactorY = imageHeight / ORIGINAL_IMAGE_HEIGHT;
                const scaledCapsuleWidth = mutatorCapsuleConfig.capsuleWidth * imageScaleFactorX;
                const scaledCapsuleHeight = mutatorCapsuleConfig.capsuleHeight * imageScaleFactorY;
                
                const relativeScaleX = scaledCapsuleWidth / capsuleImageWidth;
                const relativeScaleY = scaledCapsuleHeight / capsuleImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                const calculatedScale = Math.min(relativeScaleX, relativeScaleY);

                // Apply scale multiplier to allow easy resizing
                mutatorCapsuleConfig.scale = calculatedScale * mutatorCapsuleConfig.scaleMultiplier;
            } else {
                // Fallback: use natural size with multiplier
                mutatorCapsuleConfig.scale = 1.0 * mutatorCapsuleConfig.scaleMultiplier;
            }

            // Calculate normalized position to check if it's valid
            const normalizedX = mutatorCapsuleConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
            const normalizedY = mutatorCapsuleConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

            // Warn if coordinates seem wrong
            if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) {
                // WARNING: Capsule position is outside bounds
            }
            if (mutatorCapsuleConfig.scale < 0.001) {
                // WARNING: Capsule scale is very small
            }

            // Get mutator background dimensions (same technique as capsule and cup)
            const mutatorBgImageWidth = mutatorBgTexture.orig?.width || mutatorBgTexture.width || mutatorBgTexture.baseTexture.width;
            const mutatorBgImageHeight = mutatorBgTexture.orig?.height || mutatorBgTexture.height || mutatorBgTexture.baseTexture.height;

            // Mutator background positioning and sizing config - same technique as capsule and cup
            // Position on bg1.png (in pixels):
            // Left X: 1177, Right X: 3279, Top Y: 584, Bottom Y: 2473
            // Center X: (1177 + 3279) / 2 = 2228
            // Center Y: (584 + 2473) / 2 = 1528.5
            // Dimensions: width: 2102 pixels, height: 1889 pixels (on bg1.png)
            const mutatorBgConfig = {
                // Mutator background dimensions (on bg1.png coordinate space)
                mutatorBgWidth: 2102,
                mutatorBgHeight: 1889,

                // Position on bg1.png (center of mutator background)
                bg1X: 2228, // Center X position on bg1.png
                bg1Y: 1528.5, // Center Y position on bg1.png

                // Scale: calculated to make mutator background fit its designated space on bg1.png
                // Same technique as capsule and cup - relative to bg1's scale
                scale: 1.0, // Will be calculated below, then multiplied by scaleMultiplier

                // Scale multiplier: adjust this to make mutator background larger or smaller
                // 1.0 = calculated size, 0.5 = 50% size, 2.0 = 200% size, etc.
                scaleMultiplier: 1.0, // <-- Change this value to rescale: 0.5 = smaller, 1.5 = larger

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make mutator background image fit into designated space on bg1.png
            // We want mutator background to take up mutatorBgWidth pixels on bg1
            // So: actualMutatorBgWidth * scale = mutatorBgWidth
            // Therefore: scale = mutatorBgWidth / actualMutatorBgWidth (relative to bg1's coordinate space)
            // NOTE: mutatorBgWidth is in original image coordinate space, so we need to scale it proportionally
            if (mutatorBgImageWidth && mutatorBgImageHeight && mutatorBgConfig.mutatorBgWidth && mutatorBgConfig.mutatorBgHeight) {
                // Scale mutatorBgWidth/mutatorBgHeight proportionally based on image optimization
                const imageScaleFactorX = imageWidth / ORIGINAL_IMAGE_WIDTH;
                const imageScaleFactorY = imageHeight / ORIGINAL_IMAGE_HEIGHT;
                const scaledMutatorBgWidth = mutatorBgConfig.mutatorBgWidth * imageScaleFactorX;
                const scaledMutatorBgHeight = mutatorBgConfig.mutatorBgHeight * imageScaleFactorY;
                
                const relativeScaleX = scaledMutatorBgWidth / mutatorBgImageWidth;
                const relativeScaleY = scaledMutatorBgHeight / mutatorBgImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                const calculatedScale = Math.min(relativeScaleX, relativeScaleY);

                // Apply scale multiplier to allow easy resizing
                mutatorBgConfig.scale = calculatedScale * mutatorBgConfig.scaleMultiplier;
            } else {
                // Fallback: use natural size with multiplier
                mutatorBgConfig.scale = 1.0 * mutatorBgConfig.scaleMultiplier;
            }

            // Calculate normalized position to check if it's valid
            const normalizedBgX = mutatorBgConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
            const normalizedBgY = mutatorBgConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

            // Warn if coordinates seem wrong
            if (normalizedBgX < 0 || normalizedBgX > 1 || normalizedBgY < 0 || normalizedBgY > 1) {
                // WARNING: Mutator background position is outside bounds
            }
            if (mutatorBgConfig.scale < 0.001) {
                // WARNING: Mutator background scale is very small
            }

            // Store config in userData for mutator background sprite (same technique as capsule and cup)
            mutatorBgSprite.userData = mutatorBgSprite.userData || {};
            mutatorBgSprite.userData.config = mutatorBgConfig;

            // Store config in userData for capsule sprite (same technique as cup)
            mutatorCapsuleSprite.userData = mutatorCapsuleSprite.userData || {};
            mutatorCapsuleSprite.userData.config = mutatorCapsuleConfig;

            // Add hue-shifting animation to both mutator background and capsule
            const { ColorMatrixFilter } = PIXI;
            const bgHueFilter = new ColorMatrixFilter();
            const capsuleHueFilter = new ColorMatrixFilter();

            // Ensure filters are enabled
            mutatorBgSprite.filters = [bgHueFilter];
            mutatorCapsuleSprite.filters = [capsuleHueFilter];

            // Make sure sprites are visible
            // Sprites are hidden initially, will be shown after resizeBackground
            // mutatorBgSprite.visible = true;
            // mutatorCapsuleSprite.visible = true;

            // Shared hue rotation for both (same speed)
            let hueRotation = 0;
            const hueSpeed = 0.5;

            // Create hue animation function
            const animateHue = () => {
                if (mutatorBgSprite && mutatorBgSprite.filters && mutatorBgSprite.filters[0] &&
                    mutatorCapsuleSprite && mutatorCapsuleSprite.filters && mutatorCapsuleSprite.filters[0]) {
                    hueRotation += hueSpeed;
                    if (hueRotation >= 360) {
                        hueRotation -= 360;
                    }
                    // Apply same hue rotation to both filters
                    // Reset filter first, then apply hue
                    bgHueFilter.reset();
                    bgHueFilter.hue(hueRotation, false);

                    capsuleHueFilter.reset();
                    capsuleHueFilter.hue(hueRotation, false);

                    // Apply same hue rotation to eye logo if it exists
                    if (eyeLogoSprite && eyeLogoSprite.filters && eyeLogoSprite.filters[0]) {
                        eyeLogoSprite.filters[0].reset();
                        eyeLogoSprite.filters[0].hue(hueRotation, false);
                    }
                }
            };

            // Add hue animation to ticker
            app.ticker.add(animateHue);

            // Create stroke overlay sprite (same config as capsule, positioned on top)
            mutatorCapsuleStrokeSprite = new Sprite(mutatorCapsuleStrokeTexture);
            mutatorCapsuleStrokeSprite.anchor.set(0.5);
            mutatorCapsuleStrokeSprite.visible = false; // Hidden by default, shown on hover
            mutatorCapsuleStrokeSprite.alpha = 1.0;

            // Store config in userData for stroke sprite (same config as capsule)
            mutatorCapsuleStrokeSprite.userData = mutatorCapsuleStrokeSprite.userData || {};
            mutatorCapsuleStrokeSprite.userData.config = mutatorCapsuleConfig;

            // Hide sprites initially until resizeBackground positions them correctly
            mutatorBgSprite.visible = false;
            mutatorCapsuleSprite.visible = false;
            mutatorCapsuleStrokeSprite.visible = false;

            // Add background first (behind), then capsule, then stroke overlay (on top)
            // IMPORTANT: Add mutator sprites AFTER background so they render on top
            app.stage.addChild(mutatorBgSprite);
            app.stage.addChild(mutatorCapsuleSprite);
            app.stage.addChild(mutatorCapsuleStrokeSprite); // Stroke on top of capsule

            // Set initial position (will be updated by resizeBackground, same technique as cup)
            mutatorCapsuleSprite.x = app.screen.width / 2;
            mutatorCapsuleSprite.y = app.screen.height / 2;
            mutatorCapsuleStrokeSprite.x = app.screen.width / 2;
            mutatorCapsuleStrokeSprite.y = app.screen.height / 2;

            // Make capsule interactive for glitch effect on hover
            mutatorCapsuleSprite.eventMode = 'static'; // Static mode - can handle pointer events
            mutatorCapsuleSprite.cursor = 'pointer'; // Show pointer cursor on hover

            // Function to apply instant speed
            const updateCapsuleSpeed = () => {
                if (!mutatorCapsuleSprite || !mutatorCapsuleSprite.userData) return;

                const data = mutatorCapsuleSprite.userData;

                // INSTANT maximum speed when hovering (glitch effect)
                const speedMultiplier = 5.0; // Increased for more dramatic glitch effect (was 3.0)
                const targetSpeed = data.baseAnimationSpeed * speedMultiplier;

                // INSTANT speed change (no interpolation)
                data.currentAnimationSpeed = targetSpeed;
                mutatorCapsuleSprite.animationSpeed = targetSpeed;
            };

            // CRITICAL: Add pointerdown listener FIRST to unlock audio before pointerenter fires
            mutatorCapsuleSprite.on('pointerdown', () => {

                enableAudioOnSpriteInteraction();
            });

            // Glitch effect on hover - speed up animation when pointer enters capsule
            mutatorCapsuleSprite.on('pointerenter', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                if (mutatorCapsuleSprite && mutatorCapsuleSprite.userData) {
                    const data = mutatorCapsuleSprite.userData;
                    const glitchSpeedMultiplier = 5.0; // Fast glitch speed
                    const glitchSpeed = data.baseAnimationSpeed * glitchSpeedMultiplier;
                    mutatorCapsuleSprite.animationSpeed = glitchSpeed;

                }
            });

            // Return to normal speed when pointer leaves capsule
            mutatorCapsuleSprite.on('pointerleave', () => {

                if (mutatorCapsuleSprite && mutatorCapsuleSprite.userData) {
                    const data = mutatorCapsuleSprite.userData;
                    mutatorCapsuleSprite.animationSpeed = data.baseAnimationSpeed;

                }
            });

            // Also handle tap/click for mobile devices
            mutatorCapsuleSprite.on('pointertap', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
            });
            
            mutatorCapsuleSprite.on('pointerdown', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
            });

            // Only the dot triggers the redirect - not the entire capsule sprite
            // Click handler will be added to mutatorCapsuleDot after it's created

            // Function to calculate responsive dot radius based on screen size
            const getResponsiveDotRadius = () => {
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                const minDimension = Math.min(screenWidth, screenHeight);

                // Base size for large screens (desktop) - smaller default
                let baseRadius = 4;

                // Responsive scaling based on screen size
                if (minDimension <= 768) {
                    // Mobile phones - smallest
                    baseRadius = 2.5;
                } else if (minDimension <= 1024) {
                    // Tablets - small
                    baseRadius = 3;
                } else if (minDimension <= 1440) {
                    // Small laptops - medium
                    baseRadius = 3.5;
                }
                // Desktop (larger) uses baseRadius = 4

                return baseRadius;
            };

            // Create pulsing dot at center of mutator capsule (wave-like animation)
            mutatorCapsuleDot = new Graphics();
            const dotColor = 0xFFFFFF; // White dot

            // Pulsing animation variables
            mutatorCapsuleDot.userData = mutatorCapsuleDot.userData || {};
            mutatorCapsuleDot.userData.pulseTime = 0;
            mutatorCapsuleDot.userData.baseRadius = getResponsiveDotRadius();

            // Function to update dot size (call on resize)
            const updateDotSize = () => {
                mutatorCapsuleDot.userData.baseRadius = getResponsiveDotRadius();
                // Update hit area when dot size changes
                const maxHitRadius = mutatorCapsuleDot.userData.baseRadius + 30; // Account for pulse waves
                mutatorCapsuleDot.hitArea = new PIXI.Circle(0, 0, maxHitRadius);
            };

            // Draw initial dot
            mutatorCapsuleDot.circle(0, 0, mutatorCapsuleDot.userData.baseRadius);
            mutatorCapsuleDot.fill({ color: dotColor, alpha: 0.9 });
            // Hide dot initially until resizeBackground positions it correctly
            mutatorCapsuleDot.visible = false;
            mutatorCapsuleDot.eventMode = 'static';
            mutatorCapsuleDot.cursor = 'pointer';

            // Set hit area for proper cursor interaction (even when graphics are cleared/redrawn)
            // Use a larger hit area to account for pulsing waves
            const maxHitRadius = mutatorCapsuleDot.userData.baseRadius + 30; // Account for pulse waves
            mutatorCapsuleDot.hitArea = new PIXI.Circle(0, 0, maxHitRadius);

            // Create audio for mutator dot hover effect
            mutatorDotSound = new Audio('/assets/sounds/mutator.mp3');
            mutatorDotSound.loop = true; // Loop the sound while hovering
            // Start unmuted - will sync after user interaction
            mutatorDotSound.muted = false;
            let isMutatorSoundPlaying = false; // Track if sound is currently playing

            // Enhanced smooth pulsing animation (nicer wave effect)
            app.ticker.add(() => {
                if (mutatorCapsuleDot && mutatorCapsuleDot.visible && mutatorCapsuleDot.parent) {
                    mutatorCapsuleDot.userData.pulseTime += 0.025; // Smooth, gentle pulse speed

                    // Additional null check before clearing to prevent errors
                    if (mutatorCapsuleDot && typeof mutatorCapsuleDot.clear === 'function') {
                        mutatorCapsuleDot.clear();
                    }

                    const baseRadius = mutatorCapsuleDot.userData.baseRadius;

                    // Create multiple smooth ripple waves for enhanced effect
                    const numWaves = 4; // More waves for smoother effect
                    for (let i = 0; i < numWaves; i++) {
                        // Smoother wave calculation using easing
                        const wavePhase = mutatorCapsuleDot.userData.pulseTime + (i * (Math.PI * 2 / numWaves));

                        // Use smoother sine wave with adjusted amplitude
                        const waveSize = Math.sin(wavePhase);

                        // Smoother wave expansion - more gradual
                        const waveExpansion = 8 + (i * 1.5); // Smaller expansion for smaller dot
                        const waveRadius = baseRadius + (waveSize * waveExpansion * (1 - i * 0.25));

                        // Smoother alpha fade - more gradual
                        const baseAlpha = 0.95 - (i * 0.15); // Higher base alpha for visibility
                        const alphaVariation = Math.abs(waveSize) * 0.3; // Less variation for smoother look
                        const waveAlpha = Math.max(0, Math.min(0.95, baseAlpha - alphaVariation));

                        // Only draw if radius and alpha are valid
                        if (waveRadius > 0 && waveAlpha > 0.05) {
                            mutatorCapsuleDot.circle(0, 0, waveRadius);
                            mutatorCapsuleDot.fill({ color: dotColor, alpha: waveAlpha });
                        }
                    }
                }
            });

            // Update dot size on window resize
            window.addEventListener('resize', () => {
                updateDotSize();
            });

            // Create circle with "click to explore" text (hidden by default)
            mutatorCapsuleCircleText = new Container();

            // Create circle background - smaller circle, no border
            const circleBg = new Graphics();
            const circleRadius = 70; // Smaller circle (reduced from 120)
            circleBg.circle(0, 0, circleRadius);
            circleBg.fill({ color: 0xFFFFFF, alpha: 0.1 }); // Semi-transparent white
            // No border/stroke - removed for simplicity

            // Create text style - simple, pure white, sans-serif, smaller, bold
            const textStyle = new TextStyle({
                fontFamily: 'sans-serif', // System sans-serif font
                fontSize: 16, // Smaller text (reduced from 24)
                fill: 0xFFFFFF, // Pure white
                align: 'center',
                fontWeight: 'bold', // Bold text for better visibility
                // No stroke, no drop shadow - simple pure white text
            });

            // Create two-line text: "Click To" on top, "Explore" below (desktop only)
            const clickTextTop = new Text({
                text: 'Click To',
                style: textStyle,
            });
            clickTextTop.anchor.set(0.5);
            clickTextTop.x = 0;
            clickTextTop.y = -8; // Position above center

            const clickTextBottom = new Text({
                text: 'Explore',
                style: textStyle,
            });
            clickTextBottom.anchor.set(0.5);
            clickTextBottom.x = 0;
            clickTextBottom.y = 8; // Position below center

            mutatorCapsuleCircleText.addChild(circleBg);
            mutatorCapsuleCircleText.addChild(clickTextTop);
            mutatorCapsuleCircleText.addChild(clickTextBottom);
            mutatorCapsuleCircleText.visible = false; // Hidden by default, only shows when dot is hovered
            mutatorCapsuleCircleText.eventMode = 'static';
            mutatorCapsuleCircleText.cursor = 'pointer';

            // Create simple label text for mobile/tablet (just "Mutator" - no "Click To")
            const mobileLabelStyle = new TextStyle({
                fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK,
                fontSize: 18,
                fill: 0xFFFFFF,
                align: 'center',
                fontWeight: 'bold',
            });
            mutatorCapsuleLabelText = new Text({
                text: 'Mutator',
                style: mobileLabelStyle,
            });
            mutatorCapsuleLabelText.anchor.set(0.5);
            mutatorCapsuleLabelText.visible = false; // Hidden by default, only shown on mobile/tablet
            app.stage.addChild(mutatorCapsuleLabelText);

            // Use the same responsive font size function as CCTV (will be defined before this scope)
            // We'll use getResponsiveCctvFontSize when creating the text

            // Function to create "MUTATOR" text with custom font (same as CCTV)
            const createMutatorText = async () => {
                // Wait for font to be loaded before creating text
                if (document.fonts && document.fonts.check) {
                    function checkFont(fontFamily) {
                        return document.fonts.check(`1em "${fontFamily}"`) || 
                               document.fonts.check(`1em ${fontFamily}`) ||
                               document.fonts.check(`12px "${fontFamily}"`) ||
                               document.fonts.check(`12px ${fontFamily}`);
                    }
                    
                    // Wait for fonts.ready first (ensures Google Fonts are loaded)
                    try {
                        await Promise.race([
                            document.fonts.ready,
                            new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
                        ]);
                    } catch (e) {
                        // Error waiting for fonts.ready
                    }
                    
                    let fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                    if (!fontLoaded) {
                        // Wait a bit more for font to load with more attempts
                        let attempts = 0;
                        const maxAttempts = 30; // 3 seconds (increased from 2)
                        while (!fontLoaded && attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                            attempts++;
                        }
                    }
                    
                    // Force font loading by creating a test element (helps ensure font is ready for PixiJS)
                    if (fontLoaded) {
                        try {
                            const testElement = document.createElement('div');
                            testElement.style.fontFamily = GLOBAL_FONT_FAMILY_WITH_FALLBACK;
                            testElement.style.position = 'absolute';
                            testElement.style.visibility = 'hidden';
                            testElement.style.fontSize = '12px';
                            testElement.textContent = 'Test';
                            document.body.appendChild(testElement);
                            // Force browser to load font
                            const computedStyle = window.getComputedStyle(testElement);
                            const fontFamily = computedStyle.fontFamily;
                            // Wait a bit for font to be fully ready
                            await new Promise(resolve => setTimeout(resolve, 50));
                            document.body.removeChild(testElement);
                        } catch (e) {
                            // Error forcing font load
                        }
                    }
                    
                    if (!fontLoaded) {
                        // Font not detected, proceeding with fallback
                    } else {

                    }
                }

                // Calculate responsive font size (same as CCTV - will reference the function defined later)
                // We need to define this inline since getResponsiveCctvFontSize is defined later in CCTV section
                const getResponsiveMutatorFontSize = () => {
                    const screenWidth = window.innerWidth;
                    const screenHeight = window.innerHeight;
                    const minDimension = Math.min(screenWidth, screenHeight);

                    // Large screens (desktop) - big text (same as CCTV)
                    let fontSize = 180;

                    // Responsive scaling based on screen size
                    if (minDimension <= 768) {
                        // Mobile phones - smaller
                        fontSize = 72;
                    } else if (minDimension <= 1024) {
                        // Tablets - medium
                        fontSize = 96;
                    } else if (minDimension <= 1440) {
                        // Laptops - slightly smaller
                        fontSize = 120;
                    }

                    return fontSize;
                };

                // Create "MUTATOR" text with Google Font (Zilla Slab Highlight) - same font size as CCTV
                const mutatorTextStyle = new TextStyle({
                    fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK, // Google Font with fallback
                    fontSize: getResponsiveMutatorFontSize(),
                    fill: 0xFFFFFF, // White text
                    align: 'center',
                    fontWeight: 'bold',
                });

                mutatorCapsuleTextSprite = new Text({
                    text: 'MUTATOR',
                    style: mutatorTextStyle,
                });

                mutatorCapsuleTextSprite.anchor.set(0.5); // Center the text
                mutatorCapsuleTextSprite.visible = false; // Hidden by default, shows on hover
                mutatorCapsuleTextSprite.eventMode = 'none'; // Don't block pointer events
                
                // Force font to load by updating text texture after a short delay
                // This ensures the custom font is applied even if it loads after text creation
                setTimeout(() => {
                    if (mutatorCapsuleTextSprite && !mutatorCapsuleTextSprite.destroyed) {
                        // Force texture update to apply custom font
                        mutatorCapsuleTextSprite.style = mutatorTextStyle;
                        // Trigger a render to ensure font is applied
                        if (app && app.renderer) {
                            app.renderer.render(app.stage);
                        }
                    }
                }, 100);

                // Store responsive font size function and animation state in userData (same as CCTV)
                mutatorCapsuleTextSprite.userData = {
                    getResponsiveFontSize: getResponsiveMutatorFontSize,
                    startX: null, // Will be set to X: 2666.5 (same as CCTV - converted to screen coordinates)
                    startY: null, // Will be set to Y: 1630.5 (same as CCTV - converted to screen coordinates)
                    targetX: null, // Will be set to same position as CCTV
                    targetY: null, // Will be set to Y: 1600 (same as CCTV)
                    currentX: null,
                    currentY: null,
                    isAnimating: false,
                    animationSpeed: 0.09, // Speed of ATM withdrawal animation (same as CCTV)
                };

                // Add text to stage
                app.stage.addChild(mutatorCapsuleTextSprite);
            };

            // Call async function to create text with font loading
            await createMutatorText();

            // Store animation ticker reference to prevent multiple tickers
            let mutatorAnimationTicker = null;

            // Function to show text with ATM withdrawal animation (slides up from below)
            const showMutatorText = () => {
                if (!mutatorCapsuleTextSprite || !mutatorCapsuleSprite) return;

                // Remove any existing animation ticker
                if (mutatorAnimationTicker) {
                    app.ticker.remove(mutatorAnimationTicker);
                    mutatorAnimationTicker = null;
                }

                // Calculate positions for ATM card ejection effect (slides up from bottom)
                const bg1TargetX = 2666.5; // Target X position
                const bg1TargetY = 1630.5; // Final Y position (where text should end up)

                // Get current background position and scale to convert coordinates
                if (backgroundSprite) {
                    const scale = currentScale || 1;
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;
                    const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                    const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                    // Convert bg1 coordinates to screen coordinates
                    const normalizedTargetX = bg1TargetX / imageWidth;
                    const normalizedTargetY = bg1TargetY / imageHeight;

                    const targetScreenX = bg1Left + (normalizedTargetX * bg1DisplayedWidth);
                    const targetScreenY = bg1Top + (normalizedTargetY * bg1DisplayedHeight);

                    // Target position (final position where text should be)
                    mutatorCapsuleTextSprite.userData.targetX = targetScreenX;
                    mutatorCapsuleTextSprite.userData.targetY = targetScreenY;

                    // Start position (text starts from bottom, slides up like ATM card ejection)
                    const cardEjectionDistance = 100; // Distance to slide up (like card coming out of ATM)
                    mutatorCapsuleTextSprite.userData.startX = targetScreenX; // Same X position
                    mutatorCapsuleTextSprite.userData.startY = targetScreenY + cardEjectionDistance; // Start below, slides up
                } else {
                    // Fallback: use center page position directly
                    mutatorCapsuleTextSprite.userData.targetX = app.screen.width / 2;
                    mutatorCapsuleTextSprite.userData.targetY = app.screen.height / 2;
                    const cardEjectionDistance = 100;
                    mutatorCapsuleTextSprite.userData.startX = mutatorCapsuleTextSprite.userData.targetX; // Same X
                    mutatorCapsuleTextSprite.userData.startY = mutatorCapsuleTextSprite.userData.targetY + cardEjectionDistance; // Start from bottom
                }

                // Reset animation state
                mutatorCapsuleTextSprite.userData.isAnimating = true;

                // Start position (text starts from bottom, slides up like ATM card ejection)
                mutatorCapsuleTextSprite.x = mutatorCapsuleTextSprite.userData.startX;
                mutatorCapsuleTextSprite.y = mutatorCapsuleTextSprite.userData.startY;
                mutatorCapsuleTextSprite.userData.currentX = mutatorCapsuleTextSprite.userData.startX;
                mutatorCapsuleTextSprite.userData.currentY = mutatorCapsuleTextSprite.userData.startY;

                // Make visible - appears when cursor is pointed (same behavior as circle)
                mutatorCapsuleTextSprite.visible = true;
                
                // Force font refresh when text becomes visible to ensure custom font is applied
                if (mutatorCapsuleTextSprite && !mutatorCapsuleTextSprite.destroyed) {
                    // Force texture update to apply custom font
                    const currentStyle = mutatorCapsuleTextSprite.style;
                    mutatorCapsuleTextSprite.style = currentStyle; // Re-apply style to force font update
                    // Trigger a render to ensure font is applied
                    if (app && app.renderer) {
                        app.renderer.render(app.stage);
                    }
                }
                mutatorCapsuleTextSprite.alpha = 1.0;

                // Animate text sliding up from bottom (ATM card ejection effect)
                mutatorCapsuleTextSprite.userData.isAnimating = true;
                mutatorAnimationTicker = app.ticker.add(() => {
                    if (!mutatorCapsuleTextSprite || !mutatorCapsuleTextSprite.userData.isAnimating) return;

                    const data = mutatorCapsuleTextSprite.userData;
                    const distanceX = data.targetX - data.currentX;
                    const distanceY = data.targetY - data.currentY;

                    if (Math.abs(distanceX) > 0.5 || Math.abs(distanceY) > 0.5) {
                        // Continue sliding up towards target (like card coming out of ATM from bottom)
                        data.currentX += (distanceX * data.animationSpeed);
                        data.currentY += (distanceY * data.animationSpeed);
                        mutatorCapsuleTextSprite.x = data.currentX;
                        mutatorCapsuleTextSprite.y = data.currentY;
                    } else {
                        // Reached target position (card fully ejected)
                        mutatorCapsuleTextSprite.x = data.targetX;
                        mutatorCapsuleTextSprite.y = data.targetY;
                        data.currentX = data.targetX;
                        data.currentY = data.targetY;
                        data.isAnimating = false;
                        app.ticker.remove(mutatorAnimationTicker);
                        mutatorAnimationTicker = null;
                    }
                });
            };

            // Function to hide text - hide immediately when cursor leaves (like circle behavior)
            const hideMutatorText = () => {
                if (!mutatorCapsuleTextSprite) return;

                // Remove any existing animation ticker
                if (mutatorAnimationTicker) {
                    app.ticker.remove(mutatorAnimationTicker);
                    mutatorAnimationTicker = null;
                }

                // Stop any ongoing animation
                if (mutatorCapsuleTextSprite.userData) {
                    mutatorCapsuleTextSprite.userData.isAnimating = false;
                }

                // Hide text immediately when cursor is not pointed (same as circle behavior)
                mutatorCapsuleTextSprite.visible = false;
                mutatorCapsuleTextSprite.alpha = 0;
            };

            // Track global mouse position for circle following
            let lastMousePos = { x: 0, y: 0 };
            let isCircleActive = false; // Track if circle should be visible

            // Function to check if cursor is within dot's bounds
            const isCursorInDotBounds = (cursorX, cursorY) => {
                if (!mutatorCapsuleDot || !mutatorCapsuleDot.parent || !mutatorCapsuleDot.userData) {
                    return false;
                }

                // Get dot's center in global/PixiJS coordinates
                // Dot is drawn centered at 0,0 in local space, so center is at dot's position
                const dotX = mutatorCapsuleDot.x;
                const dotY = mutatorCapsuleDot.y;

                // Get current responsive base radius
                const baseRadius = mutatorCapsuleDot.userData.baseRadius || getResponsiveDotRadius();

                // Maximum effective radius from pulsing waves (baseRadius + max wave expansion)
                // With 4 waves, max expansion is approximately 8 + (3 * 1.5) = 12.5 for first wave
                // Reduced from previous 15 to match new smoother animation
                const maxWaveExpansion = 12.5;
                // Add a small tolerance for smoother interaction (scaled with dot size)
                const tolerance = baseRadius * 0.8; // Proportional tolerance
                const maxDotRadius = baseRadius + maxWaveExpansion + tolerance;

                // Calculate distance from cursor to dot center
                const dx = cursorX - dotX;
                const dy = cursorY - dotY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const inBounds = distance <= maxDotRadius;

                return inBounds;
            };

            // Offset to position text at cursor tip (above and to the right of cursor)
            const CURSOR_TIP_OFFSET_X = 12; // Offset to the right
            const CURSOR_TIP_OFFSET_Y = -25; // Offset upward (above cursor tip)

            // Function to show circle and activate effects
            const showCircle = (cursorX, cursorY) => {
                mutatorCapsuleDot.visible = false;
                mutatorCapsuleCircleText.visible = true;
                isCircleActive = true;

                // Show "MUTATOR" text animation (slides up from below) - appears when cursor is pointed
                showMutatorText();

                // Show stroke overlay instantly
                mutatorCapsuleStrokeSprite.visible = true;
                mutatorCapsuleStrokeSprite.alpha = 1.0;

                // Instant speed change
                updateCapsuleSpeed();

                // Position circle at cursor tip (offset so text appears above cursor, not covered by it)
                mutatorCapsuleCircleText.x = cursorX + CURSOR_TIP_OFFSET_X;
                mutatorCapsuleCircleText.y = cursorY + CURSOR_TIP_OFFSET_Y;

                // Position stroke overlay at capsule center (not following cursor)
                mutatorCapsuleStrokeSprite.x = mutatorCapsuleSprite.x;
                mutatorCapsuleStrokeSprite.y = mutatorCapsuleSprite.y;
            };

            // Function to hide circle and restore dot
            const hideCircle = () => {
                mutatorCapsuleCircleText.visible = false;
                mutatorCapsuleDot.visible = true;
                isCircleActive = false;

                // Hide "MUTATOR" text animation - vanishes when cursor is not pointed
                hideMutatorText();

                // Hide stroke overlay
                mutatorCapsuleStrokeSprite.visible = false;

                // Return to base speed
                if (mutatorCapsuleSprite && mutatorCapsuleSprite.userData) {
                    mutatorCapsuleSprite.userData.currentAnimationSpeed = mutatorCapsuleSprite.userData.baseAnimationSpeed;
                    mutatorCapsuleSprite.animationSpeed = mutatorCapsuleSprite.userData.baseAnimationSpeed;
                }
            };

            // Make circle clickable but remove pointerenter/pointerleave - we control visibility via bounds check only
            // Circle text should not interfere with bounds checking for visibility
            mutatorCapsuleCircleText.eventMode = 'static'; // Static for clicks only
            // No custom cursor - use default // Pointer cursor when over circle (matches canvas cursor)
            // Don't use pointerenter/pointerleave - visibility controlled by bounds check only

            // Only the dot triggers the initial show (desktop only - mobile/tablet shows label text instead)
            // Store pointerenter handler so we can remove it later
            const handleMutatorDotPointerEnter = (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // Don't show circle text on mobile/tablet - label text is always visible
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    return;
                }

                const globalPos = event.global;
                lastMousePos.x = globalPos.x;
                lastMousePos.y = globalPos.y;

                // Only show if within bounds (double check)
                if (isCursorInDotBounds(globalPos.x, globalPos.y)) {
                    showCircle(globalPos.x, globalPos.y);

                }
            };
            
            mutatorCapsuleDot.on('pointerenter', handleMutatorDotPointerEnter);

            // Track global mouse position and check if within dot bounds
            // Use document mousemove to ensure we track cursor everywhere, not just over PixiJS objects
            const updateCircleBasedOnBounds = (mouseX, mouseY) => {
                lastMousePos.x = mouseX;
                lastMousePos.y = mouseY;

                // Always check if cursor is within dot's bounds
                const inBounds = isCursorInDotBounds(mouseX, mouseY);

                // Let PixiJS handle all cursor management automatically via sprite.cursor properties
                // No manual cursor management needed - PixiJS will automatically change cursor
                // to 'pointer' when hovering over sprites with cursor = 'pointer' set

                // Don't show circle text on mobile/tablet - label text is always visible
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    return; // Skip circle text logic on mobile/tablet
                }

                if (inBounds) {
                    // Cursor is within dot bounds - show/hold circle and follow cursor
                    // Sync mute state with global audio (update even if already playing)
                    if (mutatorDotSound) {
                        mutatorDotSound.muted = isGlobalAudioMuted();
                    }
                    
                    // Play mutator sound if not already playing
                    if (mutatorDotSound && !isMutatorSoundPlaying && !isGlobalAudioMuted()) {
                        playSpriteSound(mutatorDotSound);
                        isMutatorSoundPlaying = true;
                    }
                    
                    if (!isCircleActive) {
                        showCircle(mouseX, mouseY);

                    } else {
                        // Update circle position to follow cursor tip (offset above cursor)
                        mutatorCapsuleCircleText.x = mouseX + CURSOR_TIP_OFFSET_X;
                        mutatorCapsuleCircleText.y = mouseY + CURSOR_TIP_OFFSET_Y;

                        // Keep stroke overlay at capsule center (not following cursor)
                if (mutatorCapsuleStrokeSprite && mutatorCapsuleStrokeSprite.visible) {
                    mutatorCapsuleStrokeSprite.x = mutatorCapsuleSprite.x;
                    mutatorCapsuleStrokeSprite.y = mutatorCapsuleSprite.y;
                }

                        // Keep speed up while circle is active
                        updateCapsuleSpeed();
                    }
                } else {
                    // Cursor left dot bounds - hide circle and show dot
                    // Stop mutator sound if playing
                    if (mutatorDotSound && isMutatorSoundPlaying) {
                        mutatorDotSound.pause();
                        mutatorDotSound.currentTime = 0; // Reset to beginning for instant stop
                        isMutatorSoundPlaying = false;
                    }
                    
                    if (isCircleActive) {
                        hideCircle();

                    }
                }
            };

            // Track mouse on canvas and document level
            app.stage.eventMode = 'passive'; // Passive mode won't interfere with panning
            app.stage.on('globalpointermove', (event) => {
                updateCircleBasedOnBounds(event.global.x, event.global.y);
            });

            // Also use document mousemove to track even when outside PixiJS objects
            const canvasMouseMoveHandler = (event) => {
                if (!app.canvas) return;
                const rect = app.canvas.getBoundingClientRect();

                // Convert DOM coordinates to PixiJS coordinates
                // Account for device pixel ratio and canvas scaling
                const scaleX = app.canvas.width / app.canvas.clientWidth;
                const scaleY = app.canvas.height / app.canvas.clientHeight;

                const mouseX = (event.clientX - rect.left) * scaleX;
                const mouseY = (event.clientY - rect.top) * scaleY;

                updateCircleBasedOnBounds(mouseX, mouseY);
            };

            document.addEventListener('mousemove', canvasMouseMoveHandler);

            // Update circle position in ticker - continuously check bounds every frame
            const circleTickerHandler = app.ticker.add(() => {
                // Don't show circle text on mobile/tablet - label text is always visible
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    return; // Skip circle text logic on mobile/tablet
                }

                // Always check bounds every frame, regardless of circle visibility state
                const inBounds = isCursorInDotBounds(lastMousePos.x, lastMousePos.y);

                // Let PixiJS handle all cursor management automatically via sprite.cursor properties
                // No manual cursor management needed - PixiJS will automatically change cursor
                // to 'pointer' when hovering over sprites with cursor = 'pointer' set

                if (inBounds) {
                    // Sync mute state with global audio (update even if already playing)
                    if (mutatorDotSound) {
                        mutatorDotSound.muted = isGlobalAudioMuted();
                    }
                    
                    // Play mutator sound if not already playing
                    if (mutatorDotSound && !isMutatorSoundPlaying && !isGlobalAudioMuted()) {
                        playSpriteSound(mutatorDotSound);
                        isMutatorSoundPlaying = true;
                    }
                    
                    // IMPORTANT: When circle is active, always keep cursor as pointer
                    if (isCircleActive && mutatorCapsuleCircleText && mutatorCapsuleCircleText.visible) {
                        // Update circle position to follow cursor tip (offset above cursor)
                        mutatorCapsuleCircleText.x = lastMousePos.x + CURSOR_TIP_OFFSET_X;
                        mutatorCapsuleCircleText.y = lastMousePos.y + CURSOR_TIP_OFFSET_Y;

                        // Keep stroke overlay at capsule center (not following cursor)
                        if (mutatorCapsuleStrokeSprite && mutatorCapsuleStrokeSprite.visible) {
                            mutatorCapsuleStrokeSprite.x = mutatorCapsuleSprite.x;
                            mutatorCapsuleStrokeSprite.y = mutatorCapsuleSprite.y;
                        }

                        // Keep speed up while circle is active
                        updateCapsuleSpeed();
                    } else if (!isCircleActive) {
                        // Cursor is in bounds but circle not active - show it
                        showCircle(lastMousePos.x, lastMousePos.y);

                    }
                } else {
                    // Cursor is outside bounds - stop mutator sound if playing
                    if (mutatorDotSound && isMutatorSoundPlaying) {
                        mutatorDotSound.pause();
                        mutatorDotSound.currentTime = 0; // Reset to beginning for instant stop
                        isMutatorSoundPlaying = false;
                    }
                    
                    // Also sync mute state when cursor leaves (in case global audio was toggled while playing)
                    if (mutatorDotSound) {
                        mutatorDotSound.muted = isGlobalAudioMuted();
                    }
                    
                    // Cursor is outside bounds - hide circle if active
                    if (isCircleActive) {
                        hideCircle();

                    }
                }
            });

            // Track if mutator dot has been clicked to prevent multiple triggers
            // Declare this BEFORE handlers so both can access it
            let mutatorDotClicked = false;
            
            // Function to reset mutator dot (re-enable it)
            const resetMutatorDot = () => {
                mutatorDotClicked = false;
                mutatorCapsuleDot.eventMode = 'static';
                mutatorCapsuleDot.cursor = 'pointer';
                mutatorCapsuleDot.on('pointertap', handleMutatorDotClick);
                mutatorCapsuleDot.on('pointerdown', handleMutatorDotClick);
                mutatorCapsuleDot.on('pointerenter', handleMutatorDotPointerEnter);
                
                // Also re-enable circle text
                if (mutatorCapsuleCircleText) {
                    mutatorCapsuleCircleText.eventMode = 'static';
                    mutatorCapsuleCircleText.cursor = 'pointer';
                    mutatorCapsuleCircleText.on('pointertap', handleCircleTextClick);
                    mutatorCapsuleCircleText.on('pointerdown', handleCircleTextClick);
                }

            };

            // Make circle text clickable too (same as capsule)
            // Share the same clicked flag with dot to prevent multiple triggers
            const handleCircleTextClick = () => {
                // Check if dot was already clicked
                if (mutatorDotClicked) {
                    return;
                }
                
                mutatorDotClicked = true;
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                const redirectURL = 'https://prometheans.talis.art/';
                
                // Release pointer events immediately to prevent stuck pointer state
                app.canvas.style.cursor = 'default';
                
                // Open window immediately (synchronously) when user clicks - this prevents popup blocker
                const newWindow = window.open(redirectURL, '_blank');
                
                if (!newWindow) {
                    // Popup was blocked - show error message
                    alert('Please allow popups for this site to open the link.');
                    // Reset flag if popup was blocked so user can try again
                    mutatorDotClicked = false;
                } else {
                    // Temporarily disable both dot and circle text after successful click
                    mutatorCapsuleDot.eventMode = 'none';
                    mutatorCapsuleDot.cursor = 'default';
                    mutatorCapsuleDot.off('pointertap', handleMutatorDotClick);
                    mutatorCapsuleDot.off('pointerdown', handleMutatorDotClick);
                    mutatorCapsuleDot.off('pointerenter', handleMutatorDotPointerEnter);
                    
                    if (mutatorCapsuleCircleText) {
                        mutatorCapsuleCircleText.eventMode = 'none';
                        mutatorCapsuleCircleText.cursor = 'default';
                        mutatorCapsuleCircleText.off('pointertap', handleCircleTextClick);
                        mutatorCapsuleCircleText.off('pointerdown', handleCircleTextClick);
                    }

                    // Reset the dot when page regains focus (user comes back)
                    const handlePageShow = (e) => {
                        if (e.persisted || document.visibilityState === 'visible') {
                            // Reset pointer state and re-enable dot
                            resetMutatorDot();
                            // Remove this listener after first use
                            window.removeEventListener('pageshow', handlePageShow);
                            window.removeEventListener('focus', handlePageShow);
                        }
                    };
                    
                    window.addEventListener('pageshow', handlePageShow);
                    window.addEventListener('focus', handlePageShow);
                }
            };
            
            // Add pointerup handlers for circle text too
            const handleCircleTextPointerUp = () => {
                app.canvas.style.cursor = '';
                if (app.renderer && app.renderer.plugins && app.renderer.plugins.interaction) {
                    app.renderer.plugins.interaction.cursorStyles.default = 'default';
                }
            };
            
            mutatorCapsuleCircleText.on('pointertap', handleCircleTextClick);
            mutatorCapsuleCircleText.on('pointerdown', handleCircleTextClick);
            mutatorCapsuleCircleText.on('pointerup', handleCircleTextPointerUp);
            mutatorCapsuleCircleText.on('pointerupoutside', handleCircleTextPointerUp);
            mutatorCapsuleCircleText.on('pointercancel', handleCircleTextPointerUp);

            // Add dot and circle text to stage (on top of capsule)
            app.stage.addChild(mutatorCapsuleDot);
            app.stage.addChild(mutatorCapsuleCircleText);

            // Position at center of capsule (will be updated in resizeBackground)
            mutatorCapsuleDot.x = mutatorCapsuleSprite.x;
            mutatorCapsuleDot.y = mutatorCapsuleSprite.y;
            mutatorCapsuleCircleText.x = mutatorCapsuleSprite.x;
            mutatorCapsuleCircleText.y = mutatorCapsuleSprite.y;

            // Click handler on dot only - redirects to link instantly (works on both desktop and mobile/tablet)
            const handleMutatorDotClick = () => {
                // Prevent multiple clicks
                if (mutatorDotClicked) {
                    return;
                }
                
                mutatorDotClicked = true;
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                const redirectURL = 'https://prometheans.talis.art/';
                
                // Release pointer events immediately to prevent stuck pointer state
                app.canvas.style.cursor = 'default';
                
                // Open window immediately (synchronously) when user clicks - this prevents popup blocker
                // Must be called directly in the click handler, not in a callback
                const newWindow = window.open(redirectURL, '_blank');
                
                if (!newWindow) {
                    // Popup was blocked - show error message
                    alert('Please allow popups for this site to open the link.');
                    // Reset flag if popup was blocked so user can try again
                    mutatorDotClicked = false;
                } else {
                    // Temporarily disable the dot after successful click
                    mutatorCapsuleDot.eventMode = 'none';
                    mutatorCapsuleDot.cursor = 'default';
                    mutatorCapsuleDot.off('pointertap', handleMutatorDotClick);
                    mutatorCapsuleDot.off('pointerdown', handleMutatorDotClick);
                    mutatorCapsuleDot.off('pointerenter', handleMutatorDotPointerEnter);
                    
                    // Also disable circle text click handler
                    if (mutatorCapsuleCircleText) {
                        mutatorCapsuleCircleText.eventMode = 'none';
                        mutatorCapsuleCircleText.cursor = 'default';
                        mutatorCapsuleCircleText.off('pointertap', handleCircleTextClick);
                        mutatorCapsuleCircleText.off('pointerdown', handleCircleTextClick);
                    }

                    // Reset the dot when page regains focus (user comes back)
                    // Use pageshow event to detect when user navigates back
                    const handlePageShow = (e) => {
                        if (e.persisted || document.visibilityState === 'visible') {
                            // Reset pointer state and re-enable dot
                            resetMutatorDot();
                            // Remove this listener after first use
                            window.removeEventListener('pageshow', handlePageShow);
                            window.removeEventListener('focus', handlePageShow);
                        }
                    };
                    
                    window.addEventListener('pageshow', handlePageShow);
                    window.addEventListener('focus', handlePageShow);
                }
            };
            
            // Add pointerup handler to release pointer state
            const handleMutatorDotPointerUp = () => {
                // Release any stuck pointer state
                app.canvas.style.cursor = '';
                if (app.renderer && app.renderer.plugins && app.renderer.plugins.interaction) {
                    app.renderer.plugins.interaction.cursorStyles.default = 'default';
                }
            };
            
            mutatorCapsuleDot.on('pointertap', handleMutatorDotClick);
            mutatorCapsuleDot.on('pointerdown', handleMutatorDotClick);
            mutatorCapsuleDot.on('pointerup', handleMutatorDotPointerUp);
            mutatorCapsuleDot.on('pointerupoutside', handleMutatorDotPointerUp);
            mutatorCapsuleDot.on('pointercancel', handleMutatorDotPointerUp);

            // Update when capsule size/position changes

            // DEBUG: Log capsule sprite state after resize
            resizeBackground();

            // DEBUG: Check capsule sprite state after positioning

        } catch (error) {
            // Error loading mutator texture
        }

        // Load cup.png and make it interactive (simple button approach - matching working example)
        try {
            const cupTexture = await loadAssetWithProgress('/assets/cup.png');

            // Get cup's actual dimensions
            const cupImageWidth = cupTexture.orig?.width || cupTexture.width || cupTexture.baseTexture.width;
            const cupImageHeight = cupTexture.orig?.height || cupTexture.height || cupTexture.baseTexture.height;

            // CUP POSITIONING CONFIGURATION
            // Position on bg1.png (in pixels):
            // Left X: 3537, Right X: 3880, Top Y: 2328, Bottom Y: 2909
            // Center X: (3537 + 3880) / 2 = 3708.5
            // Center Y: (2328 + 2909) / 2 = 2618.5
            // Dimensions: width: 334 pixels, height: 582 pixels (on bg1.png)
            const cupConfig = {
                // Cup dimensions (on bg1.png coordinate space)
                cupWidth: 334,
                cupHeight: 582,

                // Position on bg1.png (center of cup)
                bg1X: 3708.5, // Center X position on bg1.png
                bg1Y: 2618.5, // Center Y position on bg1.png

                // Scale: calculated to make cup fit its designated space on bg1.png
                // Same technique as capsule and mutator background - relative to bg1's scale
                // The scale will be: (designated size on bg1) / (actual image size) * (bg1 scale)
                // But we store the relative scale factor here, which gets multiplied by bg1 scale in resizeBackground
                scale: 1.0, // Will be calculated below, then multiplied by scaleMultiplier

                // Scale multiplier: adjust this to make cup larger or smaller
                // 1.0 = calculated size, 0.5 = 50% size, 2.0 = 200% size, etc.
                // Example: 0.5 = smaller, 1.5 = larger, 2.0 = twice as big
                scaleMultiplier: 1.0, // <-- Change this value to rescale: 0.5 = smaller, 1.5 = larger

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make cup image fit into designated space on bg1.png
            // We want cup to take up cupWidth pixels on bg1
            // So: actualCupWidth * scale = cupWidth
            // Therefore: scale = cupWidth / actualCupWidth (relative to bg1's coordinate space)
            if (cupImageWidth && cupImageHeight && cupConfig.cupWidth && cupConfig.cupHeight) {
                // Scale cupWidth/cupHeight proportionally based on image optimization
                const imageScaleFactorX = imageWidth / ORIGINAL_IMAGE_WIDTH;
                const imageScaleFactorY = imageHeight / ORIGINAL_IMAGE_HEIGHT;
                const scaledCupWidth = cupConfig.cupWidth * imageScaleFactorX;
                const scaledCupHeight = cupConfig.cupHeight * imageScaleFactorY;
                
                const relativeScaleX = scaledCupWidth / cupImageWidth;
                const relativeScaleY = scaledCupHeight / cupImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                const calculatedScale = Math.min(relativeScaleX, relativeScaleY);

                // Apply scale multiplier to allow easy resizing
                cupConfig.scale = calculatedScale * cupConfig.scaleMultiplier;
            } else {
                // Fallback: use natural size with multiplier
                cupConfig.scale = 1.0 * cupConfig.scaleMultiplier;
            }

            // Calculate normalized position to check if it's valid
            const normalizedCupX = cupConfig.bg1X / imageWidth;
            const normalizedCupY = cupConfig.bg1Y / imageHeight;

            // Warn if coordinates seem wrong
            if (normalizedCupX < 0 || normalizedCupX > 1 || normalizedCupY < 0 || normalizedCupY > 1) {
                // WARNING: Cup position is outside bounds
            }
            if (cupConfig.scale < 0.001) {
                // WARNING: Cup scale is very small
            }

            // Create sprite exactly like the working example
            cupSprite = new Sprite(cupTexture);
            cupSprite.anchor.set(0.5); // Keep anchor at center for correct positioning

            // Load cup move sound effect
            cupMoveSound = new Audio('/assets/sounds/book_move.mp3');
            cupMoveSound.volume = 0.6; // Set volume (60%)
            cupMoveSound.preload = 'auto';
            // Start unmuted - can play instantly when triggered
            cupMoveSound.muted = false;
            // Start unmuted - will sync after user interaction
            cupMoveSound.muted = false;
            
            // Handle audio errors
            cupMoveSound.addEventListener('error', (e) => {
                // Could not load cup move sound
            });

            // Store config in userData for use in resizeBackground
            cupSprite.userData = cupSprite.userData || {};
            cupSprite.userData.config = cupConfig;
            cupSprite.userData.mouseX = 0;
            cupSprite.userData.mouseY = 0;
            cupSprite.userData.currentTilt = 0;
            cupSprite.userData.isOverCup = false;

            // Click animation state
            cupSprite.userData.originalX = 0;
            cupSprite.userData.originalY = 0;
            cupSprite.userData.isAnimating = false;
            cupSprite.userData.animationTime = 0;
            cupSprite.userData.animationDuration = 0;

            // Hide sprite initially until resizeBackground positions it correctly
            cupSprite.visible = false;
            cupSprite.alpha = 1.0;

            // Set initial position (will be updated by resizeBackground)
            cupSprite.x = app.screen.width / 2;
            cupSprite.y = app.screen.height / 2;

            // Add to stage FIRST (like the working example)
            app.stage.addChild(cupSprite);

            // THEN set interactivity (like the working example)
            cupSprite.eventMode = 'static';
            cupSprite.cursor = 'pointer';

            // CRITICAL: Add pointerdown listener FIRST to unlock audio before pointerenter fires
            // This ensures audio is unlocked when user hovers (pointerenter) over the sprite
            cupSprite.on('pointerdown', (event) => {

                enableAudioOnSpriteInteraction(cupMoveSound);
            });

            // Simple pointer events - hop animation on hover
            cupSprite.on('pointerenter', (event) => {
                // Enable audio and unlock using this specific sound
                enableAudioOnSpriteInteraction(cupMoveSound); // Enable audio on sprite interaction
                cupSprite.userData.isOverCup = true;

                // CRITICAL: Try to unlock audio one more time if not already unlocked
                // This ensures audio is ready even if previous unlock attempts failed
                if (!isSpriteAudioUnlocked) {

                    unlockSpriteAudio();
                    // Give it a tiny delay then try to play
                    setTimeout(() => {
                        playSpriteSound(cupMoveSound);
                    }, 10);
                } else {
                    // Play cup move sound effect immediately
                    playSpriteSound(cupMoveSound);
                }

                // Trigger hop animation when cursor enters
                if (!cupSprite.userData.isAnimating) {
                    // Store original position
                    cupSprite.userData.originalX = cupSprite.x;
                    cupSprite.userData.originalY = cupSprite.y;
                    cupSprite.userData.isAnimating = true;
                    cupSprite.userData.animationTime = 0;
                    cupSprite.userData.animationDuration = 0.6; // Shorter duration for hover hop
                    lastCupAnimationTime = Date.now();
                }
            });

            cupSprite.on('pointerleave', (event) => {
                cupSprite.userData.isOverCup = false;

            });

            // Easing function for smooth animation (ease-out quad)
            const easeOutQuad = (t) => {
                return 1 - (1 - t) * (1 - t);
            };

            // Easing function for bounce effect (ease-out bounce)
            const easeOutBounce = (t) => {
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                } else if (t < 2 / 2.75) {
                    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                } else if (t < 2.5 / 2.75) {
                    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                } else {
                    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
                }
            };

            // Animate cup hop sequence (triggered on hover)
            let lastCupAnimationTime = Date.now();

            // Keep click handler for any click actions (but no animation on click)
            cupSprite.on('pointertap', (event) => {

                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // Play sound on click/tap as well (for mobile and desktop click)
                playSpriteSound(cupMoveSound);
                // Cup is still clickable, but hop animation only happens on hover
            });
            
            // Also play sound on pointerdown for better mobile support
            cupSprite.on('pointerdown', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                playSpriteSound(cupMoveSound);
            });
            
            // Enable audio on hover as well
            cupSprite.on('pointerenter', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
            });

            app.ticker.add(() => {
                if (cupSprite && cupSprite.userData) {
                    const data = cupSprite.userData;

                    // Handle click animation sequence
                    if (data.isAnimating) {
                        const now = Date.now();
                        const deltaSeconds = (now - lastCupAnimationTime) / 1000; // Convert to seconds
                        lastCupAnimationTime = now;
                        data.animationTime += deltaSeconds;

                        const progress = Math.min(1, data.animationTime / data.animationDuration);

                        // Wiggle animation (like a cup being poked) - no hopping, just rotation wobble
                        const maxTilt = 8; // Maximum tilt angle in degrees (left/right wobble)

                        // Calculate wobble rotation (oscillates left and right)
                        // Use sine wave for smooth left-right wobble that fades out
                        const wobbleFrequency = 8; // How many wobbles during the animation
                        // Fade out the wobble as animation progresses (ease out)
                        const fadeOut = 1 - Math.pow(progress, 2); // Ease out curve
                        const wobbleAmount = Math.sin(progress * Math.PI * wobbleFrequency) * maxTilt * fadeOut;
                        const targetRotation = (wobbleAmount * Math.PI) / 180; // Convert to radians

                        // Keep position fixed - no hopping
                        // Recalculate position from config to ensure cup stays in correct position
                        // even if background moved during animation
                        if (cupSprite.userData && cupSprite.userData.config && backgroundSprite) {
                            const cupConfig = cupSprite.userData.config;
                            const imageWidth = backgroundSprite.texture?.width || 1920;
                            const imageHeight = backgroundSprite.texture?.height || 1080;
                            const scale = backgroundSprite.scale?.x || 1.0;

                            const bg1DisplayedWidth = imageWidth * scale;
                            const bg1DisplayedHeight = imageHeight * scale;

                            const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                            const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                            const normalizedX = cupConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                            const normalizedY = cupConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                            cupSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + cupConfig.offsetX;
                            cupSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + cupConfig.offsetY;

                            // Update originalX/Y to match current position
                            data.originalX = cupSprite.x;
                            data.originalY = cupSprite.y;
                        } else {
                            // Fallback to stored position if config not available
                            cupSprite.x = data.originalX;
                            cupSprite.y = data.originalY;
                        }

                        // Apply wobble rotation (anchor point stays fixed, cup tilts)
                        const rotationSpeed = 0.4;
                        const rotationDiff = targetRotation - cupSprite.rotation;
                        cupSprite.rotation += rotationDiff * rotationSpeed;

                        // Animation complete
                        if (progress >= 1) {
                            data.isAnimating = false;
                            // Recalculate final position from config
                            if (cupSprite.userData && cupSprite.userData.config && backgroundSprite) {
                                const cupConfig = cupSprite.userData.config;
                                const imageWidth = backgroundSprite.texture?.width || 1920;
                                const imageHeight = backgroundSprite.texture?.height || 1080;
                                const scale = backgroundSprite.scale?.x || 1.0;

                                const bg1DisplayedWidth = imageWidth * scale;
                                const bg1DisplayedHeight = imageHeight * scale;

                                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                                const normalizedX = cupConfig.bg1X / imageWidth;
                                const normalizedY = cupConfig.bg1Y / imageHeight;

                                cupSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + cupConfig.offsetX;
                                cupSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + cupConfig.offsetY;
                                data.originalX = cupSprite.x;
                                data.originalY = cupSprite.y;
                            } else {
                                cupSprite.x = data.originalX;
                                cupSprite.y = data.originalY;
                            }
                            cupSprite.rotation = 0; // Reset rotation
                        }
                    }

                    // Reset rotation when not animating
                    if (!data.isAnimating) {
                        // Smoothly return rotation to 0 if animation just ended
                        const rotationDiff = 0 - cupSprite.rotation;
                        cupSprite.rotation += rotationDiff * 0.2; // Smooth return to center
                        if (Math.abs(cupSprite.rotation) < 0.001) {
                            cupSprite.rotation = 0;
                        }
                    }
                }
            });

            // Call resizeBackground to position cup correctly (after it's already added to stage)
            resizeBackground();

        } catch (error) {
            // Error loading cup texture
        }

        // Load glitch animated frames (glitch0000.png to glitch0005.png - 6 frames total)
        try {

            // Load all 6 glitch frames in parallel for faster loading
            const glitchUrls = Array.from({ length: 6 }, (_, i) => {
                const frameNum = i.toString().padStart(4, '0'); // Pad to 4 digits: 0000, 0001, etc.
                return `/assets/glitch${frameNum}.png`;
            });
            const glitchTextures = await loadAssetsInParallel(glitchUrls);

            // Create AnimatedSprite from the glitch textures
            glitchSprite = new AnimatedSprite(glitchTextures);
            glitchSprite.anchor.set(0.5);

            // Configure glitch animation settings
            glitchSprite.animationSpeed = 0.3; // Speed of animation (0.3 = 30% of ticker speed, adjust as needed)
            glitchSprite.loop = true; // Loop the animation continuously

            // Hide sprite initially until resizeBackground positions it correctly
            glitchSprite.visible = false;
            glitchSprite.alpha = 1.0;

            // Start animation playing continuously (normal state)
            glitchSprite.play(); // Animation plays continuously by default

            // Get glitch dimensions (use first frame as reference) - same technique as capsule
            const glitchImageWidth = glitchTextures[0].orig?.width || glitchTextures[0].width || glitchTextures[0].baseTexture.width;
            const glitchImageHeight = glitchTextures[0].orig?.height || glitchTextures[0].height || glitchTextures[0].baseTexture.height;

            // Glitch positioning and sizing config - same technique as capsule and cup
            // Position on bg1.png (in pixels):
            // Left X: 3512, Right X: 3833, Top Y: 1352, Bottom Y: 1610
            // Center X: (3512 + 3833) / 2 = 3672.5
            // Center Y: (1352 + 1610) / 2 = 1481
            // Dimensions: width: 322 pixels, height: 358 pixels (on bg1.png)
            const glitchConfig = {
                // Glitch dimensions (on bg1.png coordinate space)
                glitchWidth: 322,
                glitchHeight: 358,

                // Position on bg1.png (center of glitch)
                bg1X: 3672.5, // Center X position on bg1.png
                bg1Y: 1481, // Center Y position on bg1.png

                // Scale: calculated to make glitch fit its designated space on bg1.png
                // Same technique as capsule and cup - relative to bg1's scale
                // The scale will be: (designated size on bg1) / (actual image size) * (bg1 scale)
                // But we store the relative scale factor here, which gets multiplied by bg1 scale in resizeBackground
                scale: 1.0, // Will be calculated below, then multiplied by scaleMultiplier

                // Scale multiplier: adjust this to make glitch larger or smaller
                // 1.0 = calculated size, 0.5 = 50% size, 2.0 = 200% size, etc.
                // Example: 0.5 = smaller, 1.5 = larger, 2.0 = twice as big
                scaleMultiplier: 1.0, // <-- Change this value to rescale: 0.5 = smaller, 1.5 = larger

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make glitch image fit into designated space on bg1.png
            // We want glitch to take up glitchWidth pixels on bg1
            // So: actualGlitchWidth * scale = glitchWidth
            // Therefore: scale = glitchWidth / actualGlitchWidth (relative to bg1's coordinate space)
            if (glitchImageWidth && glitchImageHeight && glitchConfig.glitchWidth && glitchConfig.glitchHeight) {
                // Scale glitchWidth/glitchHeight proportionally based on image optimization
                const imageScaleFactorX = imageWidth / ORIGINAL_IMAGE_WIDTH;
                const imageScaleFactorY = imageHeight / ORIGINAL_IMAGE_HEIGHT;
                const scaledGlitchWidth = glitchConfig.glitchWidth * imageScaleFactorX;
                const scaledGlitchHeight = glitchConfig.glitchHeight * imageScaleFactorY;
                
                const relativeScaleX = scaledGlitchWidth / glitchImageWidth;
                const relativeScaleY = scaledGlitchHeight / glitchImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                const calculatedScale = Math.min(relativeScaleX, relativeScaleY);

                // Apply scale multiplier to allow easy resizing
                glitchConfig.scale = calculatedScale * glitchConfig.scaleMultiplier;
            } else {
                // Fallback: use natural size with multiplier
                glitchConfig.scale = 1.0 * glitchConfig.scaleMultiplier;
            }

            // Calculate normalized position to check if it's valid
            const normalizedGlitchX = glitchConfig.bg1X / imageWidth;
            const normalizedGlitchY = glitchConfig.bg1Y / imageHeight;

            // Warn if coordinates seem wrong
            if (normalizedGlitchX < 0 || normalizedGlitchX > 1 || normalizedGlitchY < 0 || normalizedGlitchY > 1) {
                // WARNING: Glitch position is outside bounds
            }
            if (glitchConfig.scale < 0.001) {
                // WARNING: Glitch scale is very small
            }

            // Store config in userData for glitch sprite (same technique as capsule and cup)
            glitchSprite.userData = glitchSprite.userData || {};
            glitchSprite.userData.config = glitchConfig;
            glitchSprite.userData.isOverGlitch = false;
            glitchSprite.userData.baseAnimationSpeed = 0.3; // Store base speed for hover effects
            glitchSprite.userData.currentAnimationSpeed = 0.3;
            glitchSprite.userData.baseScale = 1.0; // Will be set after first resizeBackground call
            glitchSprite.userData.glitchTicker = null; // Ticker for glitch effect (black screen flicker)
            glitchSprite.userData.glitchTime = 0; // Time counter for glitch effect

            // Add to stage
            app.stage.addChild(glitchSprite);

            // Set initial position (will be updated by resizeBackground)
            glitchSprite.x = app.screen.width / 2;
            glitchSprite.y = app.screen.height / 2;

            // Make glitch sprite interactive (NO COLOR EFFECTS - removed ColorMatrixFilter)
            glitchSprite.eventMode = 'static';
            glitchSprite.cursor = 'pointer';

            // Function to calculate and apply instant speed based on position
            const updateGlitchSpeed = (globalPos) => {
                if (!glitchSprite || !glitchSprite.userData) return;

                const data = glitchSprite.userData;

                // Calculate local cursor position relative to glitch sprite center
                const localPoint = glitchSprite.toLocal(globalPos);

                // Get sprite dimensions
                const texture = glitchTextures[0];
                const textureWidth = texture.orig?.width || texture.width;
                const textureHeight = texture.orig?.height || texture.height;

                const scaledWidth = textureWidth * glitchSprite.scale.x;
                const scaledHeight = textureHeight * glitchSprite.scale.y;

                // Calculate distance from center (normalized 0-1)
                const distanceX = Math.abs(localPoint.x) / (scaledWidth / 2);
                const distanceY = Math.abs(localPoint.y) / (scaledHeight / 2);
                const distanceFromCenter = Math.min(1, Math.sqrt(distanceX * distanceX + distanceY * distanceY));

                // Speed multiplier: instant max speed when hovering anywhere on the sprite
                // Use maximum speed (3.0x) instantly when pointing anywhere on the image
                const speedMultiplier = 3.0; // Maximum speed instantly
                const targetSpeed = data.baseAnimationSpeed * speedMultiplier;

                // INSTANT speed change (no interpolation)
                data.currentAnimationSpeed = targetSpeed;
                glitchSprite.animationSpeed = targetSpeed;
            };

            // Load glitch sound effect for glitch sprite
            glitchSpriteGlitchSound = new Audio('/assets/sounds/glitch1.mp3');
            glitchSpriteGlitchSound.volume = 0.6; // Set volume (60%)
            glitchSpriteGlitchSound.preload = 'auto';
            // Start unmuted - can play instantly when triggered
            glitchSpriteGlitchSound.muted = false;
            glitchSpriteGlitchSound.loop = true; // Loop continuously while hovering
            // Start unmuted - will sync after user interaction
            glitchSpriteGlitchSound.muted = false;
            
            // Handle audio errors
            glitchSpriteGlitchSound.addEventListener('error', (e) => {
                // Could not load glitch sprite glitch sound
            });

            // CRITICAL: Add pointerdown listener FIRST to unlock audio before pointerenter fires
            glitchSprite.on('pointerdown', (event) => {

                enableAudioOnSpriteInteraction(glitchSpriteGlitchSound);
            });

            // Pointer events for responsive animation effect (works for mouse and touch)
            glitchSprite.on('pointerenter', (event) => {
                enableAudioOnSpriteInteraction(glitchSpriteGlitchSound); // Enable audio on sprite interaction
                glitchSprite.userData.isOverGlitch = true;
                const globalPos = event.global;
                updateGlitchSpeed(globalPos);

                // Start glitch effect (TV turning off/on repeatedly)
                glitchSprite.userData.glitchTime = 0;
                
                // Play glitch sound effect
                // Sound will loop continuously while hovering
                if (glitchSpriteGlitchSound) {
                    // Only reset if not already playing to avoid interrupting the loop
                    if (glitchSpriteGlitchSound.paused) {
                        playSpriteSound(glitchSpriteGlitchSound);
                    } else {
                        // Already playing, just ensure it's not muted
                        glitchSpriteGlitchSound.muted = globalSpriteAudioMuted;
                    }
                }

                // Remove existing ticker if any
                if (glitchSprite.userData.glitchTicker) {
                    app.ticker.remove(glitchSprite.userData.glitchTicker);
                }

                // Create ticker for glitch effect (white -> black -> glitch -> repeat)
                glitchSprite.userData.glitchTicker = app.ticker.add(() => {
                    if (!glitchSprite.userData.isOverGlitch) {
                        // Stop glitch effect and return to normal
                        glitchSprite.tint = 0xFFFFFF; // Reset to normal color
                        glitchSprite.alpha = 1.0; // Reset alpha
                        app.ticker.remove(glitchSprite.userData.glitchTicker);
                        glitchSprite.userData.glitchTicker = null;
                        return;
                    }

                    glitchSprite.userData.glitchTime += 0.08; // Speed of glitch cycle

                    // Cycle through: white -> black -> glitch -> normal -> repeat
                    // Full cycle: 0-0.25 = white, 0.25-0.5 = black, 0.5-0.75 = glitch, 0.75-1.0 = normal
                    const cycle = glitchSprite.userData.glitchTime % 1.0;

                    if (cycle >= 0.0 && cycle < 0.25) {
                        // White overlay
                        glitchSprite.tint = 0xFFFFFF; // White
                        glitchSprite.alpha = 1.0;
                    } else if (cycle >= 0.25 && cycle < 0.5) {
                        // Black overlay
                        glitchSprite.tint = 0x000000; // Black
                        glitchSprite.alpha = 1.0;
                    } else if (cycle >= 0.5 && cycle < 0.75) {
                        // Glitch effect (flicker between normal and black rapidly)
                        const glitchCycle = (cycle - 0.5) * 4; // Scale to 0-1 for glitch phase
                        const flicker = Math.floor(glitchCycle * 8) % 2; // Rapid flicker
                        if (flicker === 0) {
                            glitchSprite.tint = 0xFFFFFF; // Normal
                        } else {
                            glitchSprite.tint = 0x000000; // Black
                        }
                        glitchSprite.alpha = 1.0;
                    } else {
                        // Normal (brief return to normal before cycle repeats)
                        glitchSprite.tint = 0xFFFFFF; // Normal white (no tint)
                        glitchSprite.alpha = 1.0;
                    }
                });

            });

            glitchSprite.on('pointermove', (event) => {
                const globalPos = event.global;
                glitchSprite.userData.isOverGlitch = true;

                // Update speed instantly as cursor/touch moves
                updateGlitchSpeed(globalPos);
                // Ensure animation is playing while cursor moves over it
                if (!glitchSprite.playing) {
                    glitchSprite.loop = true;
                    glitchSprite.play();
                }
                // Glitch effect ticker will continue running if already started
            });

            glitchSprite.on('pointerleave', (event) => {
                glitchSprite.userData.isOverGlitch = false;

                // Stop glitch effect and return to normal color
                glitchSprite.tint = 0xFFFFFF; // Reset to normal color (no tint)
                glitchSprite.alpha = 1.0; // Reset alpha

                // Stop glitch sound immediately
                if (glitchSpriteGlitchSound) {
                    glitchSpriteGlitchSound.pause();
                    glitchSpriteGlitchSound.currentTime = 0; // Reset to start for next play
                }

                // Remove glitch ticker
                if (glitchSprite.userData.glitchTicker) {
                    app.ticker.remove(glitchSprite.userData.glitchTicker);
                    glitchSprite.userData.glitchTicker = null;
                }

                // INSTANT return to base speed (no interpolation)
                if (glitchSprite.userData) {
                    glitchSprite.userData.currentAnimationSpeed = glitchSprite.userData.baseAnimationSpeed;
                    glitchSprite.animationSpeed = glitchSprite.userData.baseAnimationSpeed;
                }

            });

            // Also handle touch events explicitly for mobile devices
            glitchSprite.on('pointerdown', (event) => {
                // On mobile, treat touch as hover
                glitchSprite.userData.isOverGlitch = true;
                const globalPos = event.global;
                updateGlitchSpeed(globalPos);

                // Start glitch effect (same as pointerenter)
                glitchSprite.userData.glitchTime = 0;

                if (glitchSprite.userData.glitchTicker) {
                    app.ticker.remove(glitchSprite.userData.glitchTicker);
                }

                glitchSprite.userData.glitchTicker = app.ticker.add(() => {
                    if (!glitchSprite.userData.isOverGlitch) {
                        glitchSprite.tint = 0xFFFFFF;
                        glitchSprite.alpha = 1.0;
                        app.ticker.remove(glitchSprite.userData.glitchTicker);
                        glitchSprite.userData.glitchTicker = null;
                        return;
                    }

                    glitchSprite.userData.glitchTime += 0.08;
                    const cycle = glitchSprite.userData.glitchTime % 1.0;

                    if (cycle >= 0.0 && cycle < 0.25) {
                        // White overlay
                        glitchSprite.tint = 0xFFFFFF;
                        glitchSprite.alpha = 1.0;
                    } else if (cycle >= 0.25 && cycle < 0.5) {
                        // Black overlay
                        glitchSprite.tint = 0x000000;
                        glitchSprite.alpha = 1.0;
                    } else if (cycle >= 0.5 && cycle < 0.75) {
                        // Glitch effect (flicker)
                        const glitchCycle = (cycle - 0.5) * 4;
                        const flicker = Math.floor(glitchCycle * 8) % 2;
                        if (flicker === 0) {
                            glitchSprite.tint = 0xFFFFFF;
                        } else {
                            glitchSprite.tint = 0x000000;
                        }
                        glitchSprite.alpha = 1.0;
                    } else {
                        // Normal
                        glitchSprite.tint = 0xFFFFFF;
                        glitchSprite.alpha = 1.0;
                    }
                });

            });

            glitchSprite.on('pointerup', (event) => {
                // On mobile, check if pointer is still over glitch
                const globalPos = event.global;
                const bounds = glitchSprite.getBounds();

                if (globalPos.x >= bounds.x && globalPos.x <= bounds.x + bounds.width &&
                    globalPos.y >= bounds.y && globalPos.y <= bounds.y + bounds.height) {
                    // Still over glitch, keep it active
                    updateGlitchSpeed(globalPos);
                    // Ensure animation is playing
                    if (!glitchSprite.playing) {
                        glitchSprite.loop = true;
                        glitchSprite.play();
                    }
                } else {
                    // Left glitch area
                    glitchSprite.userData.isOverGlitch = false;
                    // Stop animation and return to normal
                    glitchSprite.stop();
                    glitchSprite.gotoAndStop(0);

                    if (glitchSprite.userData) {
                        glitchSprite.userData.currentAnimationSpeed = glitchSprite.userData.baseAnimationSpeed;
                        glitchSprite.animationSpeed = glitchSprite.userData.baseAnimationSpeed;
                    }
                }
            });

            // Click handler - redirect to URL in new tab
            glitchSprite.on('pointertap', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                // Open in new tab without showing loading screen (loading screen is only for same-page redirects)
                window.open('https://xion.talis.art/collection/680f65c18d37e5bcd70be0dd', '_blank');
            });

        } catch (error) {
            // Error loading glitch textures
        }

        // Load eye logo images and make it interactive (eye opens/closes on hover)
        try {

            // Load both eye textures
            const eyeOpenTexture = await loadAssetWithProgress('/assets/eye_logo_open.png');
            const eyeClosedTexture = await loadAssetWithProgress('/assets/eye_logo_closed.png');

            // Create sprite with open eye texture initially
            eyeLogoSprite = new Sprite(eyeOpenTexture);
            eyeLogoSprite.anchor.set(0.5);

            // Get eye dimensions (use open texture as reference)
            const eyeImageWidth = eyeOpenTexture.orig?.width || eyeOpenTexture.width || eyeOpenTexture.baseTexture.width;
            const eyeImageHeight = eyeOpenTexture.orig?.height || eyeOpenTexture.height || eyeOpenTexture.baseTexture.height;

            // Eye logo positioning and sizing config - same technique as cup and glitch
            // Position on bg1.png (in pixels):
            // Left X: 1734, Right X: 1860, Top Y: 744, Bottom Y: 893
            // Center X: (1734 + 1860) / 2 = 1797
            // Center Y: (744 + 893) / 2 = 818.5
            // Dimensions: width: 126 pixels, height: 149 pixels (on bg1.png)
            const eyeConfig = {
                // Eye dimensions (on bg1.png coordinate space)
                eyeWidth: 126,
                eyeHeight: 149,

                // Position on bg1.png (center of eye)
                bg1X: 1797, // Center X position on bg1.png
                bg1Y: 818.5, // Center Y position on bg1.png

                // Scale: calculated to make eye fit its designated space on bg1.png
                scale: 1.0, // Will be calculated below

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make eye image fit into designated space on bg1.png
            if (eyeImageWidth && eyeImageHeight && eyeConfig.eyeWidth && eyeConfig.eyeHeight) {
                // Scale eyeWidth/eyeHeight proportionally based on image optimization
                const imageScaleFactorX = imageWidth / ORIGINAL_IMAGE_WIDTH;
                const imageScaleFactorY = imageHeight / ORIGINAL_IMAGE_HEIGHT;
                const scaledEyeWidth = eyeConfig.eyeWidth * imageScaleFactorX;
                const scaledEyeHeight = eyeConfig.eyeHeight * imageScaleFactorY;
                
                const relativeScaleX = scaledEyeWidth / eyeImageWidth;
                const relativeScaleY = scaledEyeHeight / eyeImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                eyeConfig.scale = Math.min(relativeScaleX, relativeScaleY);
            } else {
                // Fallback: use natural size
                eyeConfig.scale = 1.0;
            }

            // Store textures and config in userData
            eyeLogoSprite.userData = eyeLogoSprite.userData || {};
            eyeLogoSprite.userData.config = eyeConfig;
            eyeLogoSprite.userData.openTexture = eyeOpenTexture;
            eyeLogoSprite.userData.closedTexture = eyeClosedTexture;

            // Add hue-shifting animation to eye logo (same as mutator capsule)
            const { ColorMatrixFilter } = PIXI;
            const eyeHueFilter = new ColorMatrixFilter();
            eyeLogoSprite.filters = [eyeHueFilter];

            // Hide sprite initially until resizeBackground positions it correctly
            eyeLogoSprite.visible = false;
            eyeLogoSprite.alpha = 1.0;

            // Add to stage
            app.stage.addChild(eyeLogoSprite);

            // Set initial position (will be updated by resizeBackground)
            eyeLogoSprite.x = app.screen.width / 2;
            eyeLogoSprite.y = app.screen.height / 2;

            // Make eye sprite interactive
            eyeLogoSprite.eventMode = 'static';
            eyeLogoSprite.cursor = 'pointer';

            // Pointer events to change eye texture on hover
            eyeLogoSprite.on('pointerenter', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // Change to closed eye when cursor enters
                eyeLogoSprite.texture = eyeLogoSprite.userData.closedTexture;

            });

            eyeLogoSprite.on('pointerleave', () => {
                // Change back to open eye when cursor leaves
                eyeLogoSprite.texture = eyeLogoSprite.userData.openTexture;

            });

            // Handle touch events for mobile
            eyeLogoSprite.on('pointerdown', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // On touch, close the eye
                eyeLogoSprite.texture = eyeLogoSprite.userData.closedTexture;
            });

            eyeLogoSprite.on('pointerup', (event) => {
                // On touch release, check if still over eye
                const globalPos = event.global;
                const bounds = eyeLogoSprite.getBounds();

                if (globalPos.x >= bounds.x && globalPos.x <= bounds.x + bounds.width &&
                    globalPos.y >= bounds.y && globalPos.y <= bounds.y + bounds.height) {
                    // Still over eye, keep closed
                    eyeLogoSprite.texture = eyeLogoSprite.userData.closedTexture;
                } else {
                    // Left eye area, open it
                    eyeLogoSprite.texture = eyeLogoSprite.userData.openTexture;
                }
            });

        } catch (error) {
            // Error loading eye logo textures
        }

        // Load Board sprite (board.png)
        try {

            const boardTexture = await loadAssetWithProgress('assets/board.png');

            // Load Board stroke (board_stroke.png)
            const boardStrokeTexture = await loadAssetWithProgress('assets/board_stroke.png');

            // Create Sprite from the board texture
            boardSprite = new Sprite(boardTexture);
            boardSprite.anchor.set(0.5);

            // Hide sprite initially until resizeBackground positions it correctly
            boardSprite.visible = false;
            boardSprite.alpha = 1.0;
            boardSprite.zIndex = 6;

            // Board positioning and sizing config (bg1 coordinates provided)
            // Left X: 3464, Top Y: 733, Right X: 4029, Bottom Y: 1247
            // Center: X=3746.5, Y=990, Width=565, Height=514
            const boardConfig = {
                boardWidth: 565,
                boardHeight: 514,
                bg1X: 3746.5,
                bg1Y: 990,
                scale: 1.0, // Will be calculated below
                offsetX: 0,
                offsetY: 0
            };

            // Calculate scale to fit designated space on bg1.png
            const boardImageWidth = boardTexture.orig?.width || boardTexture.width || boardTexture.baseTexture.width || 109;
            const boardImageHeight = boardTexture.orig?.height || boardTexture.height || boardTexture.baseTexture.height || 843;

            if (boardImageWidth && boardImageHeight && boardConfig.boardWidth && boardConfig.boardHeight) {
                const imageScaleFactorX = imageWidth / ORIGINAL_IMAGE_WIDTH;
                const imageScaleFactorY = imageHeight / ORIGINAL_IMAGE_HEIGHT;
                const scaledBoardWidth = boardConfig.boardWidth * imageScaleFactorX;
                const scaledBoardHeight = boardConfig.boardHeight * imageScaleFactorY;

                const relativeScaleX = scaledBoardWidth / boardImageWidth;
                const relativeScaleY = scaledBoardHeight / boardImageHeight;

                boardConfig.scale = Math.min(relativeScaleX, relativeScaleY);
            } else {
                boardConfig.scale = 1.0;
            }

            // Store config
            boardSprite.userData = boardSprite.userData || {};
            boardSprite.userData.config = boardConfig;

            // Add to stage
            app.stage.addChild(boardSprite);

            // Set initial position (will be updated by resizeBackground)
            boardSprite.x = app.screen.width / 2;
            boardSprite.y = app.screen.height / 2;

            // Make board sprite interactive for hover effects
            boardSprite.eventMode = 'static';
            boardSprite.cursor = 'pointer';

            // Initialize animation state for board hover effect
            boardSprite.userData.isOverBoard = false;
            boardSprite.userData.isAnimating = false;
            boardSprite.userData.animationTime = 0;
            boardSprite.userData.animationDuration = 0.3; // Shorter duration for quicker effect
            boardSprite.userData.baseX = boardSprite.x; // True base position (never changes during animation)
            boardSprite.userData.baseY = boardSprite.y; // True base position (never changes during animation)
            boardSprite.userData.originalX = boardSprite.x; // Current original position (for animation)
            boardSprite.userData.originalY = boardSprite.y; // Current original position (for animation)

            // CRITICAL: Add pointerdown listener FIRST to unlock audio before pointerenter fires
            boardSprite.on('pointerdown', (event) => {
                enableAudioOnSpriteInteraction(bookMoveSound);
            });

            // Hover animation for board sprite - one-time wobble/movement when cursor passes (like book sprite)
            boardSprite.on('pointerenter', (event) => {
                if (!boardSprite.userData) return;
                
                enableAudioOnSpriteInteraction(bookMoveSound); // Enable audio on sprite interaction
                boardSprite.userData.isOverBoard = true;
                
                // Play book move sound effect
                playSpriteSound(bookMoveSound);
                
                // Immediately reset to true base position before starting new animation
                boardSprite.x = boardSprite.userData.baseX;
                boardSprite.y = boardSprite.userData.baseY;
                boardSprite.rotation = 0;
                if (boardStrokeSprite) {
                    boardStrokeSprite.x = boardSprite.x;
                    boardStrokeSprite.y = boardSprite.y;
                    boardStrokeSprite.rotation = 0;
                }
                
                // Always reset and restart animation when cursor enters (like book sprite)
                // Reset animation state completely - this ensures animation always restarts
                boardSprite.userData.isAnimating = true;
                boardSprite.userData.animationTime = 0;
                boardLastAnimationTime = Date.now(); // Reset timing for new animation
                
                // Use true base position for animation (never changes)
                boardSprite.userData.originalX = boardSprite.userData.baseX;
                boardSprite.userData.originalY = boardSprite.userData.baseY;
            });

            boardSprite.on('pointerleave', (event) => {
                if (!boardSprite.userData) return;
                
                boardSprite.userData.isOverBoard = false;
            });
            
            // Also handle tap/click for mobile devices
            boardSprite.on('pointertap', (event) => {
                enableAudioOnSpriteInteraction(bookMoveSound); // Enable audio on sprite interaction
                if (!boardSprite.userData) return;
                
                // Immediately reset to true base position before starting new animation
                boardSprite.x = boardSprite.userData.baseX;
                boardSprite.y = boardSprite.userData.baseY;
                boardSprite.rotation = 0;
                if (boardStrokeSprite) {
                    boardStrokeSprite.x = boardSprite.x;
                    boardStrokeSprite.y = boardSprite.y;
                    boardStrokeSprite.rotation = 0;
                }
                
                // Trigger same animation as hover for mobile
                boardSprite.userData.isOverBoard = true;
                boardSprite.userData.isAnimating = true;
                boardSprite.userData.animationTime = 0;
                boardLastAnimationTime = Date.now();
                // Use true base position for animation (never changes)
                boardSprite.userData.originalX = boardSprite.userData.baseX;
                boardSprite.userData.originalY = boardSprite.userData.baseY;
                playSpriteSound(bookMoveSound);
            });

            // Animate board wobble/movement sequence (triggered on hover) - similar to book sprite
            let boardLastAnimationTime = Date.now();
            
            // Use a single ticker that checks animation state (like book sprite)
            app.ticker.add(() => {
                if (boardSprite && boardSprite.userData) {
                    const data = boardSprite.userData;
                    
                    // Handle wobble animation sequence (one-time animation)
                    if (data.isAnimating) {
                        const now = Date.now();
                        const deltaSeconds = (now - boardLastAnimationTime) / 1000; // Convert to seconds
                        boardLastAnimationTime = now;
                        data.animationTime += deltaSeconds;
                        
                        const progress = Math.min(1, data.animationTime / data.animationDuration);
                        
                        // Wobble animation - subtle movement (both position and rotation)
                        const maxTilt = 1.5; // Degrees for rotation (reduced for more subtle effect)
                        const maxMovement = 2; // Pixels for position movement (reduced for more subtle effect)
                        const wobbleFrequency = 3; // How many wobbles during the animation
                        // Fade out the wobble as animation progresses (ease out)
                        const fadeOut = 1 - Math.pow(progress, 2); // Ease out curve
                        const wobbleAmount = Math.sin(progress * Math.PI * wobbleFrequency) * fadeOut;
                        
                        // Apply rotation wobble
                        const targetRotation = (wobbleAmount * maxTilt * Math.PI) / 180; // Convert to radians
                        boardSprite.rotation = targetRotation;
                        
                        // Apply position movement (slight shift)
                        const movementX = Math.cos(progress * Math.PI * wobbleFrequency) * maxMovement * fadeOut;
                        const movementY = Math.sin(progress * Math.PI * wobbleFrequency * 0.5) * maxMovement * fadeOut;
                        boardSprite.x = data.originalX + movementX;
                        boardSprite.y = data.originalY + movementY;
                        
                        // Also apply to stroke sprite if it exists
                        if (boardStrokeSprite) {
                            boardStrokeSprite.rotation = targetRotation;
                            boardStrokeSprite.x = boardSprite.x;
                            boardStrokeSprite.y = boardSprite.y;
                        }
                        
                        // End animation when complete - always return to true base position
                        if (progress >= 1) {
                            data.isAnimating = false;
                            boardSprite.rotation = 0;
                            boardSprite.x = data.baseX; // Always return to true base position
                            boardSprite.y = data.baseY; // Always return to true base position
                            if (boardStrokeSprite) {
                                boardStrokeSprite.rotation = 0;
                                boardStrokeSprite.x = boardSprite.x;
                                boardStrokeSprite.y = boardSprite.y;
                            }
                        }
                    }
                }
            });

            // Create stroke Sprite from the stroke texture
            boardStrokeSprite = new Sprite(boardStrokeTexture);
            boardStrokeSprite.anchor.set(0.5);

            // Stroke sprite is hidden by default, shown on hover
            boardStrokeSprite.visible = false;
            boardStrokeSprite.alpha = 1.0;

            // Get board stroke image dimensions
            const boardStrokeImageWidth = boardStrokeTexture.orig?.width || boardStrokeTexture.width || boardStrokeTexture.baseTexture.width || 571;
            const boardStrokeImageHeight = boardStrokeTexture.orig?.height || boardStrokeTexture.height || boardStrokeTexture.baseTexture.height || 520;

            // Board stroke config - uses same position as board but with stroke dimensions
            // Position on bg1.png (in pixels):
            // Left X: 3461, Right X: 4032, Top Y: 730, Bottom Y: 1250
            // Center X: (3461 + 4032) / 2 = 3746.5
            // Center Y: (730 + 1250) / 2 = 990
            // Dimensions: width: 571 pixels, height: 520 pixels (on bg1.png)
            const boardStrokeConfig = {
                boardStrokeWidth: 571,
                boardStrokeHeight: 520,
                bg1X: 3746.5, // Center X position on bg1.png (same as board)
                bg1Y: 990, // Center Y position on bg1.png (same as board)
                scale: 1.0, // Will be calculated below
                offsetX: 0,
                offsetY: 0
            };

            // Calculate scale to make stroke image fit into designated space on bg1.png
            if (boardStrokeImageWidth && boardStrokeImageHeight && boardStrokeConfig.boardStrokeWidth && boardStrokeConfig.boardStrokeHeight) {
                const imageScaleFactorX = imageWidth / ORIGINAL_IMAGE_WIDTH;
                const imageScaleFactorY = imageHeight / ORIGINAL_IMAGE_HEIGHT;
                const scaledBoardStrokeWidth = boardStrokeConfig.boardStrokeWidth * imageScaleFactorX;
                const scaledBoardStrokeHeight = boardStrokeConfig.boardStrokeHeight * imageScaleFactorY;
                
                const relativeScaleX = scaledBoardStrokeWidth / boardStrokeImageWidth;
                const relativeScaleY = scaledBoardStrokeHeight / boardStrokeImageHeight;

                boardStrokeConfig.scale = Math.min(relativeScaleX, relativeScaleY);
            } else {
                boardStrokeConfig.scale = 1.0;
            }

            // Store config in userData for stroke sprite (same config as board)
            boardStrokeSprite.userData = boardStrokeSprite.userData || {};
            boardStrokeSprite.userData.config = boardStrokeConfig;
            boardStrokeSprite.userData.useBoardConfig = true; // Flag to use board's config

            // Add stroke overlay to stage (on top of board sprite)
            app.stage.addChild(boardStrokeSprite);
            boardStrokeSprite.zIndex = 7;

            // Set initial position and scale (will be updated in resizeBackground)
            boardStrokeSprite.x = boardSprite.x;
            boardStrokeSprite.y = boardSprite.y;
            boardStrokeSprite.scale.set(boardSprite.scale.x, boardSprite.scale.y);

            // Responsive font size
            const getResponsiveBoardFontSize = () => {
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                const minDimension = Math.min(screenWidth, screenHeight);

                let fontSize = 160;
                if (minDimension <= 768) {
                    fontSize = 72;
                } else if (minDimension <= 1024) {
                    fontSize = 96;
                } else if (minDimension <= 1440) {
                    fontSize = 120;
                } else if (minDimension <= 1920) {
                    fontSize = 140;
                }
                return fontSize;
            };

            const getResponsiveBoardDotRadius = () => {
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                const minDimension = Math.min(screenWidth, screenHeight);
                let baseRadius = 4;
                if (minDimension <= 768) baseRadius = 2.5;
                else if (minDimension <= 1024) baseRadius = 3;
                else if (minDimension <= 1440) baseRadius = 3.5;
                return baseRadius;
            };

            // Create pulsing dot
            boardDot = new Graphics();
            const boardDotColor = 0xFFFFFF;
            boardDot.userData = boardDot.userData || {};
            boardDot.userData.pulseTime = 0;
            boardDot.userData.baseRadius = getResponsiveBoardDotRadius();
            boardDot.circle(0, 0, boardDot.userData.baseRadius);
            boardDot.fill({ color: boardDotColor, alpha: 0.9 });
            boardDot.visible = false;
            boardDot.eventMode = 'static';
            boardDot.cursor = 'pointer';
            boardDot.x = boardSprite.x;
            boardDot.y = boardSprite.y;
            boardDot.zIndex = 8;
            app.stage.addChild(boardDot);

            // Smooth pulsing animation
            app.ticker.add(() => {
                if (boardDot && boardDot.visible && boardDot.parent) {
                    boardDot.userData.pulseTime += 0.025;
                    if (typeof boardDot.clear === 'function') boardDot.clear();
                    const baseRadius = boardDot.userData.baseRadius;
                    const numWaves = 4;
                    for (let i = 0; i < numWaves; i++) {
                        const wavePhase = boardDot.userData.pulseTime + (i * (Math.PI * 2 / numWaves));
                        const waveSize = Math.sin(wavePhase);
                        const waveExpansion = 8 + (i * 1.5);
                        const waveRadius = baseRadius + (waveSize * waveExpansion * (1 - i * 0.25));
                        const baseAlpha = 0.95 - (i * 0.15);
                        const alphaVariation = Math.abs(waveSize) * 0.3;
                        const waveAlpha = Math.max(0, Math.min(0.95, baseAlpha - alphaVariation));
                        if (waveRadius > 0 && waveAlpha > 0.05) {
                            boardDot.circle(0, 0, waveRadius);
                            boardDot.fill({ color: boardDotColor, alpha: waveAlpha });
                        }
                    }
                }
            });

            // Create "NEWS" text
            const createBoardText = async () => {
                const boardTextStyle = new TextStyle({
                    fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK,
                    fontSize: getResponsiveBoardFontSize(),
                    fill: 0xFFFFFF,
                    align: 'center',
                    fontWeight: 'bold',
                });
                boardTextSprite = new Text({
                    text: 'NEWS',
                    style: boardTextStyle,
                });
                boardTextSprite.anchor.set(0.5);
                boardTextSprite.visible = false;
                boardTextSprite.eventMode = 'none';
                boardTextSprite.userData = {
                    getResponsiveFontSize: getResponsiveBoardFontSize,
                    startX: null,
                    startY: null,
                    targetX: null,
                    targetY: null,
                    currentX: null,
                    currentY: null,
                    isAnimating: false,
                    animationSpeed: 0.09,
                };
                boardTextSprite.zIndex = 9;
                app.stage.addChild(boardTextSprite);
            };
            await createBoardText();

            let boardAnimationTicker = null;
            const showBoardText = () => {
                if (!boardTextSprite || !boardSprite) return;
                if (boardAnimationTicker) {
                    app.ticker.remove(boardAnimationTicker);
                    boardAnimationTicker = null;
                }

                const bg1TargetX = 2666.5;
                const bg1TargetY = 1630.5;
                if (backgroundSprite && boardSprite.userData && boardSprite.userData.config) {
                    const boardConfigLocal = boardSprite.userData.config;
                    const scale = currentScale || 1;
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;
                    const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                    const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                    const targetScreenX = bg1Left + (bg1TargetX / imageWidth) * bg1DisplayedWidth;
                    const targetScreenY = bg1Top + (bg1TargetY / imageHeight) * bg1DisplayedHeight;
                    boardTextSprite.userData.targetX = targetScreenX;
                    boardTextSprite.userData.targetY = targetScreenY;
                    const cardEjectionDistance = 200;
                    boardTextSprite.userData.startX = targetScreenX;
                    boardTextSprite.userData.startY = targetScreenY + cardEjectionDistance;
                } else {
                    boardTextSprite.userData.targetX = app.screen.width / 2;
                    boardTextSprite.userData.targetY = app.screen.height / 2;
                    const cardEjectionDistance = 200;
                    boardTextSprite.userData.startX = boardTextSprite.userData.targetX;
                    boardTextSprite.userData.startY = boardTextSprite.userData.targetY + cardEjectionDistance;
                }

                boardTextSprite.userData.isAnimating = true;
                boardTextSprite.x = boardTextSprite.userData.startX;
                boardTextSprite.y = boardTextSprite.userData.startY;
                boardTextSprite.userData.currentX = boardTextSprite.userData.startX;
                boardTextSprite.userData.currentY = boardTextSprite.userData.startY;
                boardTextSprite.visible = true;
                boardTextSprite.alpha = 1.0;

                boardAnimationTicker = app.ticker.add(() => {
                    if (!boardTextSprite || !boardTextSprite.userData.isAnimating) return;
                    const data = boardTextSprite.userData;
                    const distanceX = data.targetX - data.currentX;
                    const distanceY = data.targetY - data.currentY;
                    if (Math.abs(distanceX) > 0.5 || Math.abs(distanceY) > 0.5) {
                        data.currentX += distanceX * data.animationSpeed;
                        data.currentY += distanceY * data.animationSpeed;
                        boardTextSprite.x = data.currentX;
                        boardTextSprite.y = data.currentY;
                    } else {
                        boardTextSprite.x = data.targetX;
                        boardTextSprite.y = data.targetY;
                        data.currentX = data.targetX;
                        data.currentY = data.targetY;
                        data.isAnimating = false;
                        app.ticker.remove(boardAnimationTicker);
                        boardAnimationTicker = null;
                    }
                });
            };

            const hideBoardText = () => {
                if (!boardTextSprite) return;
                if (boardAnimationTicker) {
                    app.ticker.remove(boardAnimationTicker);
                    boardAnimationTicker = null;
                }
                if (boardTextSprite.userData) {
                    boardTextSprite.userData.isAnimating = false;
                }
                boardTextSprite.visible = false;
                boardTextSprite.alpha = 0;
            };

            // Circle hint
            boardCircleText = new Container();
            const boardCircleBg = new Graphics();
            const boardCircleRadius = 70;
            boardCircleBg.circle(0, 0, boardCircleRadius);
            boardCircleBg.fill({ color: 0xFFFFFF, alpha: 0.1 });
            const boardCircleTextStyle = new TextStyle({
                fontFamily: 'sans-serif',
                fontSize: 16,
                fill: 0xFFFFFF,
                align: 'center',
                fontWeight: 'bold',
            });
            const boardClickTextTop = new Text({ text: 'Click To', style: boardCircleTextStyle });
            boardClickTextTop.anchor.set(0.5);
            boardClickTextTop.y = -8;
            const boardClickTextBottom = new Text({ text: 'Explore', style: boardCircleTextStyle });
            boardClickTextBottom.anchor.set(0.5);
            boardClickTextBottom.y = 8;
            boardCircleText.addChild(boardCircleBg);
            boardCircleText.addChild(boardClickTextTop);
            boardCircleText.addChild(boardClickTextBottom);
            boardCircleText.visible = false;
            boardCircleText.eventMode = 'none';
            boardCircleText.cursor = 'default';
            boardCircleText.zIndex = 15;
            app.stage.addChild(boardCircleText);

            // Mobile label
            const boardMobileLabelStyle = new TextStyle({
                fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK,
                fontSize: 18,
                fill: 0xFFFFFF,
                align: 'center',
                fontWeight: 'bold',
            });
            boardLabelText = new Text({
                text: 'News',
                style: boardMobileLabelStyle,
            });
            boardLabelText.anchor.set(0.5);
            boardLabelText.visible = false;
            boardLabelText.zIndex = 14;
            app.stage.addChild(boardLabelText);

            // Hover logic
            let boardLastMousePos = { x: 0, y: 0 };
            let boardIsCircleActive = false;
            const BOARDCURSOR_TIP_OFFSET_X = 12;
            const BOARDCURSOR_TIP_OFFSET_Y = -25;

            const isCursorInBoardDotBounds = (cursorX, cursorY) => {
                if (!boardDot || !boardDot.parent || !boardDot.userData) return false;
                const dotX = boardDot.x;
                const dotY = boardDot.y;
                const baseRadius = boardDot.userData.baseRadius || getResponsiveBoardDotRadius();
                const maxWaveExpansion = 12.5;
                const tolerance = baseRadius * 0.8;
                const maxDotRadius = baseRadius + maxWaveExpansion + tolerance;
                const dx = cursorX - dotX;
                const dy = cursorY - dotY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance <= maxDotRadius;
            };

            const showBoardCircle = (cursorX, cursorY) => {
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) return;
                if (boardIsCircleActive) return;
                boardDot.visible = false;
                boardCircleText.visible = true;
                boardIsCircleActive = true;
                showBoardText();

                // Show stroke overlay
                if (boardStrokeSprite && boardSprite) {
                    boardStrokeSprite.visible = true;
                    boardStrokeSprite.alpha = 1.0;
                    // Position and scale stroke to match board
                    boardStrokeSprite.x = boardSprite.x;
                    boardStrokeSprite.y = boardSprite.y;
                    boardStrokeSprite.scale.set(boardSprite.scale.x, boardSprite.scale.y);
                }

                // Anchor circle to the board so it stays fixed while panning (use base position, not animated position)
                const boardX = (boardSprite.userData && boardSprite.userData.baseX !== undefined) 
                    ? boardSprite.userData.baseX 
                    : boardSprite.x;
                const boardY = (boardSprite.userData && boardSprite.userData.baseY !== undefined) 
                    ? boardSprite.userData.baseY 
                    : boardSprite.y;
                boardCircleText.x = boardX;
                boardCircleText.y = boardY;
            };

            const hideBoardCircle = () => {
                if (!boardIsCircleActive) return;
                boardDot.visible = true;
                boardCircleText.visible = false;
                boardIsCircleActive = false;
                hideBoardText();

                // Hide stroke overlay
                if (boardStrokeSprite) {
                    boardStrokeSprite.visible = false;
                }
            };

            const updateBoardCircleBasedOnBounds = (cursorX, cursorY) => {
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) return;
                const inBounds = isCursorInBoardDotBounds(cursorX, cursorY);
                if (inBounds && !boardIsCircleActive) {
                    showBoardCircle(cursorX, cursorY);
                } else if (!inBounds && boardIsCircleActive) {
                    hideBoardCircle();
                } else if (!inBounds && boardTextSprite && boardTextSprite.visible) {
                    hideBoardText();
                }
            };

            document.addEventListener('mousemove', (e) => {
                const rect = app.canvas.getBoundingClientRect();
                const scaleX = app.canvas.width / rect.width;
                const scaleY = app.canvas.height / rect.height;
                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;
                boardLastMousePos.x = mouseX;
                boardLastMousePos.y = mouseY;
                updateBoardCircleBasedOnBounds(mouseX, mouseY);
            });

            document.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches.length > 0) {
                    const rect = app.canvas.getBoundingClientRect();
                    const scaleX = app.canvas.width / rect.width;
                    const scaleY = app.canvas.height / rect.height;
                    const touchX = (e.touches[0].clientX - rect.left) * scaleX;
                    const touchY = (e.touches[0].clientY - rect.top) * scaleY;
                    boardLastMousePos.x = touchX;
                    boardLastMousePos.y = touchY;
                    if (!isDragging) {
                        updateBoardCircleBasedOnBounds(touchX, touchY);
                    }
                }
            }, { passive: true });

            app.stage.on('globalpointermove', (e) => {
                const globalPos = e.global;
                boardLastMousePos.x = globalPos.x;
                boardLastMousePos.y = globalPos.y;
                updateBoardCircleBasedOnBounds(globalPos.x, globalPos.y);
            });

            app.ticker.add(() => {
                if (boardDot && boardDot.parent) {
                    updateBoardCircleBasedOnBounds(boardLastMousePos.x, boardLastMousePos.y);
                    // Keep circle/text anchored to board while active (so it doesn't drift during panning)
                    // Use base position, not animated position
                    if (boardIsCircleActive && boardSprite && boardCircleText) {
                        const boardX = (boardSprite.userData && boardSprite.userData.baseX !== undefined) 
                            ? boardSprite.userData.baseX 
                            : boardSprite.x;
                        const boardY = (boardSprite.userData && boardSprite.userData.baseY !== undefined) 
                            ? boardSprite.userData.baseY 
                            : boardSprite.y;
                        boardCircleText.x = boardX;
                        boardCircleText.y = boardY;
                    }
                    if (!boardIsCircleActive && boardTextSprite && boardTextSprite.visible) {
                        hideBoardText();
                    }
                    
                    // Continuously update board label position on mobile/tablet (like CCTV label)
                    // This ensures it stays fixed below the dot even during panning
                    if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet() && boardLabelText && boardSprite) {
                        // Use base position if available, otherwise use current position
                        const boardX = (boardSprite.userData && boardSprite.userData.baseX !== undefined) 
                            ? boardSprite.userData.baseX 
                            : boardSprite.x;
                        const boardY = (boardSprite.userData && boardSprite.userData.baseY !== undefined) 
                            ? boardSprite.userData.baseY 
                            : boardSprite.y;
                        
                        // Update dot position first
                        boardDot.x = boardX;
                        boardDot.y = boardY;
                        
                        // Then update label position relative to dot
                        boardLabelText.x = boardDot.x;
                        boardLabelText.y = boardDot.y + 40; // Position label below dot
                        boardLabelText.visible = true;
                    }
                }
            });

            // Pointer handlers
            boardDot.on('pointerdown', (event) => {
                enableAudioOnSpriteInteraction();
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    event.stopPropagation();
                    return;
                }
                const globalPos = event.global;
                showBoardCircle(globalPos.x, globalPos.y);
                event.stopPropagation();
            });

            const openNews = () => {
                window.location.href = 'news.html';
            };

            boardDot.on('pointerup', (event) => {
                const globalPos = event.global;
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    openNews();
                    event.stopPropagation();
                    return;
                }
                if (isCursorInBoardDotBounds(globalPos.x, globalPos.y)) {
                    openNews();
                }
                event.stopPropagation();
            });

            boardDot.on('pointertap', (event) => {
                enableAudioOnSpriteInteraction();
                openNews();
                event.stopPropagation();
            });

            boardCircleText.eventMode = 'static';
            boardCircleText.cursor = 'pointer';
            boardCircleText.on('pointerdown', (event) => event.stopPropagation());
            boardCircleText.on('pointerup', (event) => event.stopPropagation());
            boardCircleText.on('pointertap', (event) => {
                enableAudioOnSpriteInteraction();
                openNews();
                event.stopPropagation();
            });

        } catch (error) {
            // Error loading Board textures
            console.error('Failed to load Board textures:', error);
            console.error('Board texture URL attempted: assets/board.png');
        }

        // Load CCTV animated frames (cctv1.png to cctv3.png - 3 frames total)
        try {

            // Load all 3 CCTV frames in parallel for faster loading
            const cctvUrls = Array.from({ length: 3 }, (_, i) => `/assets/cctv${i + 1}.png`);
            const cctvTextures = await loadAssetsInParallel(cctvUrls);
            cctvTextures.forEach((texture, i) => {

            });

            // Load CCTV stroke animated frames (cctv1_stroke.png to cctv3_stroke.png - 3 frames total)

            // Load all 3 stroke frames in parallel for faster loading
            const cctvStrokeUrls = Array.from({ length: 3 }, (_, i) => `/assets/cctv${i + 1}_stroke.png`);
            const cctvStrokeTextures = await loadAssetsInParallel(cctvStrokeUrls);
            cctvStrokeTextures.forEach((texture, i) => {

            });

            // Create AnimatedSprite from the CCTV textures
            cctvSprite = new AnimatedSprite(cctvTextures);
            cctvSprite.anchor.set(0.5);

            // Configure CCTV animation settings
            cctvSprite.animationSpeed = 0.01; // Speed of animation (0.05 = 5% of ticker speed, very slow animation)
            cctvSprite.loop = true; // Loop the animation

            // Hide sprite initially until resizeBackground positions it correctly
            cctvSprite.visible = false;
            cctvSprite.alpha = 1.0;

            cctvSprite.play(); // Start the animation

            // Create AnimatedSprite from the CCTV stroke textures
            cctvStrokeSprite = new AnimatedSprite(cctvStrokeTextures);
            cctvStrokeSprite.anchor.set(0.5);

            // Configure stroke animation settings to match CCTV
            cctvStrokeSprite.animationSpeed = 0.01; // Same speed as CCTV animation
            cctvStrokeSprite.loop = true; // Loop the animation

            // Hide stroke sprite initially until resizeBackground positions it correctly
            cctvStrokeSprite.visible = false;
            cctvStrokeSprite.alpha = 1.0;

            cctvStrokeSprite.play(); // Start the animation

            // Get CCTV dimensions (use first frame as reference)
            const cctvImageWidth = cctvTextures[0].orig?.width || cctvTextures[0].width || cctvTextures[0].baseTexture.width;
            const cctvImageHeight = cctvTextures[0].orig?.height || cctvTextures[0].height || cctvTextures[0].baseTexture.height;

            // CCTV positioning and sizing config - same technique as cup and glitch
            // Position on bg1.png (in pixels):
            // Left X: 4057, Right X: 4622, Top Y: 527, Bottom Y: 960
            // Center X: (4057 + 4622) / 2 = 4339.5
            // Center Y: (527 + 960) / 2 = 743.5
            // Dimensions: width: 566 pixels, height: 434 pixels (on bg1.png)
            const cctvConfig = {
                // CCTV dimensions (on bg1.png coordinate space)
                cctvWidth: 566,
                cctvHeight: 434,

                // Position on bg1.png (center of CCTV)
                bg1X: 4339.5, // Center X position on bg1.png
                bg1Y: 743.5, // Center Y position on bg1.png

                // Scale: calculated to make CCTV fit its designated space on bg1.png
                scale: 1.0, // Will be calculated below

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make CCTV image fit into designated space on bg1.png
            if (cctvImageWidth && cctvImageHeight && cctvConfig.cctvWidth && cctvConfig.cctvHeight) {
                // Scale cctvWidth/cctvHeight proportionally based on image optimization
                const imageScaleFactorX = imageWidth / ORIGINAL_IMAGE_WIDTH;
                const imageScaleFactorY = imageHeight / ORIGINAL_IMAGE_HEIGHT;
                const scaledCctvWidth = cctvConfig.cctvWidth * imageScaleFactorX;
                const scaledCctvHeight = cctvConfig.cctvHeight * imageScaleFactorY;
                
                const relativeScaleX = scaledCctvWidth / cctvImageWidth;
                const relativeScaleY = scaledCctvHeight / cctvImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                cctvConfig.scale = Math.min(relativeScaleX, relativeScaleY);
            } else {
                // Fallback: use natural size
                cctvConfig.scale = 1.0;
            }

            // Store config in userData for CCTV sprite (same technique as capsule and cup)
            cctvSprite.userData = cctvSprite.userData || {};
            cctvSprite.userData.config = cctvConfig;

            // Hide sprite initially until resizeBackground positions it correctly
            cctvSprite.visible = false;
            cctvSprite.alpha = 1.0;

            // Add to stage
            app.stage.addChild(cctvSprite);

            // Set initial position (will be updated by resizeBackground)
            cctvSprite.x = app.screen.width / 2;
            cctvSprite.y = app.screen.height / 2;

            // Function to calculate responsive font size based on screen size (bigger font)
            const getResponsiveCctvFontSize = () => {
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                const minDimension = Math.min(screenWidth, screenHeight);

                // Large screens (desktop) - big text (increased sizes)
                let fontSize = 180;

                // Responsive scaling based on screen size
                if (minDimension <= 768) {
                    // Mobile phones - smaller
                    fontSize = 72;
                } else if (minDimension <= 1024) {
                    // Tablets - medium
                    fontSize = 96;
                } else if (minDimension <= 1440) {
                    // Small laptops - medium-large
                    fontSize = 120;
                } else if (minDimension <= 1920) {
                    // Standard desktop - large
                    fontSize = 150;
                }
                // Larger screens use fontSize = 180

                return fontSize;
            };

            // Function to calculate responsive dot radius based on screen size
            const getResponsiveCctvDotRadius = () => {
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                const minDimension = Math.min(screenWidth, screenHeight);

                // Base size for large screens (desktop)
                let baseRadius = 4;

                // Responsive scaling based on screen size
                if (minDimension <= 768) {
                    // Mobile phones - smallest
                    baseRadius = 2.5;
                } else if (minDimension <= 1024) {
                    // Tablets - small
                    baseRadius = 3;
                } else if (minDimension <= 1440) {
                    // Small laptops - medium
                    baseRadius = 3.5;
                }
                // Desktop (larger) uses baseRadius = 4

                return baseRadius;
            };

            // Create pulsing dot at center of CCTV (wave-like animation)
            cctvDot = new Graphics();
            const dotColor = 0xFFFFFF; // White dot

            // Pulsing animation variables
            cctvDot.userData = cctvDot.userData || {};
            cctvDot.userData.pulseTime = 0;
            cctvDot.userData.baseRadius = getResponsiveCctvDotRadius();

            // Function to update dot size (call on resize)
            const updateCctvDotSize = () => {
                cctvDot.userData.baseRadius = getResponsiveCctvDotRadius();
            };

            // Draw initial dot
            cctvDot.circle(0, 0, cctvDot.userData.baseRadius);
            cctvDot.fill({ color: dotColor, alpha: 0.9 });
            // Hide dot initially until resizeBackground positions it correctly
            cctvDot.visible = false;
            cctvDot.eventMode = 'static';
            cctvDot.cursor = 'pointer';

            // Position dot at center of CCTV sprite
            cctvDot.x = cctvSprite.x;
            cctvDot.y = cctvSprite.y;

            // Add dot to stage
            app.stage.addChild(cctvDot);

            // Store config in userData for stroke sprite (same config as CCTV)
            cctvStrokeSprite.userData = cctvStrokeSprite.userData || {};
            cctvStrokeSprite.userData.config = cctvConfig;

            // Add stroke overlay to stage (on top of CCTV sprite)
            app.stage.addChild(cctvStrokeSprite);

            // Set initial position and scale (will be updated in resizeBackground)
            cctvStrokeSprite.x = cctvSprite.x;
            cctvStrokeSprite.y = cctvSprite.y;
            cctvStrokeSprite.scale.set(cctvSprite.scale.x, cctvSprite.scale.y);

            // Sync stroke animation frames with CCTV animation frames
            // This ensures the stroke animation perfectly matches the CCTV animation frame-by-frame
            app.ticker.add(() => {
                if (cctvStrokeSprite && cctvSprite && cctvSprite.currentFrame !== undefined) {
                    // Keep stroke animation frame in sync with CCTV animation frame
                    if (cctvStrokeSprite.currentFrame !== cctvSprite.currentFrame) {
                        // Use gotoAndStop to sync frame without advancing animation
                        cctvStrokeSprite.gotoAndStop(cctvSprite.currentFrame);
                    }
                    // Also sync position and scale every frame to ensure perfect alignment
                    if (cctvStrokeSprite.visible) {
                        cctvStrokeSprite.x = cctvSprite.x;
                        cctvStrokeSprite.y = cctvSprite.y;
                        cctvStrokeSprite.scale.set(cctvSprite.scale.x, cctvSprite.scale.y);
                    }
                }
            });

            // Enhanced smooth pulsing animation (nicer wave effect)
            app.ticker.add(() => {
                if (cctvDot && cctvDot.visible && cctvDot.parent) {
                    cctvDot.userData.pulseTime += 0.025; // Smooth, gentle pulse speed

                    // Additional null check before clearing to prevent errors
                    if (cctvDot && typeof cctvDot.clear === 'function') {
                        cctvDot.clear();
                    }

                    const baseRadius = cctvDot.userData.baseRadius;

                    // Create multiple smooth ripple waves for enhanced effect
                    const numWaves = 4; // More waves for smoother effect
                    for (let i = 0; i < numWaves; i++) {
                        // Smoother wave calculation using easing
                        const wavePhase = cctvDot.userData.pulseTime + (i * (Math.PI * 2 / numWaves));

                        // Use smoother sine wave with adjusted amplitude
                        const waveSize = Math.sin(wavePhase);

                        // Smoother wave expansion - more gradual
                        const waveExpansion = 8 + (i * 1.5);
                        const waveRadius = baseRadius + (waveSize * waveExpansion * (1 - i * 0.25));

                        // Smoother alpha fade - more gradual
                        const baseAlpha = 0.95 - (i * 0.15);
                        const alphaVariation = Math.abs(waveSize) * 0.3;
                        const waveAlpha = Math.max(0, Math.min(0.95, baseAlpha - alphaVariation));

                        // Only draw if radius and alpha are valid
                        if (waveRadius > 0 && waveAlpha > 0.05) {
                            cctvDot.circle(0, 0, waveRadius);
                            cctvDot.fill({ color: dotColor, alpha: waveAlpha });
                        }
                    }
                }
            });

            // Wait for font to load before creating text (fixes font loading issue)
            const createCctvText = async () => {
                // Wait for font to be loaded before creating text
                if (document.fonts && document.fonts.check) {
                    function checkFont(fontFamily) {
                        return document.fonts.check(`1em "${fontFamily}"`) || 
                               document.fonts.check(`1em ${fontFamily}`) ||
                               document.fonts.check(`12px "${fontFamily}"`) ||
                               document.fonts.check(`12px ${fontFamily}`);
                    }
                    
                    let fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                    if (!fontLoaded) {
                        // Wait a bit more for font to load
                        let attempts = 0;
                        const maxAttempts = 30; // 3 seconds (increased from 1)
                        while (!fontLoaded && attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                            attempts++;
                        }
                    }
                    
                    // Force font loading by creating a test element (helps ensure font is ready for PixiJS)
                    if (fontLoaded) {
                        try {
                            const testElement = document.createElement('div');
                            testElement.style.fontFamily = GLOBAL_FONT_FAMILY_WITH_FALLBACK;
                            testElement.style.position = 'absolute';
                            testElement.style.visibility = 'hidden';
                            testElement.style.fontSize = '12px';
                            testElement.textContent = 'Test';
                            document.body.appendChild(testElement);
                            // Force browser to load font
                            const computedStyle = window.getComputedStyle(testElement);
                            const fontFamily = computedStyle.fontFamily;
                            // Wait a bit for font to be fully ready
                            await new Promise(resolve => setTimeout(resolve, 50));
                            document.body.removeChild(testElement);
                        } catch (e) {
                            // Error forcing font load
                        }
                    }
                    
                    if (!fontLoaded) {
                        // Font not detected for CCTV text, but proceeding
                        } else {

                    }
                }

                // Create "X Account" text with Google Font (Zilla Slab Highlight)
                const cctvTextStyle = new TextStyle({
                    fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK, // Google Font with fallback
                    fontSize: getResponsiveCctvFontSize(),
                    fill: 0xFFFFFF, // White text
                    align: 'center',
                    fontWeight: 'bold',
                });

                cctvTextSprite = new Text({
                    text: 'X ACCOUNT',
                    style: cctvTextStyle,
                });

                cctvTextSprite.anchor.set(0.5); // Center the text
                cctvTextSprite.visible = false; // Hidden by default, shows on hover
                cctvTextSprite.eventMode = 'none'; // Don't block pointer events
                
                // Force font to load by updating text texture after a short delay
                // This ensures the custom font is applied even if it loads after text creation
                setTimeout(() => {
                    if (cctvTextSprite && !cctvTextSprite.destroyed) {
                        // Force texture update to apply custom font
                        cctvTextSprite.style = cctvTextStyle;
                        // Trigger a render to ensure font is applied
                        if (app && app.renderer) {
                            app.renderer.render(app.stage);
                        }
                    }
                }, 100);

                // Store responsive font size function and animation state in userData
                cctvTextSprite.userData = {
                    getResponsiveFontSize: getResponsiveCctvFontSize,
                    startX: null, // Will be set to X: 2666.5 (converted to screen coordinates)
                    startY: null, // Will be set to Y: 1630.5 (converted to screen coordinates)
                    targetX: null, // Will be set to CCTV center X
                    targetY: null, // Will be set to CCTV center Y
                    currentX: null,
                    currentY: null,
                    isAnimating: false,
                    animationSpeed: 0.05, // Speed of ATM withdrawal animation
                };

                // Add text to stage
                app.stage.addChild(cctvTextSprite);
            };

            // Call async function to create text with font loading
            await createCctvText();
            cctvTextSprite.anchor.set(0.5); // Center the text
            cctvTextSprite.visible = false; // Hidden by default, shows on hover
            cctvTextSprite.eventMode = 'none'; // Don't block pointer events

            // Store responsive font size function and animation state in userData
            cctvTextSprite.userData = {
                getResponsiveFontSize: getResponsiveCctvFontSize,
                startX: null, // Will be set to X: 2666.5 (converted to screen coordinates)
                startY: null, // Will be set to Y: 1731.5 (converted to screen coordinates)
                targetX: null, // Will be set to CCTV center X
                targetY: null, // Will be set to CCTV center Y
                currentX: null,
                currentY: null,
                isAnimating: false,
                animationSpeed: 0.09, // Speed of ATM withdrawal animation
            };

            // Add text to stage
            app.stage.addChild(cctvTextSprite);

            // Store animation ticker reference to prevent multiple tickers
            let cctvAnimationTicker = null;

            // Function to show text with ATM withdrawal animation (slides up from below)
            const showCctvText = () => {
                if (!cctvTextSprite || !cctvSprite) return;

                // Remove any existing animation ticker
                if (cctvAnimationTicker) {
                    app.ticker.remove(cctvAnimationTicker);
                    cctvAnimationTicker = null;
                }

                // Calculate positions for ATM card ejection effect (slides up from bottom)
                const bg1TargetX = 2666.5; // Target X position
                const bg1TargetY = 1630.5; // Final Y position (same as Mutator - same level)

                // Get current background position and scale to convert coordinates
                if (backgroundSprite && cctvSprite.userData && cctvSprite.userData.config) {
                    const cctvConfig = cctvSprite.userData.config;
                    const scale = currentScale || 1;
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;
                    const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                    const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                    // Convert bg1 coordinates to screen coordinates
                    const normalizedTargetX = bg1TargetX / imageWidth;
                    const normalizedTargetY = bg1TargetY / imageHeight;

                    const targetScreenX = bg1Left + (normalizedTargetX * bg1DisplayedWidth);
                    const targetScreenY = bg1Top + (normalizedTargetY * bg1DisplayedHeight);

                    // Target position (final position where text should be)
                    cctvTextSprite.userData.targetX = targetScreenX;
                    cctvTextSprite.userData.targetY = targetScreenY;

                    // Start position (text starts from bottom, slides up like ATM card ejection)
                    const cardEjectionDistance = 300; // Distance to slide up (like card coming out of ATM)
                    cctvTextSprite.userData.startX = targetScreenX; // Same X position
                    cctvTextSprite.userData.startY = targetScreenY + cardEjectionDistance; // Start below, slides up
                } else {
                    // Fallback: use center page position directly
                    cctvTextSprite.userData.targetX = app.screen.width / 2;
                    cctvTextSprite.userData.targetY = app.screen.height / 2;
                    const cardEjectionDistance = 300;
                    cctvTextSprite.userData.startX = cctvTextSprite.userData.targetX; // Same X
                    cctvTextSprite.userData.startY = cctvTextSprite.userData.targetY + cardEjectionDistance; // Start from bottom
                }

                // Reset animation state
                cctvTextSprite.userData.isAnimating = true;

                // Start position (text starts from bottom, slides up like ATM card ejection)
                cctvTextSprite.x = cctvTextSprite.userData.startX;
                cctvTextSprite.y = cctvTextSprite.userData.startY;
                cctvTextSprite.userData.currentX = cctvTextSprite.userData.startX;
                cctvTextSprite.userData.currentY = cctvTextSprite.userData.startY;

                // Make visible - appears when cursor is pointed (same behavior as circle)
                cctvTextSprite.visible = true;
                
                // Force font refresh when text becomes visible to ensure custom font is applied
                if (cctvTextSprite && !cctvTextSprite.destroyed) {
                    // Force texture update to apply custom font
                    const currentStyle = cctvTextSprite.style;
                    cctvTextSprite.style = currentStyle; // Re-apply style to force font update
                    // Trigger a render to ensure font is applied
                    if (app && app.renderer) {
                        app.renderer.render(app.stage);
                    }
                }
                cctvTextSprite.alpha = 1.0;

                // Animate text sliding up from bottom (ATM card ejection effect)
                cctvTextSprite.userData.isAnimating = true;
                cctvAnimationTicker = app.ticker.add(() => {
                    if (!cctvTextSprite || !cctvTextSprite.userData.isAnimating) return;

                    const data = cctvTextSprite.userData;
                    const distanceX = data.targetX - data.currentX;
                    const distanceY = data.targetY - data.currentY;

                    if (Math.abs(distanceX) > 0.5 || Math.abs(distanceY) > 0.5) {
                        // Continue sliding up towards target (like card coming out of ATM from bottom)
                        data.currentX += (distanceX * data.animationSpeed);
                        data.currentY += (distanceY * data.animationSpeed);
                        cctvTextSprite.x = data.currentX;
                        cctvTextSprite.y = data.currentY;
                    } else {
                        // Reached target position (card fully ejected)
                        cctvTextSprite.x = data.targetX;
                        cctvTextSprite.y = data.targetY;
                        data.currentX = data.targetX;
                        data.currentY = data.targetY;
                        data.isAnimating = false;
                        app.ticker.remove(cctvAnimationTicker);
                        cctvAnimationTicker = null;
                    }
                });
            };

            // Function to hide text - hide immediately when cursor leaves (like circle behavior)
            const hideCctvText = () => {
                if (!cctvTextSprite) return;

                // Remove any existing animation ticker
                if (cctvAnimationTicker) {
                    app.ticker.remove(cctvAnimationTicker);
                    cctvAnimationTicker = null;
                }

                // Stop any ongoing animation
                if (cctvTextSprite.userData) {
                    cctvTextSprite.userData.isAnimating = false;
                }

                // Hide text immediately when cursor is not pointed (same as circle behavior)
                cctvTextSprite.visible = false;
                cctvTextSprite.alpha = 0;
            };

            // Create circle with "click to explore" text (hidden by default, similar to mutator capsule)
            cctvCircleText = new Container();

            // Create circle background - smaller circle, no border
            const cctvCircleBg = new Graphics();
            const cctvCircleRadius = 70; // Same as mutator capsule
            cctvCircleBg.circle(0, 0, cctvCircleRadius);
            cctvCircleBg.fill({ color: 0xFFFFFF, alpha: 0.1 }); // Semi-transparent white

            // Create text style - same as mutator capsule: simple, pure white, sans-serif, smaller, bold
            const cctvCircleTextStyle = new TextStyle({
                fontFamily: 'sans-serif', // System sans-serif font
                fontSize: 16, // Same as mutator capsule
                fill: 0xFFFFFF, // Pure white
                align: 'center',
                fontWeight: 'bold', // Bold text for better visibility
                // No stroke, no drop shadow - simple pure white text
            });

            // Create two-line text: "Click To" on top, "Explore" below (desktop only)
            const cctvClickTextTop = new Text({
                text: 'Click To',
                style: cctvCircleTextStyle,
            });
            cctvClickTextTop.anchor.set(0.5);
            cctvClickTextTop.x = 0;
            cctvClickTextTop.y = -8; // Position above center

            const cctvClickTextBottom = new Text({
                text: 'Explore',
                style: cctvCircleTextStyle,
            });
            cctvClickTextBottom.anchor.set(0.5);
            cctvClickTextBottom.x = 0;
            cctvClickTextBottom.y = 8; // Position below center

            cctvCircleText.addChild(cctvCircleBg);
            cctvCircleText.addChild(cctvClickTextTop);
            cctvCircleText.addChild(cctvClickTextBottom);
            cctvCircleText.visible = false; // Hidden by default, only shows when dot is hovered
            cctvCircleText.eventMode = 'none'; // Allow pointer events to pass through for global tracking
            cctvCircleText.cursor = 'default';

            // Add circle text to stage
            app.stage.addChild(cctvCircleText);

            // Create simple label text for mobile/tablet (just "X Account" - no "Click To")
            const cctvMobileLabelStyle = new TextStyle({
                fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK,
                fontSize: 18,
                fill: 0xFFFFFF,
                align: 'center',
                fontWeight: 'bold',
            });
            cctvLabelText = new Text({
                text: 'X Account',
                style: cctvMobileLabelStyle,
            });
            cctvLabelText.anchor.set(0.5);
            cctvLabelText.visible = false; // Hidden by default, only shown on mobile/tablet
            app.stage.addChild(cctvLabelText);

            // Track global mouse position for circle following
            let cctvLastMousePos = { x: 0, y: 0 };
            let cctvIsCircleActive = false;

            // Offset to position text at cursor tip (above and to the right of cursor)
            const CCTVCURSOR_TIP_OFFSET_X = 12; // Offset to the right
            const CCTVCURSOR_TIP_OFFSET_Y = -25; // Offset upward (above cursor tip)

            // Function to check if cursor is within dot's bounds
            const isCursorInCctvDotBounds = (cursorX, cursorY) => {
                if (!cctvDot || !cctvDot.parent || !cctvDot.userData) {
                    return false;
                }

                const dotX = cctvDot.x;
                const dotY = cctvDot.y;
                const baseRadius = cctvDot.userData.baseRadius || getResponsiveCctvDotRadius();
                const maxWaveExpansion = 12.5;
                const tolerance = baseRadius * 0.8;
                const maxDotRadius = baseRadius + maxWaveExpansion + tolerance;

                const dx = cursorX - dotX;
                const dy = cursorY - dotY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                return distance <= maxDotRadius;
            };

            // Function to show circle and activate effects (desktop only)
            const showCctvCircle = (cursorX, cursorY) => {
                // Don't show circle text on mobile/tablet - label text is always visible
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    return;
                }

                // Only show if not already active (prevent multiple triggers)
                if (cctvIsCircleActive) return;

                cctvDot.visible = false;
                cctvCircleText.visible = true;
                cctvIsCircleActive = true;

                // Show "X Account" text animation (slides up from below) - appears when cursor is pointed
                showCctvText();

                // Show stroke overlay (animated stroke frames around CCTV)
                if (cctvStrokeSprite) {
                    cctvStrokeSprite.visible = true;
                    cctvStrokeSprite.alpha = 1.0;
                    // Position and scale stroke to match CCTV
                    cctvStrokeSprite.x = cctvSprite.x;
                    cctvStrokeSprite.y = cctvSprite.y;
                    cctvStrokeSprite.scale.set(cctvSprite.scale.x, cctvSprite.scale.y);
                }

                // Position circle at cursor tip (offset so text appears above cursor, not covered by it)
                cctvCircleText.x = cursorX + CCTVCURSOR_TIP_OFFSET_X;
                cctvCircleText.y = cursorY + CCTVCURSOR_TIP_OFFSET_Y;
            };

            // Function to hide circle and show dot
            const hideCctvCircle = () => {
                // Only hide if currently active (prevent multiple triggers)
                if (!cctvIsCircleActive) return;

                cctvDot.visible = true;
                cctvCircleText.visible = false;
                cctvIsCircleActive = false;

                // Hide "X Account" text animation - vanishes when cursor is not pointed
                hideCctvText();

                // Hide stroke overlay
                if (cctvStrokeSprite) {
                    cctvStrokeSprite.visible = false;
                }
            };

            // Function to update circle and text based on cursor bounds
            const updateCctvCircleBasedOnBounds = (cursorX, cursorY) => {
                // Don't show circle text on mobile/tablet - label text is always visible
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    return; // Skip circle text logic on mobile/tablet
                }

                const inBounds = isCursorInCctvDotBounds(cursorX, cursorY);

                if (inBounds && !cctvIsCircleActive) {
                    // Cursor entered dot bounds - show circle and text
                    showCctvCircle(cursorX, cursorY);
                } else if (!inBounds && cctvIsCircleActive) {
                    // Cursor left dot bounds - hide circle and text immediately
                    hideCctvCircle();
                } else if (!inBounds && cctvTextSprite && cctvTextSprite.visible) {
                    // Extra safety check: if text is visible but cursor is out of bounds, hide it
                    hideCctvText();
                }

                // Let PixiJS handle cursor automatically via sprite.cursor properties
                // No manual cursor management needed
            };

            // Global mouse/touch tracking for circle following (like mutator capsule)
            // Handle mouse move (desktop)
            document.addEventListener('mousemove', (e) => {
                const rect = app.canvas.getBoundingClientRect();
                const scaleX = app.canvas.width / rect.width;
                const scaleY = app.canvas.height / rect.height;

                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;

                cctvLastMousePos.x = mouseX;
                cctvLastMousePos.y = mouseY;

                updateCctvCircleBasedOnBounds(mouseX, mouseY);

                // Update circle position if active
                if (cctvIsCircleActive) {
                    cctvCircleText.x = mouseX + CCTVCURSOR_TIP_OFFSET_X;
                    cctvCircleText.y = mouseY + CCTVCURSOR_TIP_OFFSET_Y;
                }
            });

            // Handle touch move (mobile) - important for responsive bounds checking
            document.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches.length > 0) {
                    const rect = app.canvas.getBoundingClientRect();
                    const scaleX = app.canvas.width / rect.width;
                    const scaleY = app.canvas.height / rect.height;

                    const touchX = (e.touches[0].clientX - rect.left) * scaleX;
                    const touchY = (e.touches[0].clientY - rect.top) * scaleY;

                    cctvLastMousePos.x = touchX;
                    cctvLastMousePos.y = touchY;

                    // Only update if not dragging (to avoid interference with panning)
                    if (!isDragging) {
                        updateCctvCircleBasedOnBounds(touchX, touchY);

                        // Update circle position if active
                        if (cctvIsCircleActive) {
                            cctvCircleText.x = touchX + CCTVCURSOR_TIP_OFFSET_X;
                            cctvCircleText.y = touchY + CCTVCURSOR_TIP_OFFSET_Y;
                        }
                    }
                }
            }, { passive: true });

            // Stage pointer move for better tracking within canvas
            app.stage.on('globalpointermove', (e) => {
                const globalPos = e.global;
                cctvLastMousePos.x = globalPos.x;
                cctvLastMousePos.y = globalPos.y;
                updateCctvCircleBasedOnBounds(globalPos.x, globalPos.y);
            });

            // Ticker to continuously check bounds and update circle/text
            app.ticker.add(() => {
                if (cctvDot && cctvDot.parent) {
                    // Update based on cursor bounds - this controls both circle and text visibility
                    updateCctvCircleBasedOnBounds(cctvLastMousePos.x, cctvLastMousePos.y);

                    // Update circle position if active
                    if (cctvIsCircleActive) {
                        cctvCircleText.x = cctvLastMousePos.x + CCTVCURSOR_TIP_OFFSET_X;
                        cctvCircleText.y = cctvLastMousePos.y + CCTVCURSOR_TIP_OFFSET_Y;
                    }

                    // Safety check: ensure text is hidden if circle is not active
                    if (!cctvIsCircleActive && cctvTextSprite && cctvTextSprite.visible) {
                        hideCctvText();
                    }
                }
            });

            // Touch/click handlers for mobile and desktop - similar to glitch sprite
            // Handle pointerdown for better mobile touch support
            cctvDot.on('pointerdown', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // On mobile/tablet, don't show circle - just prepare for click
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    event.stopPropagation(); // Prevent panning from starting
                    return;
                }
                // On desktop, treat as hover
                const globalPos = event.global;
                showCctvCircle(globalPos.x, globalPos.y);
                event.stopPropagation(); // Prevent panning from starting

            });

            // Handle pointerup to detect tap/click (works better on mobile)
            cctvDot.on('pointerup', (event) => {
                const globalPos = event.global;
                // On mobile/tablet, always redirect on tap
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {

                    window.open('https://x.com/ThePrometheans_', '_blank');
                    event.stopPropagation();
                    return;
                }
                // On desktop, only redirect if in bounds
                if (isCursorInCctvDotBounds(globalPos.x, globalPos.y)) {

                    window.open('https://x.com/ThePrometheans_', '_blank');
                }
                event.stopPropagation(); // Prevent panning
            });

            // Also handle pointertap as fallback
            cctvDot.on('pointertap', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // On mobile/tablet, always redirect
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {

                    window.open('https://x.com/ThePrometheans_', '_blank');
                    event.stopPropagation();
                    return;
                }
                // On desktop, redirect

                window.open('https://x.com/ThePrometheans_', '_blank');
                event.stopPropagation(); // Prevent panning
            });

            // Also allow clicking on circle text to redirect
            cctvCircleText.eventMode = 'static';
            cctvCircleText.cursor = 'pointer';

            cctvCircleText.on('pointerdown', (event) => {
                event.stopPropagation(); // Prevent panning
            });

            cctvCircleText.on('pointerup', (event) => {
                event.stopPropagation(); // Prevent panning
            });

            cctvCircleText.on('pointertap', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                window.open('https://x.com/ThePrometheans_', '_blank');
                event.stopPropagation(); // Prevent panning
            });

            // Hover handlers for CCTV dot
            // Note: Hover behavior is handled by updateCctvCircleBasedOnBounds() which continuously
            // monitors cursor position. Both "Click To Explore" circle and "X Account" text appear/disappear
            // together when cursor enters/leaves the dot bounds.

            // Update dot size on window resize
            window.addEventListener('resize', () => {
                updateCctvDotSize();
            });

        } catch (error) {
            // Error loading CCTV textures
        }

        // Load Discord animated frames (discord1.png to discord8.png - 8 frames total)
        try {

            // Load all 8 Discord frames in parallel for faster loading
            const discordUrls = Array.from({ length: 8 }, (_, i) => `/assets/discord${i + 1}.png`);
            const discordTextures = await loadAssetsInParallel(discordUrls);
            discordTextures.forEach((texture, i) => {

            });

            // Create AnimatedSprite from the Discord textures
            discordSprite = new AnimatedSprite(discordTextures);
            discordSprite.anchor.set(0.5);

            // Configure Discord animation settings
            discordSprite.animationSpeed = 0.1; // Speed of animation (0.1 = 10% of ticker speed)
            discordSprite.loop = true; // Loop the animation

            // Hide sprite initially until resizeBackground positions it correctly
            discordSprite.visible = false;
            discordSprite.alpha = 1.0;

            discordSprite.play(); // Start the animation

            // Note: Will be made visible in resizeBackground() and initialization section

            // Get Discord dimensions (use first frame as reference)
            const discordImageWidth = discordTextures[0].orig?.width || discordTextures[0].width || discordTextures[0].baseTexture.width;
            const discordImageHeight = discordTextures[0].orig?.height || discordTextures[0].height || discordTextures[0].baseTexture.height;

            // Discord positioning and sizing config
            // Position on bg1.png (in pixels):
            // Left X: 3959, Right X: 4204, Top Y: 1709, Bottom Y: 1866
            // Center X: (3959 + 4204) / 2 = 4081.5
            // Center Y: (1709 + 1866) / 2 = 1787.5
            // Dimensions: width: 246 pixels, height: 158 pixels (on bg1.png)
            const discordConfig = {
                // Discord dimensions (on bg1.png coordinate space)
                discordWidth: 246,
                discordHeight: 158,

                // Position on bg1.png (center of Discord)
                bg1X: 4081.5, // Center X position on bg1.png (calculated from left: 3959 + width/2 = 3959 + 123 = 4082, but using exact center: (3959+4204)/2 = 4081.5)
                bg1Y: 1787.5, // Center Y position on bg1.png (calculated from top: 1709 + height/2 = 1709 + 79 = 1788, but using exact center: (1709+1866)/2 = 1787.5)

                // Scale: calculated to make Discord fit its designated space on bg1.png
                scale: 1.0, // Will be calculated below

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make Discord image fit into designated space on bg1.png
            if (discordImageWidth && discordImageHeight && discordConfig.discordWidth && discordConfig.discordHeight) {
                const relativeScaleX = discordConfig.discordWidth / discordImageWidth;
                const relativeScaleY = discordConfig.discordHeight / discordImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                discordConfig.scale = Math.min(relativeScaleX, relativeScaleY);
            } else {
                // Fallback: use natural size
                discordConfig.scale = 1.0;
            }

            // Store config in userData for Discord sprite
            discordSprite.userData = discordSprite.userData || {};
            discordSprite.userData.config = discordConfig;

            // Make Discord sprite interactive (clickable)
            discordSprite.eventMode = 'static';
            discordSprite.cursor = 'pointer';

            // Store original animation speed for hover effect
            const originalAnimationSpeed = discordSprite.animationSpeed;
            const glitchAnimationSpeed = 0.5; // Fast glitch speed on hover (5x faster)

            // Load glitch sound effect
            discordGlitchSound = new Audio('/assets/sounds/glitch1.mp3');
            discordGlitchSound.volume = 0.6; // Set volume (60%)
            discordGlitchSound.preload = 'auto';
            discordGlitchSound.loop = true; // Loop continuously while hovering
            // Start unmuted - will sync after user interaction
            discordGlitchSound.muted = false;
            
            // Handle audio errors
            discordGlitchSound.addEventListener('error', (e) => {
                // Could not load glitch sound
            });

            // CRITICAL: Add pointerdown listener FIRST to unlock audio before pointerenter fires
            discordSprite.on('pointerdown', () => {

                enableAudioOnSpriteInteraction(discordGlitchSound);
            });

            // Hover effect - speed up animation (glitch effect) and play sound
            discordSprite.on('pointerenter', () => {
                enableAudioOnSpriteInteraction(discordGlitchSound); // Enable audio on sprite interaction

                discordSprite.animationSpeed = glitchAnimationSpeed;
                
                // Play glitch sound effect
                // Sound will loop continuously while hovering
                if (discordGlitchSound) {
                    // Only reset if not already playing to avoid interrupting the loop
                    if (discordGlitchSound.paused) {
                        playSpriteSound(discordGlitchSound);
                    } else {
                        // Already playing, just ensure it's not muted
                        discordGlitchSound.muted = globalSpriteAudioMuted;
                    }
                }
            });

            // Leave hover - return to normal speed and stop glitch sound
            discordSprite.on('pointerleave', () => {

                discordSprite.animationSpeed = originalAnimationSpeed;
                
                // Stop glitch sound immediately
                if (discordGlitchSound) {
                    discordGlitchSound.pause();
                    discordGlitchSound.currentTime = 0; // Reset to start for next play
                }
            });

            // Click handler - redirect to Discord invite in new tab
            discordSprite.on('pointertap', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                // Open in new tab without showing loading screen (loading screen is only for same-page redirects)
                window.open('https://discord.com/invite/theprometheans', '_blank');
            });
            
            // Also handle pointerdown for better mobile touch support
            discordSprite.on('pointerdown', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
            });

            app.stage.addChild(discordSprite);

            // Position immediately using resizeBackground to ensure correct positioning
            // This ensures Discord is positioned correctly BEFORE the loading screen ends
            if (backgroundSprite && imageWidth && imageHeight) {
                // Call resizeBackground to position all sprites correctly
                // This will position Discord at the correct coordinates
                resizeBackground();

                // Make visible immediately after positioning
                discordSprite.visible = true;

            } else {
                // If background not ready yet, make invisible until resizeBackground is called
                discordSprite.visible = false;

            }

        } catch (error) {
            // Error loading Discord
        }

        // Load Promo animated frames (promo1.png to promo10.png - 10 frames total)
        try {

            // Load all 10 Promo frames in parallel for faster loading
            const promoUrls = Array.from({ length: 10 }, (_, i) => `/assets/promo${i + 1}.png`);
            const promoTextures = await loadAssetsInParallel(promoUrls);
            promoTextures.forEach((texture, i) => {

            });

            // Create AnimatedSprite from the Promo textures
            promoSprite = new AnimatedSprite(promoTextures);
            promoSprite.anchor.set(0.5);

            // Configure Promo animation settings
            promoSprite.animationSpeed = 0.1; // Speed of animation (0.1 = 10% of ticker speed)
            promoSprite.loop = true; // Loop the animation

            // Hide sprite initially until resizeBackground positions it correctly
            // Will be made visible by resizeBackground() when positioned
            promoSprite.visible = false;
            promoSprite.alpha = 1.0;

            promoSprite.play(); // Start the animation

            // Note: Will be positioned and made visible in resizeBackground() and final initialization section

            // Get Promo dimensions (use first frame as reference)
            const promoImageWidth = promoTextures[0].orig?.width || promoTextures[0].width || promoTextures[0].baseTexture.width;
            const promoImageHeight = promoTextures[0].orig?.height || promoTextures[0].height || promoTextures[0].baseTexture.height;

            // Promo positioning and sizing config
            // Position on bg1.png (in pixels):
            // Left X: 3940, Right X: 4165, Top Y: 1466, Bottom Y: 1643
            // Center X: (3940 + 4165) / 2 = 4052.5
            // Center Y: (1466 + 1643) / 2 = 1554.5
            // Dimensions: width: 223 pixels, height: 178 pixels (on bg1.png)
            const promoConfig = {
                // Promo dimensions (on bg1.png coordinate space)
                promoWidth: 223,
                promoHeight: 178,

                // Position on bg1.png (center of Promo)
                bg1X: 4052.5, // Center X position on bg1.png
                bg1Y: 1554.5, // Center Y position on bg1.png

                // Scale: calculated to make Promo fit its designated space on bg1.png
                scale: 1.0, // Will be calculated below

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make Promo image fit into designated space on bg1.png
            if (promoImageWidth && promoImageHeight && promoConfig.promoWidth && promoConfig.promoHeight) {
                const relativeScaleX = promoConfig.promoWidth / promoImageWidth;
                const relativeScaleY = promoConfig.promoHeight / promoImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                promoConfig.scale = Math.min(relativeScaleX, relativeScaleY);
            } else {
                // Fallback: use natural size
                promoConfig.scale = 1.0;
            }

            // Store config in userData for Promo sprite
            promoSprite.userData = promoSprite.userData || {};
            promoSprite.userData.config = promoConfig;

            // Make Promo sprite interactive (clickable)
            promoSprite.eventMode = 'static';
            promoSprite.cursor = 'pointer';

            // Store original animation speed for hover effect
            const originalAnimationSpeed = promoSprite.animationSpeed;
            const glitchAnimationSpeed = 0.5; // Fast glitch speed on hover (5x faster)

            // Load glitch sound effect
            promoGlitchSound = new Audio('/assets/sounds/glitch1.mp3');
            promoGlitchSound.volume = 0.6; // Set volume (60%)
            promoGlitchSound.preload = 'auto';
            promoGlitchSound.loop = true; // Loop continuously while hovering
            // Start unmuted - will sync after user interaction
            promoGlitchSound.muted = false;
            
            // Handle audio errors
            promoGlitchSound.addEventListener('error', (e) => {
                // Could not load promo glitch sound
            });

            // Hover effect - speed up animation (glitch effect) and play sound
            promoSprite.on('pointerenter', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                promoSprite.animationSpeed = glitchAnimationSpeed;
                
                // Play glitch sound effect
                // Sound will loop continuously while hovering
                if (promoGlitchSound) {
                    // Only reset if not already playing to avoid interrupting the loop
                    if (promoGlitchSound.paused) {
                        playSpriteSound(promoGlitchSound);
                    } else {
                        // Already playing, just ensure it's not muted
                        promoGlitchSound.muted = globalSpriteAudioMuted;
                    }
                }
            });

            // Leave hover - return to normal speed and stop glitch sound
            promoSprite.on('pointerleave', () => {

                promoSprite.animationSpeed = originalAnimationSpeed;
                
                // Stop glitch sound immediately
                if (promoGlitchSound) {
                    promoGlitchSound.pause();
                    promoGlitchSound.currentTime = 0; // Reset to start for next play
                }
            });

            // Also handle tap/click for mobile devices
            promoSprite.on('pointertap', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
            });
            
            promoSprite.on('pointerdown', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
            });

            app.stage.addChild(promoSprite);

            // Position immediately using resizeBackground to ensure correct positioning
            // This ensures Promo is positioned correctly BEFORE the loading screen ends
            // Same behavior as Discord - resizeBackground will position and make visible
            if (backgroundSprite && imageWidth && imageHeight) {
                // Call resizeBackground to position all sprites correctly
                // This will position Promo at the correct coordinates and make it visible
                resizeBackground();

            } else {
                // If background not ready yet, make invisible until resizeBackground is called
                promoSprite.visible = false;

            }

        } catch (error) {
            // Error loading Promo
        }

        // Load Telegram animated frames (telegram1.png to telegram9.png - 9 frames total)
        try {

            // Load all 9 Telegram frames in parallel for faster loading
            const telegramUrls = Array.from({ length: 9 }, (_, i) => `/assets/telegram${i + 1}.png`);
            const telegramTextures = await loadAssetsInParallel(telegramUrls);
            telegramTextures.forEach((texture, i) => {

            });

            // Create AnimatedSprite from the Telegram textures
            telegramSprite = new AnimatedSprite(telegramTextures);
            telegramSprite.anchor.set(0.5);

            // Configure Telegram animation settings
            telegramSprite.animationSpeed = 0.1; // Speed of animation (0.1 = 10% of ticker speed)
            telegramSprite.loop = true; // Loop the animation

            // Hide sprite initially until resizeBackground positions it correctly
            // Will be made visible by resizeBackground() when positioned
            telegramSprite.visible = false;
            telegramSprite.alpha = 1.0;

            telegramSprite.play(); // Start the animation

            // Note: Will be positioned and made visible in resizeBackground() and final initialization section

            // Get Telegram dimensions (use first frame as reference)
            const telegramImageWidth = telegramTextures[0].orig?.width || telegramTextures[0].width || telegramTextures[0].baseTexture.width;
            const telegramImageHeight = telegramTextures[0].orig?.height || telegramTextures[0].height || telegramTextures[0].baseTexture.height;

            // Telegram positioning and sizing config
            // Position on bg1.png (in pixels):
            // Left X: 3498, Right X: 3797, Top Y: 1712, Bottom Y: 1955
            // Center X: (3498 + 3797) / 2 = 3647.5
            // Center Y: (1712 + 1955) / 2 = 1833.5
            // Dimensions: width: 300 pixels, height: 244 pixels (on bg1.png)
            const telegramConfig = {
                // Telegram dimensions (on bg1.png coordinate space)
                telegramWidth: 300,
                telegramHeight: 244,

                // Position on bg1.png (center of Telegram)
                bg1X: 3647.5, // Center X position on bg1.png
                bg1Y: 1833.5, // Center Y position on bg1.png

                // Scale: calculated to make Telegram fit its designated space on bg1.png
                scale: 1.0, // Will be calculated below

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make Telegram image fit into designated space on bg1.png
            if (telegramImageWidth && telegramImageHeight && telegramConfig.telegramWidth && telegramConfig.telegramHeight) {
                const relativeScaleX = telegramConfig.telegramWidth / telegramImageWidth;
                const relativeScaleY = telegramConfig.telegramHeight / telegramImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                telegramConfig.scale = Math.min(relativeScaleX, relativeScaleY);
            } else {
                // Fallback: use natural size
                telegramConfig.scale = 1.0;
            }

            // Store config in userData for Telegram sprite
            telegramSprite.userData = telegramSprite.userData || {};
            telegramSprite.userData.config = telegramConfig;

            // Make Telegram sprite interactive (clickable)
            telegramSprite.eventMode = 'static';
            telegramSprite.cursor = 'pointer';

            // Store original animation speed for hover effect
            const originalAnimationSpeed = telegramSprite.animationSpeed;
            const glitchAnimationSpeed = 0.5; // Fast glitch speed on hover (5x faster)

            // Load glitch sound effect
            telegramGlitchSound = new Audio('/assets/sounds/glitch1.mp3');
            telegramGlitchSound.volume = 0.6; // Set volume (60%)
            telegramGlitchSound.preload = 'auto';
            telegramGlitchSound.loop = true; // Loop continuously while hovering
            // Start unmuted - will sync after user interaction
            telegramGlitchSound.muted = false;
            
            // Handle audio errors
            telegramGlitchSound.addEventListener('error', (e) => {
                // Could not load telegram glitch sound
            });

            // Hover effect - speed up animation (glitch effect) and play sound
            telegramSprite.on('pointerenter', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                telegramSprite.animationSpeed = glitchAnimationSpeed;
                
                // Play glitch sound effect
                // Sound will loop continuously while hovering
                if (telegramGlitchSound) {
                    // Only reset if not already playing to avoid interrupting the loop
                    if (telegramGlitchSound.paused) {
                        playSpriteSound(telegramGlitchSound);
                    } else {
                        // Already playing, just ensure it's not muted
                        telegramGlitchSound.muted = globalSpriteAudioMuted;
                    }
                }
            });

            // Leave hover - return to normal speed and stop glitch sound
            telegramSprite.on('pointerleave', () => {

                telegramSprite.animationSpeed = originalAnimationSpeed;
                
                // Stop glitch sound immediately
                if (telegramGlitchSound) {
                    telegramGlitchSound.pause();
                    telegramGlitchSound.currentTime = 0; // Reset to start for next play
                }
            });

            // Also handle tap/click for mobile devices
            telegramSprite.on('pointertap', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
            });
            
            telegramSprite.on('pointerdown', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
            });

            // Click handler - redirect to Telegram in new tab
            telegramSprite.on('pointertap', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                // Open in new tab without showing loading screen (loading screen is only for same-page redirects)
                window.open('https://t.me/+F0B_cOIRwgkzZGJk', '_blank');
            });

            app.stage.addChild(telegramSprite);

            // Position immediately using resizeBackground to ensure correct positioning
            // This ensures Telegram is positioned correctly BEFORE the loading screen ends
            // Same behavior as Discord and Promo - resizeBackground will position and make visible
            if (backgroundSprite && imageWidth && imageHeight) {
                // Call resizeBackground to position all sprites correctly
                // This will position Telegram at the correct coordinates
                resizeBackground();

                // Make visible immediately after positioning
                telegramSprite.visible = true;

            } else {
                // If background not ready yet, make invisible until resizeBackground is called
                telegramSprite.visible = false;

            }

        } catch (error) {
            // Error loading Telegram
        }

        // Load Blaised static sprite (blaised1.png only)
        try {

            // Load only blaised1.png using loadAssetsInParallel to track progress
            const blaisedTextures = await loadAssetsInParallel(['/assets/blaised1.png']);
            if (!blaisedTextures || blaisedTextures.length === 0 || !blaisedTextures[0]) {
                throw new Error('Failed to load blaised1.png');
            }
            const blaisedTexture = blaisedTextures[0];

            // Create Sprite from the Blaised texture
            blaisedSprite = new Sprite(blaisedTexture);
            blaisedSprite.anchor.set(0.5);

            // Hide sprite initially until resizeBackground positions it correctly
            blaisedSprite.visible = false;
            blaisedSprite.alpha = 1.0;

            // Get Blaised dimensions
            const blaisedImageWidth = blaisedTexture.orig?.width || blaisedTexture.width || blaisedTexture.baseTexture.width;
            const blaisedImageHeight = blaisedTexture.orig?.height || blaisedTexture.height || blaisedTexture.baseTexture.height;

            // Blaised positioning and sizing config
            // Position on bg1.png (in pixels):
            // Left X: 4001, Right X: 4504, Top Y: 2223, Bottom Y: 2946
            // Center X: (4001 + 4504) / 2 = 4252.5
            // Center Y: (2223 + 2946) / 2 = 2584.5
            // Dimensions: width: 504 pixels, height: 724 pixels (on bg1.png)
            const blaisedConfig = {
                // Blaised dimensions (on bg1.png coordinate space)
                blaisedWidth: 504,
                blaisedHeight: 724,

                // Position on bg1.png (center of Blaised)
                bg1X: 4252.5, // Center X position on bg1.png
                bg1Y: 2584.5, // Center Y position on bg1.png

                // Scale: calculated to make Blaised fit its designated space on bg1.png
                scale: 1.0, // Will be calculated below

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make Blaised image fit into designated space on bg1.png
            if (blaisedImageWidth && blaisedImageHeight && blaisedConfig.blaisedWidth && blaisedConfig.blaisedHeight) {
                const relativeScaleX = blaisedConfig.blaisedWidth / blaisedImageWidth;
                const relativeScaleY = blaisedConfig.blaisedHeight / blaisedImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                blaisedConfig.scale = Math.min(relativeScaleX, relativeScaleY);
            } else {
                // Fallback: use natural size
                blaisedConfig.scale = 1.0;
            }

            // Store config in userData for Blaised sprite
            blaisedSprite.userData = blaisedSprite.userData || {};
            blaisedSprite.userData.config = blaisedConfig;

            // Make blaised sprite interactive for hover/click detection
            blaisedSprite.eventMode = 'static';
            blaisedSprite.cursor = 'pointer';

            // Add to stage
            app.stage.addChild(blaisedSprite);

            // Create comic bubble container for blaised sprite
            blaisedBubbleContainer = new Container();
            blaisedBubbleContainer.visible = false;
            blaisedBubbleContainer.alpha = 0;
            blaisedBubbleContainer.eventMode = 'none'; // Don't block interactions - bubble is visual only

            // Add bubble to main app stage (will be rendered on top)
            app.stage.addChild(blaisedBubbleContainer);

            // Function to get responsive font size
            const getResponsiveFontSize = () => {
                const screenWidth = window.innerWidth;
                if (screenWidth <= 480) return 12; // Smaller for mobile
                if (screenWidth <= 768) return 14; // Medium for tablet
                return 18; // Desktop
            };

            // Function to get responsive padding
            const getResponsivePadding = () => {
                const screenWidth = window.innerWidth;
                if (screenWidth <= 480) return 10; // Smaller padding for mobile
                if (screenWidth <= 768) return 12;
                return 15; // Desktop
            };

            // Function to get responsive word wrap width
            const getResponsiveWordWrapWidth = () => {
                const screenWidth = window.innerWidth;
                if (screenWidth <= 480) return 120; // Narrower for mobile
                if (screenWidth <= 768) return 150;
                return 200; // Desktop
            };

            // Store references to bubble elements for typing animation
            let bubbleTextSprite = null;
            let bubbleGraphics = null;
            let typingAnimationTicker = null;
            let typingAnimationTimeout = null;
            let dotsIntervalId = null;

            // Function to create/update bubble (responsive)
            const createBubble = () => {
                // Clear existing children
                blaisedBubbleContainer.removeChildren();

                // Stop any existing typing animation
                if (typingAnimationTicker) {
                    app.ticker.remove(typingAnimationTicker);
                    typingAnimationTicker = null;
                }
                if (typingAnimationTimeout) {
                    clearTimeout(typingAnimationTimeout);
                    typingAnimationTimeout = null;
                }
                if (dotsIntervalId) {
                    clearInterval(dotsIntervalId);
                    dotsIntervalId = null;
                }

                const bubblePadding = getResponsivePadding();
                const fullBubbleText = "Hey, I'm Blaise.\nBurn me!"; // Added line break
                const fontSize = getResponsiveFontSize();
                const wordWrapWidth = getResponsiveWordWrapWidth();
                
                const bubbleTextStyle = new TextStyle({
                    fontFamily: 'Arial, sans-serif',
                    fontSize: fontSize,
                    fill: '#000000',
                    fontWeight: 'bold',
                    wordWrap: true,
                    wordWrapWidth: wordWrapWidth,
                    align: 'center',
                    lineHeight: fontSize * 1.2 // Better line spacing for multi-line text
                });
                
                // Create text sprite with empty text initially (will be set by typing animation)
                bubbleTextSprite = new Text({
                    text: "",
                    style: bubbleTextStyle
                });
                bubbleTextSprite.anchor.set(0.5);

                // Measure text with full message to size bubble (with responsive min width)
                const tempTextSprite = new Text({
                    text: fullBubbleText,
                    style: bubbleTextStyle
                });
                const screenWidth = window.innerWidth;
                const minBubbleWidth = screenWidth <= 480 ? 140 : (screenWidth <= 768 ? 160 : 180);
                const bubbleWidth = Math.max(tempTextSprite.width + bubblePadding * 2, minBubbleWidth);
                const bubbleHeight = tempTextSprite.height + bubblePadding * 2;

                // Store dimensions for positioning
                blaisedBubbleContainer.userData = blaisedBubbleContainer.userData || {};
                blaisedBubbleContainer.userData.bubbleWidth = bubbleWidth;
                blaisedBubbleContainer.userData.bubbleHeight = bubbleHeight;
                blaisedBubbleContainer.userData.fullBubbleText = fullBubbleText;

                // Create bubble background with Graphics
                bubbleGraphics = new Graphics();
                
                // Responsive border radius and stroke width
                const borderRadius = screenWidth <= 480 ? 8 : (screenWidth <= 768 ? 10 : 12);
                const strokeWidth = screenWidth <= 480 ? 2 : 3;
                
                // Draw comic bubble shape (rounded rectangle with tail)
                bubbleGraphics.roundRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, borderRadius);
                bubbleGraphics.fill(0xFFFFFF);
                bubbleGraphics.stroke({ width: strokeWidth, color: 0x000000 });

                // Add tail pointing down-left (comic bubble style, pointing to character)
                // Responsive tail size
                const tailSize = screenWidth <= 480 ? 8 : (screenWidth <= 768 ? 10 : 12);
                const tailX = -bubbleWidth / 2 + (screenWidth <= 480 ? 20 : 30); // Position tail on left side, pointing down
                const tailY = bubbleHeight / 2;
                bubbleGraphics.moveTo(tailX, tailY);
                bubbleGraphics.lineTo(tailX - tailSize, tailY + tailSize);
                bubbleGraphics.lineTo(tailX + tailSize / 2, tailY + tailSize / 2);
                bubbleGraphics.closePath();
                bubbleGraphics.fill(0xFFFFFF);
                bubbleGraphics.stroke({ width: strokeWidth, color: 0x000000 });

                // Add bubble and text to container
                blaisedBubbleContainer.addChild(bubbleGraphics);
                blaisedBubbleContainer.addChild(bubbleTextSprite);
            };

            // Create initial bubble
            createBubble();

            // Update bubble on resize for responsiveness
            window.addEventListener('resize', () => {
                if (blaisedBubbleContainer && blaisedBubbleContainer.visible) {
                    createBubble();
                    // Reposition if visible
                    updateBubblePosition();
                }
            });

            // Bubble is already added to blaisedBubbleApp.stage above

            // Bubble state management
            let bubbleHideTimer = null;
            let isBubbleShowing = false;

            // Function to update bubble position (right side of sprite, responsive)
            const updateBubblePosition = (targetSprite = null) => {
                if (!blaisedBubbleContainer) return;
                
                // Use provided sprite, or default to blaisedSprite, or try aura sprite
                const sprite = targetSprite || blaisedSprite || blaisedAuraSprite;
                if (!sprite) return;
                
                const screenWidth = window.innerWidth;
                // Since sprite anchor is at (0.5, 0.5), sprite.x/y is the center
                // Calculate right edge and top edge of sprite using local coordinates
                // Both sprite and bubble are on app.stage, so local coordinates are in the same space
                const spriteRight = sprite.x + (sprite.width * sprite.scale.x) / 2;
                const spriteTop = sprite.y - (sprite.height * sprite.scale.y) / 2;
                
                const bubbleWidth = blaisedBubbleContainer.userData?.bubbleWidth || 200;
                const bubbleHeight = blaisedBubbleContainer.userData?.bubbleHeight || 80;
                
                // Responsive offset based on screen size
                const horizontalOffset = screenWidth <= 480 ? 10 : (screenWidth <= 768 ? 15 : 20);
                const verticalOffset = screenWidth <= 480 ? 10 : (screenWidth <= 768 ? 15 : 20);
                
                // Position on right side, top of sprite
                // Always maintain relative position to sprite
                let bubbleX = spriteRight + bubbleWidth / 2 + horizontalOffset;
                let bubbleY = spriteTop - bubbleHeight / 2 - verticalOffset;
                
                // Ensure bubble doesn't go off-screen at the top (vertical constraint only)
                const minY = bubbleHeight / 2 + 10; // 10px margin from top
                if (bubbleY < minY) {
                    bubbleY = minY;
                }
                
                // Set bubble position directly - always relative to sprite position
                blaisedBubbleContainer.x = bubbleX;
                blaisedBubbleContainer.y = bubbleY;
            };

            // Ticker to update bubble position when sprite moves (responsive)
            app.ticker.add(() => {
                if (blaisedBubbleContainer && blaisedBubbleContainer.visible) {
                    // Use whichever sprite is available
                    const sprite = blaisedSprite || blaisedAuraSprite;
                    if (sprite) {
                        updateBubblePosition(sprite);
                    }
                }
            });

            // Function to animate typing effect (using time-based animation for better mobile performance)
            const startTypingAnimation = () => {
                if (!bubbleTextSprite || !blaisedBubbleContainer.userData) return;

                // Stop any existing typing animation
                if (typingAnimationTicker) {
                    app.ticker.remove(typingAnimationTicker);
                    typingAnimationTicker = null;
                }
                if (typingAnimationTimeout) {
                    clearTimeout(typingAnimationTimeout);
                    typingAnimationTimeout = null;
                }
                if (dotsIntervalId) {
                    clearInterval(dotsIntervalId);
                    dotsIntervalId = null;
                }

                const fullText = blaisedBubbleContainer.userData.fullBubbleText || "Hey, I'm Blaise.\nBurn me!";
                let currentIndex = 0;
                let dotCount = 0;
                
                // Clear any existing interval
                if (dotsIntervalId) {
                    clearInterval(dotsIntervalId);
                    dotsIntervalId = null;
                }

                // Use time-based animation for better mobile performance
                const isMobile = typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet();
                const dotsInterval = 300; // 300ms between dot changes
                const dotsTotalDuration = 1000; // Show dots for 1 second
                const clearDuration = 200; // Clear dots after 200ms
                const typingDelay = isMobile ? 50 : 30; // 30-50ms between characters (smoother on mobile)

                // Animate dots
                const animateDots = () => {
                    if (!bubbleTextSprite) {
                        if (dotsIntervalId) clearInterval(dotsIntervalId);
                        return;
                    }
                    
                    dotCount = (dotCount + 1) % 4; // Cycle through 0, 1, 2, 3
                    bubbleTextSprite.text = ".".repeat(dotCount);
                };

                // Start dots animation
                dotsIntervalId = setInterval(animateDots, dotsInterval);
                
                // After dots duration, clear and start typing
                typingAnimationTimeout = setTimeout(() => {
                    if (dotsIntervalId) {
                        clearInterval(dotsIntervalId);
                        dotsIntervalId = null;
                    }
                    
                    if (!bubbleTextSprite) return;
                    
                    // Clear dots
                    bubbleTextSprite.text = "";
                    
                    // Wait a bit then start typing
                    typingAnimationTimeout = setTimeout(() => {
                        animateTyping();
                    }, clearDuration);
                }, dotsTotalDuration);

                // Typing animation
                const animateTyping = () => {
                    if (!bubbleTextSprite || currentIndex >= fullText.length) {
                        // Typing complete - hide bubble after a brief moment
                        if (typingAnimationTimeout) {
                            clearTimeout(typingAnimationTimeout);
                            typingAnimationTimeout = null;
                        }
                        // Wait a moment to let user read, then hide
                        setTimeout(() => {
                            hideBubble();
                        }, 1000); // Show completed text for 1 second before hiding
                        return;
                    }

                    const currentText = fullText.substring(0, currentIndex + 1);
                    bubbleTextSprite.text = currentText;
                    currentIndex++;

                    typingAnimationTimeout = setTimeout(animateTyping, typingDelay);
                };
            };

            // Function to show bubble (works with either sprite)
            const showBubble = (targetSprite = null) => {
                if (!blaisedBubbleContainer) return;
                
                // Prevent triggering if bubble is already showing or animating
                if (isBubbleShowing || blaisedBubbleContainer.visible) {
                    return;
                }
                
                // Use provided sprite, or default to blaisedSprite, or try aura sprite
                const sprite = targetSprite || blaisedSprite || blaisedAuraSprite;
                if (!sprite) return;
                
                // Clear any existing hide timer
                if (bubbleHideTimer) {
                    clearTimeout(bubbleHideTimer);
                    bubbleHideTimer = null;
                }

                // Stop any existing typing animation (safety check)
                if (typingAnimationTicker) {
                    app.ticker.remove(typingAnimationTicker);
                    typingAnimationTicker = null;
                }
                if (typingAnimationTimeout) {
                    clearTimeout(typingAnimationTimeout);
                    typingAnimationTimeout = null;
                }
                if (dotsIntervalId) {
                    clearInterval(dotsIntervalId);
                    dotsIntervalId = null;
                }

                // Reset text to empty for typing animation
                if (bubbleTextSprite) {
                    bubbleTextSprite.text = "";
                }

                // Update position with the target sprite
                updateBubblePosition(sprite);

                // Show instantly (no fade in)
                blaisedBubbleContainer.visible = true;
                blaisedBubbleContainer.alpha = 1;
                isBubbleShowing = true;

                // Start typing animation (will auto-hide when complete)
                startTypingAnimation();
            };

            // Function to hide bubble (instant hide)
            const hideBubble = () => {
                if (!blaisedBubbleContainer) return;
                
                // Clear timer
                if (bubbleHideTimer) {
                    clearTimeout(bubbleHideTimer);
                    bubbleHideTimer = null;
                }

                // Stop typing animation
                if (typingAnimationTicker) {
                    app.ticker.remove(typingAnimationTicker);
                    typingAnimationTicker = null;
                }
                if (typingAnimationTimeout) {
                    clearTimeout(typingAnimationTimeout);
                    typingAnimationTimeout = null;
                }
                if (dotsIntervalId) {
                    clearInterval(dotsIntervalId);
                    dotsIntervalId = null;
                }

                // Hide instantly (no fade out)
                blaisedBubbleContainer.visible = false;
                blaisedBubbleContainer.alpha = 0;
                isBubbleShowing = false;
            };

            // Check if mobile/tablet
            const isMobile = typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet();

            // Add hover handlers (desktop) or click handlers (mobile) for blaised sprite
            if (isMobile) {
                // Mobile: click to show bubble
                blaisedSprite.on('pointertap', () => {
                    enableAudioOnSpriteInteraction();
                    showBubble(blaisedSprite);
                });
                blaisedSprite.on('pointerdown', () => {
                    enableAudioOnSpriteInteraction();
                    showBubble(blaisedSprite);
                });
            } else {
                // Desktop: hover to show bubble
                blaisedSprite.on('pointerenter', () => {
                    enableAudioOnSpriteInteraction();
                    showBubble(blaisedSprite);
                });
            }

            // Store showBubble and updateBubblePosition functions for use with aura sprite
            window.blaisedShowBubble = showBubble;
            window.blaisedUpdateBubblePosition = updateBubblePosition;

            // Position immediately using resizeBackground to ensure correct positioning
            // This ensures Blaised is positioned correctly BEFORE the loading screen ends
            if (backgroundSprite && imageWidth && imageHeight) {
                // Call resizeBackground to position all sprites correctly
                // This will position Blaised at the correct coordinates
                resizeBackground();

                // Make visible immediately after positioning
                blaisedSprite.visible = true;

            } else {
                // If background not ready yet, make invisible until resizeBackground is called
                blaisedSprite.visible = false;

            }

        } catch (error) {
            // Error loading Blaised
        }

        // Load Blaised Aura animated frames (blaised1_aura.png to blaised6_aura.png - 6 frames total)
        // Using separate canvas with CSS mix-blend-mode for color dodge effect
        try {

            // Load all 6 Blaised Aura frames in parallel for faster loading
            const blaisedAuraUrls = Array.from({ length: 6 }, (_, i) => `/assets/blaised${i + 1}_aura.png`);
            const blaisedAuraTextures = await loadAssetsInParallel(blaisedAuraUrls);
            blaisedAuraTextures.forEach((texture, i) => {

            });

            // Create a separate PIXI application for the aura sprite layer to use CSS blend modes
            blaisedAuraApp = new Application();
            await blaisedAuraApp.init({
                background: 0x000000,
                backgroundAlpha: 0,
                resizeTo: window,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                antialias: true
            });

            // Ensure ticker continues even when tab is hidden
            blaisedAuraApp.ticker.stopOnMinimize = false;

            // Create AnimatedSprite from the Blaised Aura textures
            blaisedAuraSprite = new AnimatedSprite(blaisedAuraTextures);
            blaisedAuraSprite.anchor.set(0.5);

            // Configure Blaised Aura animation settings (same as blaised sprite)
            blaisedAuraSprite.animationSpeed = BLAISED_ANIMATION_SPEED; // Speed of animation (same as blaised sprite)
            blaisedAuraSprite.loop = true; // Loop the animation

            // Hide sprite initially until resizeBackground positions it correctly
            blaisedAuraSprite.visible = false;
            blaisedAuraSprite.alpha = 1.0;

            blaisedAuraSprite.play(); // Start the animation

            // Add sprite to the separate app
            blaisedAuraApp.stage.addChild(blaisedAuraSprite);

            // Get the sprite canvas and apply CSS blend mode
            const auraCanvas = blaisedAuraApp.canvas;
            auraCanvas.style.position = 'absolute';
            auraCanvas.style.top = '0';
            auraCanvas.style.left = '0';
            auraCanvas.style.mixBlendMode = 'color-dodge';
            auraCanvas.style.pointerEvents = 'none'; // Don't block scrolling - hover detection handled via main app
            auraCanvas.style.zIndex = '1'; // Ensure it's above the main canvas

            // Add aura canvas to the container (same container as main app)
            const container = document.getElementById('canvas-container');
            if (container) {
                container.appendChild(auraCanvas);

            }

            // Get Blaised Aura dimensions (use first frame as reference)
            const blaisedAuraImageWidth = blaisedAuraTextures[0].orig?.width || blaisedAuraTextures[0].width || blaisedAuraTextures[0].baseTexture.width;
            const blaisedAuraImageHeight = blaisedAuraTextures[0].orig?.height || blaisedAuraTextures[0].height || blaisedAuraTextures[0].baseTexture.height;

            // Blaised Aura positioning and sizing config (same as blaised sprite)
            // Position on bg1.png (in pixels):
            // Left X: 4001, Right X: 4504, Top Y: 2223, Bottom Y: 2946
            // Center X: (4001 + 4504) / 2 = 4252.5
            // Center Y: (2223 + 2946) / 2 = 2584.5
            // Dimensions: width: 504 pixels, height: 724 pixels (on bg1.png)
            const blaisedAuraConfig = {
                // Blaised Aura dimensions (on bg1.png coordinate space)
                blaisedAuraWidth: 504,
                blaisedAuraHeight: 724,

                // Position on bg1.png (center of Blaised Aura) - same as blaised sprite
                bg1X: 4252.5, // Center X position on bg1.png
                bg1Y: 2584.5, // Center Y position on bg1.png

                // Scale: calculated to make Blaised Aura fit its designated space on bg1.png
                scale: 1.0, // Will be calculated below

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make Blaised Aura image fit into designated space on bg1.png
            if (blaisedAuraImageWidth && blaisedAuraImageHeight && blaisedAuraConfig.blaisedAuraWidth && blaisedAuraConfig.blaisedAuraHeight) {
                const relativeScaleX = blaisedAuraConfig.blaisedAuraWidth / blaisedAuraImageWidth;
                const relativeScaleY = blaisedAuraConfig.blaisedAuraHeight / blaisedAuraImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                blaisedAuraConfig.scale = Math.min(relativeScaleX, relativeScaleY);
            } else {
                // Fallback: use natural size
                blaisedAuraConfig.scale = 1.0;
            }

            // Store config in userData for Blaised Aura sprite
            blaisedAuraSprite.userData = blaisedAuraSprite.userData || {};
            blaisedAuraSprite.userData.config = blaisedAuraConfig;

            // Since aura canvas has pointerEvents: 'none', we need to detect hover through the main app
            // Create a helper function to check if pointer is over aura sprite
            const checkAuraSpriteHover = (clientX, clientY) => {
                if (!blaisedAuraSprite || !blaisedAuraSprite.visible) return false;
                
                // Convert screen coordinates to PIXI world coordinates
                // Since aura sprite is in a separate app, we need to use its app's renderer
                const auraRenderer = blaisedAuraApp.renderer;
                const rect = auraRenderer.canvas.getBoundingClientRect();
                
                // Convert screen coordinates to canvas coordinates
                const canvasX = (clientX - rect.left) * (auraRenderer.width / rect.width);
                const canvasY = (clientY - rect.top) * (auraRenderer.height / rect.height);
                
                // Get aura sprite bounds in world coordinates
                const auraBounds = blaisedAuraSprite.getBounds();
                
                // Check if pointer is within sprite bounds
                return canvasX >= auraBounds.x && 
                       canvasX <= auraBounds.x + auraBounds.width &&
                       canvasY >= auraBounds.y && 
                       canvasY <= auraBounds.y + auraBounds.height;
            };

            // Add pointer event handlers to main app for aura sprite hover detection
            const isMobile = typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet();
            
            if (isMobile) {
                // Mobile: tap/click to show bubble
                app.canvas.addEventListener('click', (e) => {
                    if (checkAuraSpriteHover(e.clientX, e.clientY)) {
                        enableAudioOnSpriteInteraction();
                        if (window.blaisedShowBubble) {
                            window.blaisedShowBubble(blaisedAuraSprite);
                        }
                    }
                });
            } else {
                // Desktop: hover to show bubble
                let auraHoverTimeout = null;
                
                app.canvas.addEventListener('mousemove', (e) => {
                    if (checkAuraSpriteHover(e.clientX, e.clientY)) {
                        // Clear any existing timeout
                        if (auraHoverTimeout) {
                            clearTimeout(auraHoverTimeout);
                        }
                        
                        // Show bubble after a small delay to avoid flickering
                        auraHoverTimeout = setTimeout(() => {
                            enableAudioOnSpriteInteraction();
                            if (window.blaisedShowBubble) {
                                window.blaisedShowBubble(blaisedAuraSprite);
                            }
                        }, 100);
                    } else {
                        // Clear timeout if not hovering
                        if (auraHoverTimeout) {
                            clearTimeout(auraHoverTimeout);
                            auraHoverTimeout = null;
                        }
                    }
                });
            }

            // Position immediately using resizeBackground to ensure correct positioning
            // This ensures Blaised Aura is positioned correctly BEFORE the loading screen ends
            if (backgroundSprite && imageWidth && imageHeight) {
                // Call resizeBackground to position all sprites correctly
                // This will position Blaised Aura at the correct coordinates
                resizeBackground();

                // Make visible immediately after positioning
                blaisedAuraSprite.visible = true;

            } else {
                // If background not ready yet, make invisible until resizeBackground is called
                blaisedAuraSprite.visible = false;

            }

        } catch (error) {
            // Error loading Blaised Aura
        }

        // Blaised Action2 and Action3 sprites removed - files no longer exist

        // Load Wall Art animated frames (wall_art1.png to wall_art6.png - 6 frames total)
        try {

            // Load all 6 Wall Art frames in parallel for faster loading
            const wallArtUrls = Array.from({ length: 6 }, (_, i) => `/assets/wall_art${i + 1}.png`);
            const wallArtTextures = await loadAssetsInParallel(wallArtUrls);
            wallArtTextures.forEach((texture, i) => {

            });

            // Load Wall Art stroke animated frames (wall_art1_stroke.png to wall_art6_stroke.png - 6 frames total)

            // Load all 6 Wall Art stroke frames in parallel for faster loading
            const wallArtStrokeUrls = Array.from({ length: 6 }, (_, i) => `/assets/wall_art${i + 1}_stroke.png`);
            const wallArtStrokeTextures = await loadAssetsInParallel(wallArtStrokeUrls);
            wallArtStrokeTextures.forEach((texture, i) => {

            });

            // Create AnimatedSprite from the wall art textures
            wallArtSprite = new AnimatedSprite(wallArtTextures);
            wallArtSprite.anchor.set(0.5);

            // Configure wall art animation settings
            wallArtSprite.animationSpeed = 0.15; // Speed of animation (faster)
            wallArtSprite.loop = false; // Don't loop automatically - animation triggered by movement

            // Stop automatic animation - will be controlled by cursor/swipe movement
            wallArtSprite.stop();

            // Store animation speed for hover effects
            wallArtSprite.userData = wallArtSprite.userData || {};
            wallArtSprite.userData.baseAnimationSpeed = 0.1;
            wallArtSprite.userData.currentAnimationSpeed = 0.1;

            // Get wall art image dimensions
            const wallArtImageWidth = wallArtTextures[0].orig?.width || wallArtTextures[0].width || wallArtTextures[0].baseTexture.width || 1920;
            const wallArtImageHeight = wallArtTextures[0].orig?.height || wallArtTextures[0].height || wallArtTextures[0].baseTexture.height || 1080;

            // Wall Art config
            // Position on bg1.png:
            // Top-left: X: 4470, Y: 722
            // Bottom-right: X: 4958, Y: 1980.1
            // Center X: (4470 + 4958) / 2 = 4714
            // Center Y: (722 + 1980.1) / 2 = 1351.05
            // Dimensions: Width: 489, Height: 1259
            const wallArtConfig = {
                bg1X: 4714, // Center X position on bg1.png
                bg1Y: 1351.05, // Center Y position on bg1.png
                wallArtWidth: 489, // Width of wall art on bg1.png
                wallArtHeight: 1259, // Height of wall art on bg1.png
                scale: null, // Will be calculated based on bg1 scale
                offsetX: 0,
                offsetY: 0
            };

            // Calculate scale to make wall art image fit into designated space on bg1.png
            if (wallArtImageWidth && wallArtImageHeight && wallArtConfig.wallArtWidth && wallArtConfig.wallArtHeight) {
                const relativeScaleX = wallArtConfig.wallArtWidth / wallArtImageWidth;
                const relativeScaleY = wallArtConfig.wallArtHeight / wallArtImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                wallArtConfig.scale = Math.min(relativeScaleX, relativeScaleY);

            } else {
                // Fallback: use natural size
                wallArtConfig.scale = 1.0;
                // Wall Art: Could not calculate scale, using default
            }

            // Store config in userData for wall art sprite
            wallArtSprite.userData = wallArtSprite.userData || {};
            wallArtSprite.userData.config = wallArtConfig;
            wallArtSprite.userData.baseScale = 1.0; // Will be set after first resizeBackground call

            // Create stroke AnimatedSprite from the stroke textures
            wallArtStrokeSprite = new AnimatedSprite(wallArtStrokeTextures);
            wallArtStrokeSprite.anchor.set(0.5);

            // Configure stroke animation settings (same speed as wall art)
            wallArtStrokeSprite.animationSpeed = 0.15; // Same speed as wall art animation (faster)
            wallArtStrokeSprite.loop = true; // Loop the animation

            // Stroke sprite is hidden by default, shown on hover
            wallArtStrokeSprite.visible = false;
            wallArtStrokeSprite.alpha = 1.0;

            // Start the stroke animation
            wallArtStrokeSprite.play();

            // Store config in stroke sprite userData (same as wall art)
            wallArtStrokeSprite.userData = wallArtStrokeSprite.userData || {};
            wallArtStrokeSprite.userData.config = wallArtConfig;

            // Add to stage (after wall art sprite so it appears on top)
            app.stage.addChild(wallArtSprite);
            app.stage.addChild(wallArtStrokeSprite);

            // Set initial position (will be updated by resizeBackground)
            wallArtSprite.x = app.screen.width / 2;
            wallArtSprite.y = app.screen.height / 2;

            // Make sprite invisible until resizeBackground positions it correctly (prevents flash of incorrect positioning)
            wallArtSprite.visible = false;

            // Make wall art sprite interactive
            wallArtSprite.eventMode = 'static';
            wallArtSprite.cursor = 'pointer';

            // Sync stroke animation frame with wall art animation frame
            app.ticker.add(() => {
                if (wallArtStrokeSprite && wallArtSprite && wallArtSprite.currentFrame !== undefined) {
                    // Sync stroke frame with wall art frame
                    if (wallArtStrokeSprite.currentFrame !== wallArtSprite.currentFrame) {
                        wallArtStrokeSprite.gotoAndStop(wallArtSprite.currentFrame);
                    }
                    // Update stroke position and scale to match wall art
                    if (wallArtStrokeSprite.visible) {
                        wallArtStrokeSprite.x = wallArtSprite.x;
                        wallArtStrokeSprite.y = wallArtSprite.y;
                        wallArtStrokeSprite.scale.set(wallArtSprite.scale.x, wallArtSprite.scale.y);
                    }
                }
            });

            // Stroke and text are triggered by dot hover, not sprite hover (same as CCTV)

            // Animation is stopped - will be triggered by scroll, swipe, or cursor hover
            // Don't call play() - animation is controlled manually

            // Function to start wall art animation (plays continuously)
            const startWallArtAnimation = (direction) => {
                if (!wallArtSprite) return;

                // Always restart animation when movement is detected
                // Stop current animation first if it's playing
                if (wallArtIsAnimating) {
                    wallArtSprite.stop();
                    if (wallArtStrokeSprite) {
                        wallArtStrokeSprite.stop();
                    }
                }

                wallArtIsAnimating = true;

                // Set animation speed
                wallArtSprite.animationSpeed = 0.15;
                if (wallArtStrokeSprite) {
                    wallArtStrokeSprite.animationSpeed = 0.15;
                }

                // Play animation forward or backward based on direction
                if (direction > 0) {
                    // Play forward
                    wallArtSprite.play();
                    if (wallArtStrokeSprite) {
                        wallArtStrokeSprite.play();
                    }
                } else {
                    // Play backward (reverse)
                    // Note: PixiJS doesn't have built-in reverse, so we'll use a workaround
                    // For now, just play forward (can be enhanced later)
                    wallArtSprite.play();
                    if (wallArtStrokeSprite) {
                        wallArtStrokeSprite.play();
                    }
                }
            };

            // Function to stop wall art animation (make it globally accessible)
            stopWallArtAnimation = () => {
                if (!wallArtSprite) return;

                if (!wallArtIsAnimating) return;

                wallArtIsAnimating = false;

                // Stop animation
                wallArtSprite.stop();
                if (wallArtStrokeSprite) {
                    wallArtStrokeSprite.stop();
                }
            };

            // Function to advance wall art animation frame (make it globally accessible)
            advanceWallArtFrame = (direction) => {
                if (!wallArtSprite) return;

                // Always restart animation when movement is detected
                startWallArtAnimation(direction);

                // Clear existing timeout
                if (wallArtAnimationTimeout) {
                    clearTimeout(wallArtAnimationTimeout);
                }

                // Set timeout to stop animation when movement stops (300ms after last movement)
                // Clear any existing timeout first
                if (wallArtAnimationTimeout) {
                    clearTimeout(wallArtAnimationTimeout);
                }
                wallArtAnimationTimeout = setTimeout(() => {
                    stopWallArtAnimation();
                }, 300);
            };

            // Track if cursor is over wall art sprite (for hover animation)
            let isCursorOverWallArt = false;
            let wallArtHoverAnimationPlaying = false;
            let wallArtHoverTicker = null;

            // Function to play wall art animation once (like cup hop animation)
            const playWallArtHoverAnimation = () => {
                if (!wallArtSprite || wallArtHoverAnimationPlaying) return;

                wallArtHoverAnimationPlaying = true;

                // Reset to first frame and play through all frames once
                wallArtSprite.gotoAndStop(0);
                if (wallArtStrokeSprite) {
                    wallArtStrokeSprite.gotoAndStop(0);
                }

                // Set animation to play once (not loop)
                wallArtSprite.loop = false;
                if (wallArtStrokeSprite) {
                    wallArtStrokeSprite.loop = false;
                }

                // Set animation speed
                wallArtSprite.animationSpeed = 0.15;
                if (wallArtStrokeSprite) {
                    wallArtStrokeSprite.animationSpeed = 0.15;
                }

                // Play animation
                wallArtSprite.play();
                if (wallArtStrokeSprite) {
                    wallArtStrokeSprite.play();
                }

                // Check when animation completes (reached last frame)
                const totalFrames = wallArtTextures.length;
                if (wallArtHoverTicker) {
                    app.ticker.remove(wallArtHoverTicker);
                }
                wallArtHoverTicker = app.ticker.add(() => {
                    // Check if animation reached the last frame
                    if (wallArtSprite.currentFrame >= totalFrames - 1) {
                        // Animation complete - stop and reset
                        wallArtSprite.stop();
                        if (wallArtStrokeSprite) {
                            wallArtStrokeSprite.stop();
                        }
                        wallArtHoverAnimationPlaying = false;
                        app.ticker.remove(wallArtHoverTicker);
                        wallArtHoverTicker = null;
                    }
                });
            };

            // Load paper flip sound effect for wall art
            wallArtPaperFlipSound = new Audio('/assets/sounds/paper_flip.mp3');
            wallArtPaperFlipSound.volume = 0.6; // Set volume (60%)
            wallArtPaperFlipSound.preload = 'auto';
            // Start unmuted - can play instantly when triggered
            wallArtPaperFlipSound.muted = false;
            // Start unmuted - will sync after user interaction
            wallArtPaperFlipSound.muted = false;
            
            // Handle audio errors
            wallArtPaperFlipSound.addEventListener('error', (e) => {
                // Could not load wall art paper flip sound
            });

            // Trigger animation when cursor enters the wall art sprite (like cup)
            wallArtSprite.on('pointerenter', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                isCursorOverWallArt = true;
                // Play animation once when cursor enters (like cup hop)
                // If already playing, restart it
                if (wallArtHoverAnimationPlaying) {
                    // Stop current animation and restart
                    wallArtSprite.stop();
                    if (wallArtStrokeSprite) {
                        wallArtStrokeSprite.stop();
                    }
                    if (wallArtHoverTicker) {
                        app.ticker.remove(wallArtHoverTicker);
                        wallArtHoverTicker = null;
                    }
                    wallArtHoverAnimationPlaying = false;
                }
                playWallArtHoverAnimation();
                
                // Play paper flip sound effect
                playSpriteSound(wallArtPaperFlipSound);
            });

            // Also handle tap/click for mobile devices
            wallArtSprite.on('pointertap', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // Trigger same animation as hover for mobile
                if (!wallArtHoverAnimationPlaying) {
                    isCursorOverWallArt = true;
                    playWallArtHoverAnimation();
                    playSpriteSound(wallArtPaperFlipSound);
                }
            });
            
            wallArtSprite.on('pointerdown', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
            });

            // Stop tracking when cursor leaves
            wallArtSprite.on('pointerleave', () => {
                isCursorOverWallArt = false;
                
                // Stop paper flip sound immediately
                if (wallArtPaperFlipSound) {
                    wallArtPaperFlipSound.pause();
                    wallArtPaperFlipSound.currentTime = 0; // Reset to start for next play
                }
            });

            // Track wheel scroll events (mouse wheel, trackpad scroll)
            document.addEventListener('wheel', (e) => {
                const deltaX = e.deltaX; // Horizontal scroll
                const deltaY = e.deltaY; // Vertical scroll

                // Only trigger if there's significant scroll movement
                if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                    // Determine primary scroll direction
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        // Horizontal scroll (left/right)
                        if (deltaX > 0) {
                            // Scrolled right - advance frame forward
                            advanceWallArtFrame(1);
                        } else {
                            // Scrolled left - advance frame backward
                            advanceWallArtFrame(-1);
                        }
                    } else {
                        // Vertical scroll (top/bottom)
                        if (deltaY > 0) {
                            // Scrolled down - advance frame forward
                            advanceWallArtFrame(1);
                        } else {
                            // Scrolled up - advance frame backward
                            advanceWallArtFrame(-1);
                        }
                    }
                }
            }, { passive: true });

            // Also track window scroll (for actual page scrolling if scrollbars exist)
            let wallArtLastScrollX = window.scrollX || window.pageXOffset || 0;
            let wallArtLastScrollY = window.scrollY || window.pageYOffset || 0;

            window.addEventListener('scroll', () => {
                const currentScrollX = window.scrollX || window.pageXOffset || 0;
                const currentScrollY = window.scrollY || window.pageYOffset || 0;

                const deltaX = currentScrollX - wallArtLastScrollX;
                const deltaY = currentScrollY - wallArtLastScrollY;

                // Only trigger if there's significant scroll movement
                if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        // Horizontal scroll (left/right)
                        if (deltaX > 0) {
                            // Scrolled right - advance frame forward
                            advanceWallArtFrame(1);
                        } else {
                            // Scrolled left - advance frame backward
                            advanceWallArtFrame(-1);
                        }
                    } else {
                        // Vertical scroll (top/bottom)
                        if (deltaY > 0) {
                            // Scrolled down - advance frame forward
                            advanceWallArtFrame(1);
                        } else {
                            // Scrolled up - advance frame backward
                            advanceWallArtFrame(-1);
                        }
                    }

                    wallArtLastScrollX = currentScrollX;
                    wallArtLastScrollY = currentScrollY;
                }
            }, { passive: true });

            // Track swipe gestures (left/right)
            let wallArtSwipeStart = { x: 0, y: 0, time: 0 };
            const wallArtSwipeThreshold = 50; // Minimum distance for swipe
            const wallArtSwipeMaxTime = 300; // Maximum time for swipe (ms)

            document.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches.length === 1) {
                    wallArtSwipeStart.x = e.touches[0].clientX;
                    wallArtSwipeStart.y = e.touches[0].clientY;
                    wallArtSwipeStart.time = Date.now();
                }
            }, { passive: true });

            document.addEventListener('touchend', (e) => {
                if (!wallArtSwipeStart.time) return;

                const touch = e.changedTouches[0];
                if (!touch) return;

                const deltaX = touch.clientX - wallArtSwipeStart.x;
                const deltaY = touch.clientY - wallArtSwipeStart.y;
                const deltaTime = Date.now() - wallArtSwipeStart.time;

                // Check if it's a valid swipe (horizontal, fast enough, far enough)
                if (deltaTime < wallArtSwipeMaxTime && Math.abs(deltaX) > wallArtSwipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
                    // Horizontal swipe detected
                    if (deltaX > 0) {
                        // Swipe right - advance frame forward
                        advanceWallArtFrame(1);
                    } else {
                        // Swipe left - advance frame backward
                        advanceWallArtFrame(-1);
                    }
                }

                // Reset swipe start
                wallArtSwipeStart = { x: 0, y: 0, time: 0 };
            }, { passive: true });

            // Create pulsing dot at center of wall art (same design as mutator and CCTV dots)
            const createWallArtDot = () => {
                // Function to get responsive dot radius (same as mutator and CCTV)
                const getResponsiveWallArtDotRadius = () => {
                    const minDimension = Math.min(window.innerWidth, window.innerHeight);
                    let baseRadius = 6; // Default for large screens

                    if (minDimension <= 480) {
                        // Small phones
                        baseRadius = 4;
                    } else if (minDimension <= 768) {
                        // Tablets and larger phones
                        baseRadius = 5;
                    } else if (minDimension <= 1024) {
                        // Small laptops
                        baseRadius = 5.5;
                    } else if (minDimension <= 1440) {
                        // Laptops
                        baseRadius = 5.5;
                    }

                    return baseRadius;
                };

                // Create pulsing dot at center of wall art (same as mutator and CCTV)
                wallArtDot = new Graphics();
                const dotColor = 0xFFFFFF; // White dot

                // Pulsing animation variables
                wallArtDot.userData = wallArtDot.userData || {};
                wallArtDot.userData.pulseTime = 0;
                wallArtDot.userData.baseRadius = getResponsiveWallArtDotRadius();

                // Function to update dot size (call on resize)
                const updateWallArtDotSize = () => {
                    wallArtDot.userData.baseRadius = getResponsiveWallArtDotRadius();
                    // Update hit area when dot size changes
                    const maxHitRadius = wallArtDot.userData.baseRadius + 30; // Account for pulse waves
                    wallArtDot.hitArea = new PIXI.Circle(0, 0, maxHitRadius);
                };

                // Draw initial dot
                wallArtDot.circle(0, 0, wallArtDot.userData.baseRadius);
                wallArtDot.fill({ color: dotColor, alpha: 0.9 });
                // Hide dot initially until resizeBackground positions it correctly
                wallArtDot.visible = false;
                wallArtDot.eventMode = 'static';
                wallArtDot.cursor = 'pointer';

                // Set hit area for proper cursor interaction (even when graphics are cleared/redrawn)
                // Use a larger hit area to account for pulsing waves
                const maxHitRadius = wallArtDot.userData.baseRadius + 30; // Account for pulse waves
                wallArtDot.hitArea = new PIXI.Circle(0, 0, maxHitRadius);

                // Enhanced smooth pulsing animation (nicer wave effect) - same as mutator and CCTV
                app.ticker.add(() => {
                    if (wallArtDot && wallArtDot.visible && wallArtDot.parent) {
                        wallArtDot.userData.pulseTime += 0.025; // Smooth, gentle pulse speed

                        // Additional null check before clearing to prevent errors
                        if (wallArtDot && typeof wallArtDot.clear === 'function') {
                            wallArtDot.clear();
                        }

                        const baseRadius = wallArtDot.userData.baseRadius;

                        // Create multiple smooth ripple waves for enhanced effect
                        const numWaves = 4; // More waves for smoother effect
                        for (let i = 0; i < numWaves; i++) {
                            // Smoother wave calculation using easing
                            const wavePhase = wallArtDot.userData.pulseTime + (i * (Math.PI * 2 / numWaves));

                            // Use smoother sine wave with adjusted amplitude
                            const waveSize = Math.sin(wavePhase);

                            // Smoother wave expansion - more gradual (same as mutator and CCTV)
                            const waveExpansion = 8 + (i * 1.5);
                            const waveRadius = baseRadius + (waveSize * waveExpansion * (1 - i * 0.25));

                            // Smoother alpha fade - more gradual (same as mutator and CCTV)
                            const baseAlpha = 0.95 - (i * 0.15);
                            const alphaVariation = Math.abs(waveSize) * 0.3;
                            const waveAlpha = Math.max(0, Math.min(0.95, baseAlpha - alphaVariation));

                            // Only draw if radius and alpha are valid
                            if (waveRadius > 0 && waveAlpha > 0.05) {
                                wallArtDot.circle(0, 0, waveRadius);
                                wallArtDot.fill({ color: dotColor, alpha: waveAlpha });
                            }
                        }
                    }
                });

                // Update dot size on window resize
                window.addEventListener('resize', () => {
                    updateWallArtDotSize();
                });

                // Add dot to stage
                app.stage.addChild(wallArtDot);

                // Position at center of wall art (will be updated in resizeBackground)
                wallArtDot.x = wallArtSprite.x;
                wallArtDot.y = wallArtSprite.y;
            };

            createWallArtDot();

            // Create "OUR TEAM" text with same animation as X Account
            const createWallArtText = async () => {
                // Wait for font to be loaded before creating text
                if (document.fonts && document.fonts.check) {
                    function checkFont(fontFamily) {
                        return document.fonts.check(`1em "${fontFamily}"`) || 
                               document.fonts.check(`1em ${fontFamily}`) ||
                               document.fonts.check(`12px "${fontFamily}"`) ||
                               document.fonts.check(`12px ${fontFamily}`);
                    }
                    
                    let fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                    if (!fontLoaded) {
                        // Wait a bit more for font to load
                        let attempts = 0;
                        const maxAttempts = 10; // 1 second
                        while (!fontLoaded && attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                            attempts++;
                        }
                    if (!fontLoaded) {
                        // Font not detected for wall art text, but proceeding
                        } else {

                        }
                    }
                }

                // Function to get responsive font size (same as CCTV)
                const getResponsiveWallArtFontSize = () => {
                    const minDimension = Math.min(window.innerWidth, window.innerHeight);
                    let fontSize = 140; // Default for large screens

                    if (minDimension <= 480) {
                        // Small phones
                        fontSize = 60;
                    } else if (minDimension <= 768) {
                        // Tablets and larger phones
                        fontSize = 80;
                    } else if (minDimension <= 1024) {
                        // Small laptops
                        fontSize = 100;
                    } else if (minDimension <= 1440) {
                        // Laptops
                        fontSize = 120;
                    }

                    return fontSize;
                };

                // Create "OUR TEAM" text with Google Font (Zilla Slab Highlight)
                const wallArtTextStyle = new TextStyle({
                    fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK,
                    fontSize: getResponsiveWallArtFontSize(),
                    fill: 0xFFFFFF,
                    align: 'center',
                    fontWeight: 'bold',
                });

                wallArtTextSprite = new Text({
                    text: 'OUR TEAM',
                    style: wallArtTextStyle,
                });

                wallArtTextSprite.anchor.set(0.5);
                wallArtTextSprite.visible = false;
                wallArtTextSprite.eventMode = 'none';

                // Store responsive font size function and animation state in userData
                wallArtTextSprite.userData = {
                    getResponsiveFontSize: getResponsiveWallArtFontSize,
                    startX: null,
                    startY: null,
                    targetX: null,
                    targetY: null,
                    currentX: null,
                    currentY: null,
                    isAnimating: false,
                    animationSpeed: 0.09, // Same as Mutator and CCTV
                };

                // Add text to stage
                app.stage.addChild(wallArtTextSprite);
            };

            await createWallArtText();

            // Function to refresh text sprites to ensure custom fonts are used
            const refreshTextSprites = async () => {
                if (!document.fonts || !document.fonts.check) return;
                
                function checkFont(fontFamily) {
                    return document.fonts.check(`1em "${fontFamily}"`) || 
                           document.fonts.check(`1em ${fontFamily}`) ||
                           document.fonts.check(`12px "${fontFamily}"`) ||
                           document.fonts.check(`12px ${fontFamily}`);
                }
                
                let fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                if (!fontLoaded) {
                    // Wait a bit more
                    let attempts = 0;
                    while (!fontLoaded && attempts < 10) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                        attempts++;
                    }
                }
                
                if (!fontLoaded) {
                    // Font not loaded, skipping text refresh
                    return;
                }
                
                // Force refresh of all text sprites by updating their style
                const textSprites = [
                    { sprite: mutatorCapsuleTextSprite, name: 'Mutator' },
                    { sprite: cctvTextSprite, name: 'CCTV' },
                    { sprite: bookTextSprite, name: 'Book' },
                    { sprite: wallArtTextSprite, name: 'Wall Art' }
                ];
                
                textSprites.forEach(({ sprite, name }) => {
                    if (sprite && sprite.style) {
                        try {
                            // Store original text and style
                            const originalText = sprite.text;
                            const originalStyle = sprite.style;
                            
                            // Create new style with updated fontFamily to force re-render
                            const newStyle = new TextStyle({
                                ...originalStyle,
                                fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK
                            });
                            
                            // Update the text sprite with new style
                            sprite.style = newStyle;
                            sprite.text = originalText; // Force update by setting text again

                        } catch (error) {
                            // Error refreshing text sprite
                        }
                    }
                });
            };
            
            // Refresh text sprites after fonts are confirmed loaded
            // Use multiple timeouts to catch fonts that load later
            setTimeout(() => {
                refreshTextSprites();
            }, 1000);
            
            setTimeout(() => {
                refreshTextSprites();
            }, 2000);

            // Store animation ticker reference
            let wallArtAnimationTicker = null;

            // Function to show text with ATM card ejection animation (slides up from bottom)
            const showWallArtText = () => {
                if (!wallArtTextSprite || !wallArtSprite) return;

                // Remove any existing animation ticker
                if (wallArtAnimationTicker) {
                    app.ticker.remove(wallArtAnimationTicker);
                    wallArtAnimationTicker = null;
                }

                // Calculate positions for ATM card ejection effect (slides up from bottom)
                const bg1TargetX = 2666.5; // Target X position (same as Mutator and CCTV)
                const bg1TargetY = 1630.5; // Final Y position (same level as Mutator and CCTV)

                // Get current background position and scale to convert coordinates
                if (backgroundSprite) {
                    const scale = currentScale || 1;
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;
                    const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                    const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                    // Convert bg1 coordinates to screen coordinates
                    const normalizedTargetX = bg1TargetX / imageWidth;
                    const normalizedTargetY = bg1TargetY / imageHeight;

                    const targetScreenX = bg1Left + (normalizedTargetX * bg1DisplayedWidth);
                    const targetScreenY = bg1Top + (normalizedTargetY * bg1DisplayedHeight);

                    // Target position (final position where text should be)
                    wallArtTextSprite.userData.targetX = targetScreenX;
                    wallArtTextSprite.userData.targetY = targetScreenY;

                    // Start position (text starts from bottom, slides up like ATM card ejection)
                    const cardEjectionDistance = 100; // Distance to slide up
                    wallArtTextSprite.userData.startX = targetScreenX; // Same X position
                    wallArtTextSprite.userData.startY = targetScreenY + cardEjectionDistance; // Start below, slides up
                } else {
                    // Fallback: use center page position directly
                    wallArtTextSprite.userData.targetX = app.screen.width / 2;
                    wallArtTextSprite.userData.targetY = app.screen.height / 2;
                    const cardEjectionDistance = 100;
                    wallArtTextSprite.userData.startX = wallArtTextSprite.userData.targetX; // Same X
                    wallArtTextSprite.userData.startY = wallArtTextSprite.userData.targetY + cardEjectionDistance; // Start from bottom
                }

                // Reset animation state
                wallArtTextSprite.userData.isAnimating = true;

                // Start position (text starts from bottom, slides up like ATM card ejection)
                wallArtTextSprite.x = wallArtTextSprite.userData.startX;
                wallArtTextSprite.y = wallArtTextSprite.userData.startY;
                wallArtTextSprite.userData.currentX = wallArtTextSprite.userData.startX;
                wallArtTextSprite.userData.currentY = wallArtTextSprite.userData.startY;

                // Make visible
                wallArtTextSprite.visible = true;
                wallArtTextSprite.alpha = 1.0;

                // Animate text sliding up from bottom (ATM card ejection effect)
                wallArtTextSprite.userData.isAnimating = true;
                wallArtAnimationTicker = app.ticker.add(() => {
                    if (!wallArtTextSprite || !wallArtTextSprite.userData.isAnimating) return;

                    const data = wallArtTextSprite.userData;
                    const distanceX = data.targetX - data.currentX;
                    const distanceY = data.targetY - data.currentY;

                    if (Math.abs(distanceX) > 0.5 || Math.abs(distanceY) > 0.5) {
                        // Continue sliding up towards target
                        data.currentX += (distanceX * data.animationSpeed);
                        data.currentY += (distanceY * data.animationSpeed);
                        wallArtTextSprite.x = data.currentX;
                        wallArtTextSprite.y = data.currentY;
                    } else {
                        // Reached target position
                        wallArtTextSprite.x = data.targetX;
                        wallArtTextSprite.y = data.targetY;
                        data.currentX = data.targetX;
                        data.currentY = data.targetY;
                        data.isAnimating = false;
                        app.ticker.remove(wallArtAnimationTicker);
                        wallArtAnimationTicker = null;
                    }
                });
            };

            // Function to hide text
            const hideWallArtText = () => {
                if (!wallArtTextSprite) return;

                // Remove any existing animation ticker
                if (wallArtAnimationTicker) {
                    app.ticker.remove(wallArtAnimationTicker);
                    wallArtAnimationTicker = null;
                }

                // Stop any ongoing animation
                if (wallArtTextSprite.userData) {
                    wallArtTextSprite.userData.isAnimating = false;
                }

                // Hide text immediately
                wallArtTextSprite.visible = false;
                wallArtTextSprite.alpha = 0;
            };

            // Create simple label text for mobile/tablet (just "OUR TEAM")
            const wallArtMobileLabelStyle = new TextStyle({
                fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK,
                fontSize: 18,
                fill: 0xFFFFFF,
                align: 'center',
                fontWeight: 'bold',
            });
            wallArtLabelText = new Text({
                text: 'Our Team',
                style: wallArtMobileLabelStyle,
            });
            wallArtLabelText.anchor.set(0.5);
            wallArtLabelText.visible = false; // Hidden by default, only shown on mobile/tablet
            app.stage.addChild(wallArtLabelText);

            // Create circle with "click to explore" text (hidden by default, similar to CCTV)
            wallArtCircleText = new Container();

            // Create circle background - smaller circle, no border
            const wallArtCircleBg = new Graphics();
            const wallArtCircleRadius = 70; // Same as CCTV
            wallArtCircleBg.circle(0, 0, wallArtCircleRadius);
            wallArtCircleBg.fill({ color: 0xFFFFFF, alpha: 0.1 }); // Semi-transparent white

            // Create text style - same as CCTV: simple, pure white, sans-serif, smaller, bold
            const wallArtCircleTextStyle = new TextStyle({
                fontFamily: 'sans-serif', // System sans-serif font
                fontSize: 16, // Same as CCTV
                fill: 0xFFFFFF, // Pure white
                align: 'center',
                fontWeight: 'bold', // Bold text for better visibility
            });

            // Create two-line text: "Click To" on top, "Explore" below (desktop only)
            const wallArtClickTextTop = new Text({
                text: 'Click To',
                style: wallArtCircleTextStyle,
            });
            wallArtClickTextTop.anchor.set(0.5);
            wallArtClickTextTop.x = 0;
            wallArtClickTextTop.y = -8; // Position above center

            const wallArtClickTextBottom = new Text({
                text: 'Explore',
                style: wallArtCircleTextStyle,
            });
            wallArtClickTextBottom.anchor.set(0.5);
            wallArtClickTextBottom.x = 0;
            wallArtClickTextBottom.y = 8; // Position below center

            wallArtCircleText.addChild(wallArtCircleBg);
            wallArtCircleText.addChild(wallArtClickTextTop);
            wallArtCircleText.addChild(wallArtClickTextBottom);
            wallArtCircleText.visible = false; // Hidden by default, only shows when dot is hovered
            wallArtCircleText.eventMode = 'none'; // Allow pointer events to pass through for global tracking
            wallArtCircleText.cursor = 'default';

            // Add circle text to stage
            app.stage.addChild(wallArtCircleText);

            // Track global mouse position for circle following
            let wallArtLastMousePos = { x: 0, y: 0 };
            let wallArtIsCircleActive = false;

            // Offset to position text at cursor tip (above and to the right of cursor)
            const WALLARTCURSOR_TIP_OFFSET_X = 12; // Offset to the right
            const WALLARTCURSOR_TIP_OFFSET_Y = -25; // Offset upward (above cursor tip)

            // Function to check if cursor is within dot's bounds
            const isCursorInWallArtDotBounds = (cursorX, cursorY) => {
                if (!wallArtDot || !wallArtDot.parent || !wallArtDot.userData) {
                    return false;
                }

                const dotX = wallArtDot.x;
                const dotY = wallArtDot.y;
                const baseRadius = wallArtDot.userData.baseRadius || 8;
                const maxWaveExpansion = 15;
                const tolerance = baseRadius * 0.8;
                const maxDotRadius = baseRadius + maxWaveExpansion + tolerance;

                const dx = cursorX - dotX;
                const dy = cursorY - dotY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                return distance <= maxDotRadius;
            };

            // Function to show circle and activate effects (desktop only)
            const showWallArtCircle = (cursorX, cursorY) => {
                // Don't show circle text on mobile/tablet - label text is always visible
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    return;
                }

                // Only show if not already active (prevent multiple triggers)
                if (wallArtIsCircleActive) return;

                wallArtDot.visible = false;
                wallArtCircleText.visible = true;
                wallArtIsCircleActive = true;

                // Show "OUR TEAM" text animation (slides up from below) - appears when cursor is pointed (desktop only)
                // On mobile/tablet, don't show animated text - only fixed label text below dot
                if (!(typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet())) {
                    showWallArtText();
                }

                // Show stroke overlay (animated stroke frames around wall art)
                if (wallArtStrokeSprite) {
                    wallArtStrokeSprite.visible = true;
                    wallArtStrokeSprite.alpha = 1.0;
                    // Position and scale stroke to match wall art
                    wallArtStrokeSprite.x = wallArtSprite.x;
                    wallArtStrokeSprite.y = wallArtSprite.y;
                    wallArtStrokeSprite.scale.set(wallArtSprite.scale.x, wallArtSprite.scale.y);
                }

                // Position circle at cursor tip (offset so text appears above cursor, not covered by it)
                wallArtCircleText.x = cursorX + WALLARTCURSOR_TIP_OFFSET_X;
                wallArtCircleText.y = cursorY + WALLARTCURSOR_TIP_OFFSET_Y;
            };

            // Function to hide circle and show dot
            const hideWallArtCircle = () => {
                // Only hide if currently active (prevent multiple triggers)
                if (!wallArtIsCircleActive) return;

                wallArtDot.visible = true;
                wallArtCircleText.visible = false;
                wallArtIsCircleActive = false;

                // Hide "OUR TEAM" text animation - vanishes when cursor is not pointed
                hideWallArtText();

                // Hide stroke overlay
                if (wallArtStrokeSprite) {
                    wallArtStrokeSprite.visible = false;
                }
            };

            // Function to update circle and text based on cursor bounds
            const updateWallArtCircleBasedOnBounds = (cursorX, cursorY) => {
                // Don't show circle text on mobile/tablet - label text is always visible
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    return; // Skip circle text logic on mobile/tablet
                }

                const inBounds = isCursorInWallArtDotBounds(cursorX, cursorY);

                if (inBounds && !wallArtIsCircleActive) {
                    // Cursor entered dot bounds - show circle and text
                    showWallArtCircle(cursorX, cursorY);
                } else if (!inBounds && wallArtIsCircleActive) {
                    // Cursor left dot bounds - hide circle and text immediately
                    hideWallArtCircle();
                } else if (!inBounds && wallArtTextSprite && wallArtTextSprite.visible) {
                    // Extra safety check: if text is visible but cursor is out of bounds, hide it
                    hideWallArtText();
                }
            };

            // Track mouse on canvas and document level (same as CCTV)
            document.addEventListener('mousemove', (e) => {
                const rect = app.canvas.getBoundingClientRect();
                const scaleX = app.canvas.width / rect.width;
                const scaleY = app.canvas.height / rect.height;

                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;

                wallArtLastMousePos.x = mouseX;
                wallArtLastMousePos.y = mouseY;

                updateWallArtCircleBasedOnBounds(mouseX, mouseY);

                // Update circle position if active
                if (wallArtIsCircleActive) {
                    wallArtCircleText.x = mouseX + WALLARTCURSOR_TIP_OFFSET_X;
                    wallArtCircleText.y = mouseY + WALLARTCURSOR_TIP_OFFSET_Y;
                }
            });

            // Handle touch move (mobile) - important for responsive bounds checking
            document.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches.length > 0) {
                    const rect = app.canvas.getBoundingClientRect();
                    const scaleX = app.canvas.width / rect.width;
                    const scaleY = app.canvas.height / rect.height;

                    const touchX = (e.touches[0].clientX - rect.left) * scaleX;
                    const touchY = (e.touches[0].clientY - rect.top) * scaleY;

                    wallArtLastMousePos.x = touchX;
                    wallArtLastMousePos.y = touchY;

                    // Only update if not dragging (to avoid interference with panning)
                    if (!isDragging) {
                        updateWallArtCircleBasedOnBounds(touchX, touchY);

                        // Update circle position if active
                        if (wallArtIsCircleActive) {
                            wallArtCircleText.x = touchX + WALLARTCURSOR_TIP_OFFSET_X;
                            wallArtCircleText.y = touchY + WALLARTCURSOR_TIP_OFFSET_Y;
                        }
                    }
                }
            }, { passive: true });

            // Stage pointer move for better tracking within canvas
            app.stage.on('globalpointermove', (e) => {
                const globalPos = e.global;
                wallArtLastMousePos.x = globalPos.x;
                wallArtLastMousePos.y = globalPos.y;
                updateWallArtCircleBasedOnBounds(globalPos.x, globalPos.y);
            });

            // Ticker to continuously check bounds and update circle/text
            app.ticker.add(() => {
                if (wallArtDot && wallArtDot.parent) {
                    // Update based on cursor bounds - this controls both circle and text visibility
                    updateWallArtCircleBasedOnBounds(wallArtLastMousePos.x, wallArtLastMousePos.y);

                    // Update circle position if active
                    if (wallArtIsCircleActive) {
                        wallArtCircleText.x = wallArtLastMousePos.x + WALLARTCURSOR_TIP_OFFSET_X;
                        wallArtCircleText.y = wallArtLastMousePos.y + WALLARTCURSOR_TIP_OFFSET_Y;
                    }

                    // Safety check: ensure text is hidden if circle is not active
                    if (!wallArtIsCircleActive && wallArtTextSprite && wallArtTextSprite.visible) {
                        hideWallArtText();
                    }
                }
            });

            // Touch/click handlers for mobile and desktop - similar to CCTV
            // Handle pointerdown for better mobile touch support
            wallArtDot.on('pointerdown', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // On mobile/tablet, don't show circle - just prepare for click
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    event.stopPropagation(); // Prevent panning from starting
                    return;
                }
                // On desktop, treat as hover
                const globalPos = event.global;
                showWallArtCircle(globalPos.x, globalPos.y);
                event.stopPropagation(); // Prevent panning from starting
            });

            wallArtDot.on('pointerup', (event) => {
                const globalPos = event.global;
                // On mobile/tablet, always redirect on tap
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {

                    window.location.href = 'our_team.html';
                    event.stopPropagation();
                    return;
                }
                // On desktop, only redirect if in bounds
                if (isCursorInWallArtDotBounds(globalPos.x, globalPos.y)) {

                    window.location.href = 'our_team.html';
                }
                event.stopPropagation(); // Prevent panning
            });

            // Also handle pointertap as fallback
            wallArtDot.on('pointertap', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // On mobile/tablet, always redirect
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {

                    window.location.href = 'our_team.html';
                    event.stopPropagation();
                    return;
                }
                // On desktop, redirect

                window.location.href = 'our_team.html';
                event.stopPropagation(); // Prevent panning
            });

            // Also allow clicking on circle text to redirect
            wallArtCircleText.eventMode = 'static';
            wallArtCircleText.cursor = 'pointer';

            wallArtCircleText.on('pointerdown', (event) => {
                event.stopPropagation();
            });

            wallArtCircleText.on('pointertap', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                window.location.href = 'our_team.html';
            });

            // Click handler for dot

            // Dot position is updated in resizeBackground, no need for separate ticker

        } catch (error) {
            // Error loading Wall Art textures
        }

        // Load Book sprite (book.png)
        try {

            const bookTexture = await loadAssetWithProgress('assets/book.png');

            // Load Book stroke (book_stroke.png)

            const bookStrokeTexture = await loadAssetWithProgress('assets/book_stroke.png');

            // Create Sprite from the book texture
            bookSprite = new Sprite(bookTexture);
            bookSprite.anchor.set(0.5);

            // Load book move sound effect
            bookMoveSound = new Audio('/assets/sounds/book_move.mp3');
            bookMoveSound.volume = 0.6; // Set volume (60%)
            bookMoveSound.preload = 'auto';
            // Start unmuted - can play instantly when triggered
            bookMoveSound.muted = false;
            // Start unmuted - will sync after user interaction
            bookMoveSound.muted = false;
            
            // Handle audio errors
            bookMoveSound.addEventListener('error', (e) => {
                // Could not load book move sound
            });

            // Hide sprite initially until resizeBackground positions it correctly
            bookSprite.visible = false;
            bookSprite.alpha = 1.0;

            // Get book image dimensions
            const bookImageWidth = bookTexture.orig?.width || bookTexture.width || bookTexture.baseTexture.width || 1920;
            const bookImageHeight = bookTexture.orig?.height || bookTexture.height || bookTexture.baseTexture.height || 1080;

            // Book config
            // Position on bg1.png:
            // Top-left: Y: 2524px, X: 771px
            // Bottom-right: Y: 3025px, X: 1709px
            // Center X: (771 + 1709) / 2 = 1240
            // Center Y: (2524 + 3025) / 2 = 2774.5
            // Dimensions: Width: 939px, Height: 502px
            const bookConfig = {
                bg1X: 1240, // Center X position on bg1.png
                bg1Y: 2774.5, // Center Y position on bg1.png
                bookWidth: 939, // Width of book on bg1.png
                bookHeight: 502, // Height of book on bg1.png
                scale: null, // Will be calculated based on bg1 scale
                offsetX: 0,
                offsetY: 0
            };

            // Calculate scale to make book image fit into designated space on bg1.png
            if (bookImageWidth && bookImageHeight && bookConfig.bookWidth && bookConfig.bookHeight) {
                // Scale bookWidth/bookHeight proportionally based on image optimization
                const imageScaleFactorX = imageWidth / ORIGINAL_IMAGE_WIDTH;
                const imageScaleFactorY = imageHeight / ORIGINAL_IMAGE_HEIGHT;
                const scaledBookWidth = bookConfig.bookWidth * imageScaleFactorX;
                const scaledBookHeight = bookConfig.bookHeight * imageScaleFactorY;
                
                const relativeScaleX = scaledBookWidth / bookImageWidth;
                const relativeScaleY = scaledBookHeight / bookImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                bookConfig.scale = Math.min(relativeScaleX, relativeScaleY);

            } else {
                // Fallback: use natural size
                bookConfig.scale = 1.0;
                // Book: Could not calculate scale, using default
            }

            // Store config in userData for book sprite
            bookSprite.userData = bookSprite.userData || {};
            bookSprite.userData.config = bookConfig;
            bookSprite.userData.baseScale = 1.0; // Will be set after first resizeBackground call

            // Create stroke Sprite from the stroke texture
            bookStrokeSprite = new Sprite(bookStrokeTexture);
            bookStrokeSprite.anchor.set(0.5);

            // Stroke sprite is hidden by default, shown on hover
            bookStrokeSprite.visible = false;
            bookStrokeSprite.alpha = 1.0;

            // Get book stroke image dimensions
            const bookStrokeImageWidth = bookStrokeTexture.orig?.width || bookStrokeTexture.width || bookStrokeTexture.baseTexture.width || 1920;
            const bookStrokeImageHeight = bookStrokeTexture.orig?.height || bookStrokeTexture.height || bookStrokeTexture.baseTexture.height || 1080;

            // Book stroke config - now uses same config as book for perfect alignment
            // The stroke sprite will always match the book sprite's position and scale
            // Store reference to book config in stroke sprite userData
            bookStrokeSprite.userData = bookStrokeSprite.userData || {};
            bookStrokeSprite.userData.useBookConfig = true; // Flag to use book's config

            // Make book sprite interactive for hover effects
            bookSprite.eventMode = 'static';
            bookSprite.cursor = 'pointer';
            
            // Store original rotation for hover animation
            bookSprite.userData.originalRotation = 0;
            bookSprite.userData.isHovered = false;
            bookSprite.userData.isAnimating = false;
            bookSprite.userData.hoverAnimationTime = 0;
            bookSprite.userData.hoverTicker = null;

            // Add to stage
            app.stage.addChild(bookSprite);
            
            // Set zIndex to be at same level as screen and YouTube video (below instructions)
            bookSprite.zIndex = 10;

            // Set initial position (will be updated by resizeBackground)
            bookSprite.x = app.screen.width / 2;
            bookSprite.y = app.screen.height / 2;

            // Add stroke overlay to stage (on top of book sprite)
            app.stage.addChild(bookStrokeSprite);
            bookStrokeSprite.zIndex = 11;

            // Set initial position and scale (will be updated in resizeBackground)
            // Stroke sprite will always match book sprite's position and scale
            bookStrokeSprite.x = bookSprite.x;
            bookStrokeSprite.y = bookSprite.y;
            bookStrokeSprite.scale.set(bookSprite.scale.x, bookSprite.scale.y);

            // Function to calculate responsive font size based on screen size
            const getResponsiveBookFontSize = () => {
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                const minDimension = Math.min(screenWidth, screenHeight);

                // Large screens (desktop) - big text
                let fontSize = 180;

                // Responsive scaling based on screen size
                if (minDimension <= 768) {
                    // Mobile phones - smaller
                    fontSize = 72;
                } else if (minDimension <= 1024) {
                    // Tablets - medium
                    fontSize = 96;
                } else if (minDimension <= 1440) {
                    // Small laptops - medium-large
                    fontSize = 120;
                } else if (minDimension <= 1920) {
                    // Standard desktop - large
                    fontSize = 150;
                }
                // Larger screens use fontSize = 180

                return fontSize;
            };

            // Function to calculate responsive dot radius based on screen size
            const getResponsiveBookDotRadius = () => {
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                const minDimension = Math.min(screenWidth, screenHeight);

                // Slightly larger base so the dot stays visible
                let baseRadius = 6; // desktop default

                // Responsive scaling based on screen size
                if (minDimension <= 768) {
                    // Mobile phones
                    baseRadius = 4;
                } else if (minDimension <= 1024) {
                    // Tablets
                    baseRadius = 4.8;
                } else if (minDimension <= 1440) {
                    // Small laptops
                    baseRadius = 5.4;
                }

                return baseRadius;
            };

            // Create pulsing dot at center of book (wave-like animation)
            bookDot = new Graphics();
            const dotColor = 0xFFFFFF; // White dot to match other hotspots

            // Pulsing animation variables
            bookDot.userData = bookDot.userData || {};
            bookDot.userData.pulseTime = 0;
            bookDot.userData.baseRadius = getResponsiveBookDotRadius();

            // Function to update dot size (call on resize)
            const updateBookDotSize = () => {
                bookDot.userData.baseRadius = getResponsiveBookDotRadius();
            };

            // Draw initial dot
            bookDot.circle(0, 0, bookDot.userData.baseRadius);
            bookDot.fill({ color: dotColor, alpha: 0.9 });
            // Hide dot initially until resizeBackground positions it correctly
            bookDot.visible = false;
            bookDot.eventMode = 'static';
            bookDot.cursor = 'pointer';

            // Position dot at center of book sprite
            bookDot.x = bookSprite.x;
            bookDot.y = bookSprite.y;

            // Add dot to stage
            app.stage.addChild(bookDot);
            bookDot.zIndex = 12; // Above book and stroke

            // Enhanced smooth pulsing animation (nicer wave effect)
            app.ticker.add(() => {
                if (bookDot && bookDot.visible && bookDot.parent) {
                    bookDot.userData.pulseTime += 0.025; // Smooth, gentle pulse speed

                    // Additional null check before clearing to prevent errors
                    if (bookDot && typeof bookDot.clear === 'function') {
                        bookDot.clear();
                    }

                    const baseRadius = bookDot.userData.baseRadius;

                    // Create multiple smooth ripple waves for enhanced effect
                    const numWaves = 4; // More waves for smoother effect
                    for (let i = 0; i < numWaves; i++) {
                        // Smoother wave calculation using easing
                        const wavePhase = bookDot.userData.pulseTime + (i * (Math.PI * 2 / numWaves));

                        // Use smoother sine wave with adjusted amplitude
                        const waveSize = Math.sin(wavePhase);

                        // Smoother wave expansion - more gradual
                        const waveExpansion = 8 + (i * 1.5);
                        const waveRadius = baseRadius + (waveSize * waveExpansion * (1 - i * 0.25));

                        // Smoother alpha fade - more gradual
                        const baseAlpha = 0.95 - (i * 0.15);
                        const alphaVariation = Math.abs(waveSize) * 0.3;
                        const waveAlpha = Math.max(0, Math.min(0.95, baseAlpha - alphaVariation));

                        // Only draw if radius and alpha are valid
                        if (waveRadius > 0 && waveAlpha > 0.05) {
                            bookDot.circle(0, 0, waveRadius);
                            bookDot.fill({ color: dotColor, alpha: waveAlpha });
                        }
                    }
                }
            });

            // Wait for font to load before creating text
            const createBookText = async () => {
                // Wait for font to be loaded before creating text
                if (document.fonts && document.fonts.check) {
                    function checkFont(fontFamily) {
                        return document.fonts.check(`1em "${fontFamily}"`) || 
                               document.fonts.check(`1em ${fontFamily}`) ||
                               document.fonts.check(`12px "${fontFamily}"`) ||
                               document.fonts.check(`12px ${fontFamily}`);
                    }
                    
                    let fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                    if (!fontLoaded) {
                        // Wait a bit more for font to load
                        let attempts = 0;
                        const maxAttempts = 10; // 1 second
                        while (!fontLoaded && attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            fontLoaded = checkFont(GLOBAL_FONT_FAMILY);
                            attempts++;
                        }
                    if (!fontLoaded) {
                        // Font not detected for Book text, but proceeding
                        } else {

                        }
                    }
                }

                // Create "Community" text with Google Font
                const bookTextStyle = new TextStyle({
                    fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK, // Google Font with fallback
                    fontSize: getResponsiveBookFontSize(),
                    fill: 0xFFFFFF, // White text
                    align: 'center',
                    fontWeight: 'bold',
                });

                bookTextSprite = new Text({
                    text: 'COMMUNITY',
                    style: bookTextStyle,
                });

                bookTextSprite.anchor.set(0.5); // Center the text
                bookTextSprite.visible = false; // Hidden by default, shows on hover
                bookTextSprite.eventMode = 'none'; // Don't block pointer events

                // Store responsive font size function and animation state in userData
                bookTextSprite.userData = {
                    getResponsiveFontSize: getResponsiveBookFontSize,
                    startX: null,
                    startY: null,
                    targetX: null,
                    targetY: null,
                    currentX: null,
                    currentY: null,
                    isAnimating: false,
                    animationSpeed: 0.09, // Speed of ATM withdrawal animation
                };

                // Add text to stage
                app.stage.addChild(bookTextSprite);
                bookTextSprite.zIndex = 13;
            };

            // Call async function to create text with font loading
            await createBookText();

            // Store animation ticker reference to prevent multiple tickers
            let bookAnimationTicker = null;

            // Function to show text with ATM withdrawal animation (slides up from below)
            const showBookText = () => {
                if (!bookTextSprite || !bookSprite) return;

                // Remove any existing animation ticker
                if (bookAnimationTicker) {
                    app.ticker.remove(bookAnimationTicker);
                    bookAnimationTicker = null;
                }

                // Calculate positions for ATM card ejection effect (slides up from bottom)
                const bg1TargetX = 2666.5; // Target X position (same as Mutator, CCTV, and Wall Art)
                const bg1TargetY = 1630.5; // Final Y position (same level as Mutator, CCTV, and Wall Art)

                // Get current background position and scale to convert coordinates
                if (backgroundSprite && bookSprite.userData && bookSprite.userData.config) {
                    const bookConfig = bookSprite.userData.config;
                    const scale = currentScale || 1;
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;
                    const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                    const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;

                    // Convert bg1 coordinates to screen coordinates
                    const normalizedTargetX = bg1TargetX / imageWidth;
                    const normalizedTargetY = bg1TargetY / imageHeight;

                    const targetScreenX = bg1Left + (normalizedTargetX * bg1DisplayedWidth);
                    const targetScreenY = bg1Top + (normalizedTargetY * bg1DisplayedHeight);

                    // Target position (final position where text should be)
                    bookTextSprite.userData.targetX = targetScreenX;
                    bookTextSprite.userData.targetY = targetScreenY;

                    // Start position (text starts from bottom, slides up like ATM card ejection)
                    const cardEjectionDistance = 100; // Distance to slide up
                    bookTextSprite.userData.startX = targetScreenX; // Same X position
                    bookTextSprite.userData.startY = targetScreenY + cardEjectionDistance; // Start below, slides up
                } else {
                    // Fallback: use center page position directly
                    bookTextSprite.userData.targetX = app.screen.width / 2;
                    bookTextSprite.userData.targetY = app.screen.height / 2;
                    const cardEjectionDistance = 100;
                    bookTextSprite.userData.startX = bookTextSprite.userData.targetX; // Same X
                    bookTextSprite.userData.startY = bookTextSprite.userData.targetY + cardEjectionDistance; // Start from bottom
                }

                // Reset animation state
                bookTextSprite.userData.isAnimating = true;

                // Start position (text starts from bottom, slides up like ATM card ejection)
                bookTextSprite.x = bookTextSprite.userData.startX;
                bookTextSprite.y = bookTextSprite.userData.startY;
                bookTextSprite.userData.currentX = bookTextSprite.userData.startX;
                bookTextSprite.userData.currentY = bookTextSprite.userData.startY;

                // Make visible - appears when cursor is pointed
                bookTextSprite.visible = true;
                bookTextSprite.alpha = 1.0;

                // Animate text sliding up from bottom (ATM card ejection effect)
                bookTextSprite.userData.isAnimating = true;
                bookAnimationTicker = app.ticker.add(() => {
                    if (!bookTextSprite || !bookTextSprite.userData.isAnimating) return;

                    const data = bookTextSprite.userData;
                    const distanceX = data.targetX - data.currentX;
                    const distanceY = data.targetY - data.currentY;

                    if (Math.abs(distanceX) > 0.5 || Math.abs(distanceY) > 0.5) {
                        // Continue sliding up towards target
                        data.currentX += (distanceX * data.animationSpeed);
                        data.currentY += (distanceY * data.animationSpeed);
                        bookTextSprite.x = data.currentX;
                        bookTextSprite.y = data.currentY;
                    } else {
                        // Reached target position
                        bookTextSprite.x = data.targetX;
                        bookTextSprite.y = data.targetY;
                        data.currentX = data.targetX;
                        data.currentY = data.targetY;
                        data.isAnimating = false;
                        app.ticker.remove(bookAnimationTicker);
                        bookAnimationTicker = null;
                    }
                });
            };

            // Function to hide text
            const hideBookText = () => {
                if (!bookTextSprite) return;

                // Remove any existing animation ticker
                if (bookAnimationTicker) {
                    app.ticker.remove(bookAnimationTicker);
                    bookAnimationTicker = null;
                }

                // Stop any ongoing animation
                if (bookTextSprite.userData) {
                    bookTextSprite.userData.isAnimating = false;
                }

                // Hide text immediately when cursor is not pointed
                bookTextSprite.visible = false;
                bookTextSprite.alpha = 0;
            };

            // Create simple label text for mobile/tablet (just "Community")
            const bookMobileLabelStyle = new TextStyle({
                fontFamily: GLOBAL_FONT_FAMILY_WITH_FALLBACK,
                fontSize: 18,
                fill: 0xFFFFFF,
                align: 'center',
                fontWeight: 'bold',
            });
            bookLabelText = new Text({
                text: 'Community',
                style: bookMobileLabelStyle,
            });
            bookLabelText.anchor.set(0.5);
            bookLabelText.visible = false; // Hidden by default, only shown on mobile/tablet
            app.stage.addChild(bookLabelText);
            bookLabelText.zIndex = 14;

            // Create circle with "click to explore" text (hidden by default, similar to CCTV)
            bookCircleText = new Container();
            bookCircleText.zIndex = 15;

            // Create circle background - smaller circle, no border
            const bookCircleBg = new Graphics();
            const bookCircleRadius = 70; // Same as CCTV
            bookCircleBg.circle(0, 0, bookCircleRadius);
            bookCircleBg.fill({ color: 0xFFFFFF, alpha: 0.1 }); // Semi-transparent white

            // Create text style - same as CCTV: simple, pure white, sans-serif, smaller, bold
            const bookCircleTextStyle = new TextStyle({
                fontFamily: 'sans-serif', // System sans-serif font
                fontSize: 16, // Same as CCTV
                fill: 0xFFFFFF, // Pure white
                align: 'center',
                fontWeight: 'bold', // Bold text for better visibility
            });

            // Create two-line text: "Click To" on top, "Explore" below (desktop only)
            const bookClickTextTop = new Text({
                text: 'Click To',
                style: bookCircleTextStyle,
            });
            bookClickTextTop.anchor.set(0.5);
            bookClickTextTop.x = 0;
            bookClickTextTop.y = -8; // Position above center

            const bookClickTextBottom = new Text({
                text: 'Explore',
                style: bookCircleTextStyle,
            });
            bookClickTextBottom.anchor.set(0.5);
            bookClickTextBottom.x = 0;
            bookClickTextBottom.y = 8; // Position below center

            bookCircleText.addChild(bookCircleBg);
            bookCircleText.addChild(bookClickTextTop);
            bookCircleText.addChild(bookClickTextBottom);
            bookCircleText.visible = false; // Hidden by default, only shows when dot is hovered
            bookCircleText.eventMode = 'none'; // Allow pointer events to pass through for global tracking
            bookCircleText.cursor = 'default';

            // Add circle text to stage
            app.stage.addChild(bookCircleText);

            // Track global mouse position for circle following
            let bookLastMousePos = { x: 0, y: 0 };
            let bookIsCircleActive = false;

            // Offset to position text at cursor tip (above and to the right of cursor)
            const BOOKCURSOR_TIP_OFFSET_X = 12; // Offset to the right
            const BOOKCURSOR_TIP_OFFSET_Y = -25; // Offset upward (above cursor tip)

            // Function to check if cursor is within dot's bounds
            const isCursorInBookDotBounds = (cursorX, cursorY) => {
                if (!bookDot || !bookDot.parent || !bookDot.userData) {
                    return false;
                }

                const dotX = bookDot.x;
                const dotY = bookDot.y;
                const baseRadius = bookDot.userData.baseRadius || getResponsiveBookDotRadius();
                const maxWaveExpansion = 12.5;
                const tolerance = baseRadius * 0.8;
                const maxDotRadius = baseRadius + maxWaveExpansion + tolerance;

                const dx = cursorX - dotX;
                const dy = cursorY - dotY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                return distance <= maxDotRadius;
            };

            // Function to show circle and activate effects (desktop only)
            const showBookCircle = (cursorX, cursorY) => {
                // Don't show circle text on mobile/tablet - label text is always visible
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    return;
                }

                // Only show if not already active (prevent multiple triggers)
                if (bookIsCircleActive) return;

                bookDot.visible = false;
                bookCircleText.visible = true;
                bookIsCircleActive = true;

                // Show "Community" text animation (slides up from below) - appears when cursor is pointed
                showBookText();

                // Show stroke overlay
                if (bookStrokeSprite && backgroundSprite) {
                    bookStrokeSprite.visible = true;
                    bookStrokeSprite.alpha = 1.0;
                    // Position stroke overlay to match book sprite exactly
                    if (bookSprite) {
                        bookStrokeSprite.x = bookSprite.x;
                        bookStrokeSprite.y = bookSprite.y;
                        bookStrokeSprite.scale.set(bookSprite.scale.x, bookSprite.scale.y);
                    }
                }

                // Position circle at cursor tip (offset so text appears above cursor, not covered by it)
                bookCircleText.x = cursorX + BOOKCURSOR_TIP_OFFSET_X;
                bookCircleText.y = cursorY + BOOKCURSOR_TIP_OFFSET_Y;
            };

            // Function to hide circle and show dot
            const hideBookCircle = () => {
                // Only hide if currently active (prevent multiple triggers)
                if (!bookIsCircleActive) return;

                bookDot.visible = true;
                bookCircleText.visible = false;
                bookIsCircleActive = false;

                // Hide "Community" text animation - vanishes when cursor is not pointed
                hideBookText();

                // Hide stroke overlay
                if (bookStrokeSprite) {
                    bookStrokeSprite.visible = false;
                }
            };

            // Function to update circle and text based on cursor bounds
            const updateBookCircleBasedOnBounds = (cursorX, cursorY) => {
                // Don't show circle text on mobile/tablet - label text is always visible
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    return; // Skip circle text logic on mobile/tablet
                }

                const inBounds = isCursorInBookDotBounds(cursorX, cursorY);

                if (inBounds && !bookIsCircleActive) {
                    // Cursor entered dot bounds - show circle and text
                    showBookCircle(cursorX, cursorY);
                } else if (!inBounds && bookIsCircleActive) {
                    // Cursor left dot bounds - hide circle and text immediately
                    hideBookCircle();
                } else if (!inBounds && bookTextSprite && bookTextSprite.visible) {
                    // Extra safety check: if text is visible but cursor is out of bounds, hide it
                    hideBookText();
                }
            };

            // Global mouse/touch tracking for circle following
            // Handle mouse move (desktop)
            document.addEventListener('mousemove', (e) => {
                const rect = app.canvas.getBoundingClientRect();
                const scaleX = app.canvas.width / rect.width;
                const scaleY = app.canvas.height / rect.height;

                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;

                bookLastMousePos.x = mouseX;
                bookLastMousePos.y = mouseY;

                updateBookCircleBasedOnBounds(mouseX, mouseY);

                // Update circle position if active
                if (bookIsCircleActive) {
                    bookCircleText.x = mouseX + BOOKCURSOR_TIP_OFFSET_X;
                    bookCircleText.y = mouseY + BOOKCURSOR_TIP_OFFSET_Y;
                }
            });

            // Handle touch move (mobile) - important for responsive bounds checking
            document.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches.length > 0) {
                    const rect = app.canvas.getBoundingClientRect();
                    const scaleX = app.canvas.width / rect.width;
                    const scaleY = app.canvas.height / rect.height;

                    const touchX = (e.touches[0].clientX - rect.left) * scaleX;
                    const touchY = (e.touches[0].clientY - rect.top) * scaleY;

                    bookLastMousePos.x = touchX;
                    bookLastMousePos.y = touchY;

                    // Only update if not dragging (to avoid interference with panning)
                    if (!isDragging) {
                        updateBookCircleBasedOnBounds(touchX, touchY);

                        // Update circle position if active
                        if (bookIsCircleActive) {
                            bookCircleText.x = touchX + BOOKCURSOR_TIP_OFFSET_X;
                            bookCircleText.y = touchY + BOOKCURSOR_TIP_OFFSET_Y;
                        }
                    }
                }
            }, { passive: true });

            // Stage pointer move for better tracking within canvas
            app.stage.on('globalpointermove', (e) => {
                const globalPos = e.global;
                bookLastMousePos.x = globalPos.x;
                bookLastMousePos.y = globalPos.y;
                updateBookCircleBasedOnBounds(globalPos.x, globalPos.y);
            });

            // Ticker to continuously check bounds and update circle/text
            app.ticker.add(() => {
                if (bookDot && bookDot.parent) {
                    // Update based on cursor bounds - this controls both circle and text visibility
                    updateBookCircleBasedOnBounds(bookLastMousePos.x, bookLastMousePos.y);

                    // Update circle position if active
                    if (bookIsCircleActive) {
                        bookCircleText.x = bookLastMousePos.x + BOOKCURSOR_TIP_OFFSET_X;
                        bookCircleText.y = bookLastMousePos.y + BOOKCURSOR_TIP_OFFSET_Y;
                    }

                    // Safety check: ensure text is hidden if circle is not active
                    if (!bookIsCircleActive && bookTextSprite && bookTextSprite.visible) {
                        hideBookText();
                    }
                }
            });

            // Touch/click handlers for mobile and desktop
            // Handle pointerdown for better mobile touch support
            bookDot.on('pointerdown', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // On mobile/tablet, don't show circle - just prepare for click
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                    event.stopPropagation(); // Prevent panning from starting
                    return;
                }
                // On desktop, treat as hover
                const globalPos = event.global;
                showBookCircle(globalPos.x, globalPos.y);
                event.stopPropagation(); // Prevent panning from starting
            });

            // Handle pointerup to detect tap/click (works better on mobile)
            bookDot.on('pointerup', (event) => {
                const globalPos = event.global;
                // On mobile/tablet, always redirect on tap
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {

                    window.location.href = 'community.html';
                    event.stopPropagation();
                    return;
                }
                // On desktop, only redirect if in bounds
                if (isCursorInBookDotBounds(globalPos.x, globalPos.y)) {

                    window.location.href = 'community.html';
                }
                event.stopPropagation(); // Prevent panning
            });

            // Also handle pointertap as fallback
            bookDot.on('pointertap', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                // On mobile/tablet, always redirect
                if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {

                    window.location.href = 'community.html';
                    event.stopPropagation();
                    return;
                }
                // On desktop, redirect

                window.location.href = 'community.html';
                event.stopPropagation(); // Prevent panning
            });

            // Also allow clicking on circle text to redirect
            bookCircleText.eventMode = 'static';
            bookCircleText.cursor = 'pointer';

            bookCircleText.on('pointerdown', (event) => {
                event.stopPropagation(); // Prevent panning
            });

            bookCircleText.on('pointerup', (event) => {
                event.stopPropagation(); // Prevent panning
            });

            bookCircleText.on('pointertap', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction

                window.location.href = 'community.html';
                event.stopPropagation(); // Prevent panning
            });

            // Animation state for one-time wobble effect (like cup sprite)
            bookSprite.userData.isOverBook = false;
            bookSprite.userData.isAnimating = false;
            bookSprite.userData.animationTime = 0;
            bookSprite.userData.animationDuration = 0.6; // Same duration as cup
            bookSprite.userData.animationTicker = null;
            
            // CRITICAL: Add pointerdown listener FIRST to unlock audio before pointerenter fires
            bookSprite.on('pointerdown', (event) => {

                enableAudioOnSpriteInteraction(bookMoveSound);
            });

            // Hover animation for book sprite - one-time wobble/tilt when cursor passes (like cup sprite)
            bookSprite.on('pointerenter', (event) => {
                if (!bookSprite.userData) return;
                
                enableAudioOnSpriteInteraction(bookMoveSound); // Enable audio on sprite interaction
                bookSprite.userData.isOverBook = true;
                
                // Play book move sound effect
                playSpriteSound(bookMoveSound);
                
                // Always reset and restart animation when cursor enters (like cup sprite)
                // Reset animation state completely - this ensures animation always restarts
                bookSprite.userData.isAnimating = true;
                bookSprite.userData.animationTime = 0;
                lastBookAnimationTime = Date.now(); // Reset timing for new animation
                
                // Reset rotation to 0 before starting new animation
                bookSprite.rotation = 0;
                if (bookStrokeSprite) {
                    bookStrokeSprite.rotation = 0;
                }
            });

            bookSprite.on('pointerleave', (event) => {
                if (!bookSprite.userData) return;
                
                bookSprite.userData.isOverBook = false;
            });
            
            // Also handle tap/click for mobile devices
            bookSprite.on('pointertap', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                if (!bookSprite.userData) return;
                // Trigger same animation as hover for mobile
                bookSprite.userData.isOverBook = true;
                bookSprite.userData.isAnimating = true;
                bookSprite.userData.animationTime = 0;
                lastBookAnimationTime = Date.now();
                bookSprite.rotation = 0;
                if (bookStrokeSprite) {
                    bookStrokeSprite.rotation = 0;
                }
                playSpriteSound(bookMoveSound);
            });
            
            bookSprite.on('pointerdown', () => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
            });
            
            // Animate book wobble sequence (triggered on hover) - same as cup sprite
            let lastBookAnimationTime = Date.now();
            
            // Use a single ticker that checks animation state (like cup sprite)
            app.ticker.add(() => {
                if (bookSprite && bookSprite.userData) {
                    const data = bookSprite.userData;
                    
                    // Handle wobble animation sequence (one-time animation)
                    if (data.isAnimating) {
                        const now = Date.now();
                        const deltaSeconds = (now - lastBookAnimationTime) / 1000; // Convert to seconds
                        lastBookAnimationTime = now;
                        data.animationTime += deltaSeconds;
                        
                        const progress = Math.min(1, data.animationTime / data.animationDuration);
                        
                        // Wobble animation - subtle movement
                        const maxTilt = 3; // Reduced to 8 degrees for more subtle movement
                        const wobbleFrequency = 3; // How many wobbles during the animation
                        // Fade out the wobble as animation progresses (ease out)
                        const fadeOut = 1 - Math.pow(progress, 2); // Ease out curve
                        const wobbleAmount = Math.sin(progress * Math.PI * wobbleFrequency) * maxTilt * fadeOut;
                        const targetRotation = (wobbleAmount * Math.PI) / 180; // Convert to radians
                        
                        // Apply wobble rotation (position stays fixed)
                        const rotationSpeed = 0.4;
                        const rotationDiff = targetRotation - bookSprite.rotation;
                        bookSprite.rotation += rotationDiff * rotationSpeed;
                        
                        // Update stroke sprite rotation to match
                        if (bookStrokeSprite) {
                            bookStrokeSprite.rotation = bookSprite.rotation;
                        }
                        
                        // Animation complete
                        if (progress >= 1) {
                            data.isAnimating = false;
                            // Reset rotation to 0 immediately (like cup sprite)
                            bookSprite.rotation = 0;
                            if (bookStrokeSprite) {
                                bookStrokeSprite.rotation = 0;
                            }
                        }
                    } else {
                        // Reset rotation when not animating (like cup sprite)
                        if (Math.abs(bookSprite.rotation) > 0.001) {
                            bookSprite.rotation = 0;
                            if (bookStrokeSprite) {
                                bookStrokeSprite.rotation = 0;
                            }
                        }
                    }
                }
            });

            // Update dot size on window resize
            window.addEventListener('resize', () => {
                updateBookDotSize();
            });

        } catch (error) {
            // Error loading Book textures
        }

        // Load Screen sprite (screen.png)
        try {

            const screenTexture = await loadAssetWithProgress('assets/screen.png');

            // Create Sprite from the screen texture
            screenSprite = new Sprite(screenTexture);
            screenSprite.anchor.set(0.5);
            screenSprite.x = 0; // Position at container origin
            screenSprite.y = 0; // Position at container origin
            screenSprite.visible = false; // Hide sprite - replaced by YouTube video
            screenSprite.alpha = 0;

            // Create a Container to hold the screen sprite
            screenContainer = new Container();
            screenContainer.addChild(screenSprite);

            // Get screen image dimensions
            const screenImageWidth = screenTexture.orig?.width || screenTexture.width || screenTexture.baseTexture.width || 1920;
            const screenImageHeight = screenTexture.orig?.height || screenTexture.height || screenTexture.baseTexture.height || 1080;

            // Screen config
            // Position on bg1.png:
            // Top Y: 1796px, Left X: 2089px
            // Bottom Y: 2502px, Right X: 3205px
            // Center X: (2089 + 3205) / 2 = 2647
            // Center Y: (1796 + 2502) / 2 = 2149
            // Dimensions: Width: 1116px, Height: 706px
            const screenConfig = {
                bg1X: 2647, // Center X position on bg1.png
                bg1Y: 2149, // Center Y position on bg1.png
                screenWidth: 1116, // Width of screen on bg1.png
                screenHeight: 706, // Height of screen on bg1.png
                scale: null, // Will be calculated based on bg1 scale
                offsetX: 0,
                offsetY: 0
            };

            // Calculate scale to make screen image fit into designated space on bg1.png
            if (screenImageWidth && screenImageHeight && screenConfig.screenWidth && screenConfig.screenHeight) {
                // Scale screenWidth/screenHeight proportionally based on image optimization
                const imageScaleFactorX = imageWidth / ORIGINAL_IMAGE_WIDTH;
                const imageScaleFactorY = imageHeight / ORIGINAL_IMAGE_HEIGHT;
                const scaledScreenWidth = screenConfig.screenWidth * imageScaleFactorX;
                const scaledScreenHeight = screenConfig.screenHeight * imageScaleFactorY;
                
                const relativeScaleX = scaledScreenWidth / screenImageWidth;
                const relativeScaleY = scaledScreenHeight / screenImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                screenConfig.scale = Math.min(relativeScaleX, relativeScaleY);

            } else {
                // Fallback: use natural size
                screenConfig.scale = 1.0;
                // Screen: Could not calculate scale, using default
            }

            // Store config in userData for screen container (we'll use container for positioning)
            screenContainer.userData = screenContainer.userData || {};
            screenContainer.userData.config = screenConfig;
            screenContainer.userData.baseScale = 1.0; // Will be set after first resizeBackground call
            screenContainer.visible = false; // Hide container initially
            
            // Set zIndex to be at same level as book and YouTube video (below instructions)
            screenContainer.zIndex = 1;

            // Add screen container to stage
            app.stage.addChild(screenContainer);

            // Move screen container to appear below text sprites (MUTATOR, COMMUNITY, OUR TEAM)
            // Find the index of the first text sprite and move screen container before it
            const mutatorTextIndex = app.stage.children.indexOf(mutatorCapsuleTextSprite);
            if (mutatorTextIndex !== -1) {
                // Move screen container to appear right before the first text sprite
                app.stage.setChildIndex(screenContainer, mutatorTextIndex);
            } else {
                // Fallback: if mutator text not found, try to place after background sprite
                const bgIndex = app.stage.children.indexOf(backgroundSprite);
                if (bgIndex !== -1) {
                    app.stage.setChildIndex(screenContainer, bgIndex + 1);
                }
            }

            // Create YouTube video iframe to replace the screen
            createYouTubeVideoOverlay();

        } catch (error) {
            // Error loading Screen texture
        }

        // Load lights_off.png with swinging animation
        try {

            lightsOffTexture = await loadAssetWithProgress('/assets/lights_off.png'); // Store globally for toggling

            // Get lights_off actual dimensions
            const lightsOffImageWidth = lightsOffTexture.orig?.width || lightsOffTexture.width || lightsOffTexture.baseTexture.width;
            const lightsOffImageHeight = lightsOffTexture.orig?.height || lightsOffTexture.height || lightsOffTexture.baseTexture.height;

            // Lights off positioning and sizing config
            // Position on bg1.png (in pixels):
            // Left X: 2329, Right X: 3000, Top Y: 0, Bottom Y: 1086
            // Center X: (2329 + 3000) / 2 = 2664.5
            // Center Y: (0 + 1086) / 2 = 543
            // Dimensions: width: 672 pixels, height: 1087 pixels (on bg1.png)
            const lightsOffConfig = {
                // Lights off dimensions (on bg1.png coordinate space)
                lightsOffWidth: 672,
                lightsOffHeight: 1087,

                // Position on bg1.png (center of lights off)
                bg1X: 2664.5, // Center X position on bg1.png
                bg1Y: 543, // Center Y position on bg1.png

                // Scale: calculated to make lights off fit its designated space on bg1.png
                scale: 1.0, // Will be calculated below

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make lights off image fit into designated space on bg1.png
            if (lightsOffImageWidth && lightsOffImageHeight && lightsOffConfig.lightsOffWidth && lightsOffConfig.lightsOffHeight) {
                const relativeScaleX = lightsOffConfig.lightsOffWidth / lightsOffImageWidth;
                const relativeScaleY = lightsOffConfig.lightsOffHeight / lightsOffImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                const calculatedScale = Math.min(relativeScaleX, relativeScaleY);
                lightsOffConfig.scale = calculatedScale;
            } else {
                lightsOffConfig.scale = 1.0; // Fallback
            }

            // Create sprite
            lightsOffSprite = new Sprite(lightsOffTexture);
            // Anchor at top center (0.5, 0) so it swings from the top like a pendulum
            lightsOffSprite.anchor.set(0.5, 0);

            // Store config in userData for use in resizeBackground
            lightsOffSprite.userData = lightsOffSprite.userData || {};
            lightsOffSprite.userData.config = lightsOffConfig;
            lightsOffSprite.userData.swingTime = 0; // Time counter for swinging animation
            lightsOffSprite.userData.isLightsOn = false; // Track current state (false = off, true = on)

            // Hide sprite initially until resizeBackground positions it correctly
            lightsOffSprite.visible = false;
            lightsOffSprite.alpha = 1.0;

            // Set initial position (will be updated by resizeBackground)
            lightsOffSprite.x = app.screen.width / 2;
            lightsOffSprite.y = app.screen.height / 2;

            // Add to stage
            app.stage.addChild(lightsOffSprite);

            // Tap-to-bounce animation variables (no natural swing)
            let previousPointerX = null;
            let previousPointerTime = null;
            let currentRotation = 0; // Current rotation angle in degrees
            let rotationVelocity = 0; // Angular velocity (degrees per frame)
            let isPointerOverLights = false;
            
            // Make lights sprite interactive to track cursor movement
            lightsOffSprite.eventMode = 'static';
            lightsOffSprite.cursor = 'default';
            
            // Track pointer movement for tap-to-bounce
            lightsOffSprite.on('pointerenter', (event) => {
                enableAudioOnSpriteInteraction(); // Enable audio on sprite interaction
                isPointerOverLights = true;
                const globalPos = event.global;
                previousPointerX = globalPos.x;
                previousPointerTime = Date.now();
            });
            
            lightsOffSprite.on('pointermove', (event) => {
                if (!isPointerOverLights) return;
                
                const globalPos = event.global;
                const currentPointerX = globalPos.x;
                const currentTime = Date.now();
                
                if (previousPointerX !== null && previousPointerTime !== null) {
                    // Calculate swipe direction and speed
                    const deltaX = currentPointerX - previousPointerX;
                    const deltaTime = currentTime - previousPointerTime;
                    
                    // Prevent division by zero
                    const clampedDeltaTime = Math.max(1, Math.min(100, deltaTime));
                    const swipeSpeed = deltaX / clampedDeltaTime; // pixels per millisecond
                    
                    // IMPORTANT: Cursor direction directly pushes swing direction
                    // Right to left cursor movement (negative deltaX) -> push lights LEFT (negative rotation/angle)
                    // Left to right cursor movement (positive deltaX) -> push lights RIGHT (positive rotation/angle)
                    
                    // Convert swipe speed to rotation velocity (stronger spring effect)
                    const velocityMultiplier = 1.2; // Increased from 0.6 - stronger push response
                    const maxVelocity = 15; // Increased from 8 - allows bigger bounces
                    
                    // Calculate velocity change: cursor direction directly pushes rotation direction
                    // Right to left (negative deltaX) -> negative velocity -> rotate left (negative angle)
                    // Left to right (positive deltaX) -> positive velocity -> rotate right (positive angle)
                    const velocityChange = Math.max(-maxVelocity, Math.min(maxVelocity, swipeSpeed * velocityMultiplier * 0.01));
                    
                    // Add velocity in the direction of cursor push (stronger spring push)
                    rotationVelocity += velocityChange;
                }
                
                previousPointerX = currentPointerX;
                previousPointerTime = currentTime;
            });
            
            lightsOffSprite.on('pointerleave', () => {
                isPointerOverLights = false;
                previousPointerX = null;
                previousPointerTime = null;
            });

            // Bounce-back animation with strong spring effect (no natural swing, only responds to taps)
            app.ticker.add(() => {
                if (lightsOffSprite && lightsOffSprite.visible && lightsOffSprite.parent) {
                    // Strong spring physics for pronounced bounce-back effect
                    const springStrength = 0.25; // Increased from 0.15 - stronger spring pull back to center
                    const damping = 0.88; // Reduced from 0.92 - less damping for more bouncy effect
                    const maxRotationAngle = 60; // Maximum rotation angle in degrees
                    
                    // Apply strong spring force (pulls back to center position with more force)
                    const springForce = -currentRotation * springStrength;
                    rotationVelocity += springForce;
                    
                    // Apply damping (less damping = more bouncy, oscillates more)
                    rotationVelocity *= damping;
                    
                    // Update rotation based on velocity
                    currentRotation += rotationVelocity;
                    
                    // Limit rotation angle
                    currentRotation = Math.max(-maxRotationAngle, Math.min(maxRotationAngle, currentRotation));
                    
                    // Convert to radians and apply rotation
                    lightsOffSprite.rotation = (currentRotation * Math.PI) / 180;
                    
                    // Stop very small movements to prevent jitter
                    if (Math.abs(rotationVelocity) < 0.01 && Math.abs(currentRotation) < 0.1) {
                        rotationVelocity = 0;
                        currentRotation = 0;
                    }
                }
            });

            // Call resizeBackground to position lights off correctly (after it's already added to stage)
            resizeBackground();

            // Make visible immediately after positioning
            lightsOffSprite.visible = true;

        } catch (error) {
            // Error loading lights_off texture
        }

        // Load lights_switch.png with swinging animation and lights_on.png for switching
        try {

            const lightsSwitchTexture = await loadAssetWithProgress('/assets/lights_switch.png');
            lightsOnTexture = await loadAssetWithProgress('/assets/lights_on.png'); // Preload lights_on for switching

            // Get lights_switch actual dimensions
            const lightsSwitchImageWidth = lightsSwitchTexture.orig?.width || lightsSwitchTexture.width || lightsSwitchTexture.baseTexture.width;
            const lightsSwitchImageHeight = lightsSwitchTexture.orig?.height || lightsSwitchTexture.height || lightsSwitchTexture.baseTexture.height;

            // Lights switch positioning and sizing config
            // Position on bg1.png (in pixels):
            // Left X: 3140, Right X: 3248, Top Y: 0, Bottom Y: 842
            // Center X: (3140 + 3248) / 2 = 3194
            // Center Y: (0 + 842) / 2 = 421
            // Dimensions: width: 109 pixels, height: 843 pixels (on bg1.png)
            const lightsSwitchConfig = {
                // Lights switch dimensions (on bg1.png coordinate space)
                lightsSwitchWidth: 109,
                lightsSwitchHeight: 843,

                // Position on bg1.png (center of lights switch)
                bg1X: 3194, // Center X position on bg1.png
                bg1Y: 421, // Center Y position on bg1.png

                // Scale: calculated to make lights switch fit its designated space on bg1.png
                scale: 1.0, // Will be calculated below

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make lights switch image fit into designated space on bg1.png
            if (lightsSwitchImageWidth && lightsSwitchImageHeight && lightsSwitchConfig.lightsSwitchWidth && lightsSwitchConfig.lightsSwitchHeight) {
                const relativeScaleX = lightsSwitchConfig.lightsSwitchWidth / lightsSwitchImageWidth;
                const relativeScaleY = lightsSwitchConfig.lightsSwitchHeight / lightsSwitchImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                const calculatedScale = Math.min(relativeScaleX, relativeScaleY);
                lightsSwitchConfig.scale = calculatedScale;
            } else {
                lightsSwitchConfig.scale = 1.0; // Fallback
            }

            // Create sprite
            lightsSwitchSprite = new Sprite(lightsSwitchTexture);
            // Anchor at top center (0.5, 0) so it swings from the top like a pendulum
            lightsSwitchSprite.anchor.set(0.5, 0);

            // Load light switch sound effect
            lightSwitchSound = new Audio('/assets/sounds/light_switch.mp3');
            lightSwitchSound.volume = 0.7; // Set volume (70%)
            lightSwitchSound.preload = 'auto';
            // Start unmuted - can play instantly when triggered
            lightSwitchSound.muted = false;
            // Don't mute initially - let it play even if bg music is muted for autoplay
            // It will sync after user interaction
            lightSwitchSound.muted = false;
            
            // Handle audio errors
            lightSwitchSound.addEventListener('error', (e) => {
                // Could not load light switch sound
            });

            // Store config in userData for use in resizeBackground
            lightsSwitchSprite.userData = lightsSwitchSprite.userData || {};
            lightsSwitchSprite.userData.config = lightsSwitchConfig;
            lightsSwitchSprite.userData.swingTime = 0; // Time counter for swinging animation

            // Hide sprite initially until resizeBackground positions it correctly
            lightsSwitchSprite.visible = false;
            lightsSwitchSprite.alpha = 1.0;

            // Set initial position (will be updated by resizeBackground)
            lightsSwitchSprite.x = app.screen.width / 2;
            lightsSwitchSprite.y = app.screen.height / 2;

            // Make it interactive
            lightsSwitchSprite.eventMode = 'static';
            lightsSwitchSprite.cursor = 'pointer';

            // Add pointer enter handler to toggle between lights_off and lights_on
            // Use a flag to prevent double-toggling from rapid pointer movements
            let isToggling = false;
            let hasTriggered = false; // Track if we've already triggered on this hover
            
            // Rope-like animation variables (smooth rope swing physics)
            let previousPointerX = null;
            let previousPointerTime = null; // Track time for swipe speed calculation
            let currentRopeRotation = 0; // Current rotation (angle in degrees)
            let ropeVelocity = 0; // Angular velocity for smooth rope swing (degrees per frame)
            let isPointerOver = false;
            let ropeMomentum = 0; // Momentum accumulated from swipes
            
            const toggleLights = () => {
                // Prevent double-toggling
                if (isToggling) {

                    return;
                }
                
                isToggling = true;

                // Play light switch sound effect
                playSpriteSound(lightSwitchSound);
                
                if (lightsOffSprite && lightsOffTexture && lightsOnTexture) {
                    // Toggle the texture based on current state
                    const currentState = lightsOffSprite.userData.isLightsOn || false;
                    
                    if (currentState) {
                        // Currently on, switch to off
                        lightsOffSprite.texture = lightsOffTexture;
                        lightsOffSprite.userData.isLightsOn = false;
                        // Hide lights ray when lights are off
                        if (lightsRaySprite) {
                            lightsRaySprite.visible = false;
                        }

                    } else {
                        // Currently off, switch to on
                        lightsOffSprite.texture = lightsOnTexture;
                        lightsOffSprite.userData.isLightsOn = true;
                        // Show lights ray when lights are on
                        if (lightsRaySprite) {
                            lightsRaySprite.visible = true;
                        }

                    }
                } else {
                    // Cannot toggle lights
                }
                
                // Reset flag after a short delay
                setTimeout(() => {
                    isToggling = false;
                }, 100);
            };

            // Trigger on pointer enter (hover)
            lightsSwitchSprite.on('pointerenter', async (event) => {
                // Enable audio FIRST before playing switch sound
                await enableAudioOnSpriteInteraction();
                event.stopPropagation(); // Prevent panning
                isPointerOver = true;
                
                // Get initial pointer position and time
                const globalPos = event.global;
                previousPointerX = globalPos.x;
                previousPointerTime = Date.now();
                
                // Smooth transition - don't apply sudden velocity changes on enter
                // Reset velocity slightly to prevent glitches from previous state
                ropeVelocity *= 0.7;
                
                if (!hasTriggered) {
                    hasTriggered = true;
                    toggleLights();
                }
            });

            // Track pointer movement for smooth rope swing animation
            lightsSwitchSprite.on('pointermove', (event) => {
                if (!isPointerOver) return;
                
                event.stopPropagation();
                const globalPos = event.global;
                const currentPointerX = globalPos.x;
                const currentTime = Date.now();
                
                if (previousPointerX !== null && previousPointerTime !== null) {
                    // Calculate direction and distance: positive = moving right, negative = moving left
                    const deltaX = currentPointerX - previousPointerX;
                    const deltaTime = currentTime - previousPointerTime;
                    
                    // Prevent division by zero and handle very small time deltas
                    const clampedDeltaTime = Math.max(1, Math.min(100, deltaTime));
                    
                    // Calculate swipe speed and add momentum to rope swing
                    if (Math.abs(deltaX) > 0.1) {
                        const swipeSpeed = deltaX / clampedDeltaTime; // pixels per millisecond
                        
                        // Convert swipe speed to angular momentum for smooth rope swing
                        // Swipe left (negative) -> swing left, Swipe right (positive) -> swing right
                        const momentumMultiplier = 0.8; // How much swipe momentum transfers to rope
                        const maxMomentum = 15; // Maximum swing momentum
                        
                        // Add momentum in the direction of swipe (creates smooth swing)
                        const swipeMomentum = Math.max(-maxMomentum, Math.min(maxMomentum, swipeSpeed * momentumMultiplier));
                        
                        // Accumulate momentum for smooth, continuous swing
                        // The faster you swipe, the more momentum the rope gets
                        ropeMomentum = ropeMomentum * 0.7 + swipeMomentum * 0.3; // Smooth momentum accumulation
                        
                        // Apply momentum to velocity for immediate swing response
                        ropeVelocity += swipeMomentum * 0.5;
                    }
                }
                
                previousPointerX = currentPointerX;
                previousPointerTime = currentTime;
            });

            // Reset trigger flag and rope animation when pointer leaves
            lightsSwitchSprite.on('pointerleave', (event) => {
                event.stopPropagation(); // Prevent panning
                isPointerOver = false;
                hasTriggered = false;
                previousPointerX = null;
                previousPointerTime = null;
                ropeMomentum = 0; // Reset momentum
                // Keep velocity for smooth swing continuation (gravity will bring it back to center)
            });

            // Also handle tap/click for mobile devices
            lightsSwitchSprite.on('pointertap', async (event) => {
                // Enable audio FIRST before playing switch sound
                await enableAudioOnSpriteInteraction();
                event.stopPropagation(); // Prevent panning
                if (!hasTriggered) {
                    hasTriggered = true;
                    toggleLights();
                }
            });
            
            lightsSwitchSprite.on('pointerdown', async (event) => {
                // Enable audio FIRST before playing switch sound
                await enableAudioOnSpriteInteraction();
                event.stopPropagation(); // Prevent panning
            });

            // Add to stage
            app.stage.addChild(lightsSwitchSprite);

            // Smooth rope swing animation - pendulum physics with momentum from swipes
            app.ticker.add(() => {
                if (lightsSwitchSprite && lightsSwitchSprite.visible && lightsSwitchSprite.parent) {
                    // Smooth rope pendulum physics
                    const gravity = 0.12; // Gravity effect (pulls rope back to center, like a pendulum)
                    const damping = 0.96; // Air resistance/damping (higher = smoother, less bouncy)
                    const maxRotation = 3; // Maximum swing angle (limited to 3 degrees)
                    
                    // Apply gravity (pendulum effect - pulls rope back to center)
                    // Gravity is proportional to current angle (like a real pendulum)
                    const gravityForce = -currentRopeRotation * gravity;
                    ropeVelocity += gravityForce;
                    
                    // Apply momentum from swipes (when cursor is over)
                    if (isPointerOver && Math.abs(ropeMomentum) > 0.1) {
                        // Add momentum to velocity for smooth swing
                        ropeVelocity += ropeMomentum * 0.15;
                        // Decay momentum over time
                        ropeMomentum *= 0.85;
                    }
                    
                    // Apply damping (air resistance - smooth deceleration)
                    ropeVelocity *= damping;
                    
                    // Apply velocity to rotation (smooth swing motion)
                    currentRopeRotation += ropeVelocity;
                    
                    // Clamp rotation to prevent extreme values
                    if (Math.abs(currentRopeRotation) > maxRotation) {
                        currentRopeRotation = Math.sign(currentRopeRotation) * maxRotation;
                        ropeVelocity *= 0.6; // Bounce back when hitting limit (like rope hitting end)
                    }
                    
                    // Apply rotation (smooth rope swing)
                    // Swipe left -> swings left, Swipe right -> swings right
                    lightsSwitchSprite.rotation = (currentRopeRotation * Math.PI) / 180;
                }
            });

            // Call resizeBackground to position lights switch correctly (after it's already added to stage)
            resizeBackground();

            // Make visible immediately after positioning
            lightsSwitchSprite.visible = true;

        } catch (error) {
            // Error loading lights_switch texture
        }

        // Load lights_ray.png with color dodge blending (appears when lights are on)
        // Using separate canvas with CSS mix-blend-mode for color dodge effect
        try {

            const lightsRayTexture = await loadAssetWithProgress('/assets/lights_ray.png');

            // Get lights_ray actual dimensions
            const lightsRayImageWidth = lightsRayTexture.orig?.width || lightsRayTexture.width || lightsRayTexture.baseTexture.width;
            const lightsRayImageHeight = lightsRayTexture.orig?.height || lightsRayTexture.height || lightsRayTexture.baseTexture.height;

            // Create a separate PIXI application for the lights ray sprite layer to use CSS blend modes
            lightsRayApp = new Application();
            await lightsRayApp.init({
                background: 0x000000,
                backgroundAlpha: 0,
                resizeTo: window,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                antialias: true
            });

            // Ensure ticker continues even when tab is hidden
            lightsRayApp.ticker.stopOnMinimize = false;

            // Create sprite from lights_ray texture
            lightsRaySprite = new Sprite(lightsRayTexture);
            lightsRaySprite.anchor.set(0.5);

            // Hide sprite initially (only shows when lights are on)
            lightsRaySprite.visible = false;
            lightsRaySprite.alpha = 1.0;

            // Add sprite to the separate app
            lightsRayApp.stage.addChild(lightsRaySprite);

            // Get the sprite canvas and apply CSS blend mode
            const lightsRayCanvas = lightsRayApp.canvas;
            lightsRayCanvas.style.position = 'absolute';
            lightsRayCanvas.style.top = '0';
            lightsRayCanvas.style.left = '0';
            lightsRayCanvas.style.mixBlendMode = 'color-dodge';
            lightsRayCanvas.style.pointerEvents = 'none';
            lightsRayCanvas.style.zIndex = '1'; // Ensure it's above the main canvas

            // Add lights ray canvas to the container (same container as main app)
            const container = document.getElementById('canvas-container');
            if (container) {
                container.appendChild(lightsRayCanvas);

            }

            // Lights ray positioning and sizing config
            // Position on bg1.png (in pixels):
            // Left X: 722, Right X: 5164, Top Y: 583, Bottom Y: 3125
            // Center X: (722 + 5164) / 2 = 2943
            // Center Y: (583 + 3125) / 2 = 1854
            // Dimensions: width: 4442 pixels, height: 2543 pixels (on bg1.png)
            const lightsRayConfig = {
                // Lights ray dimensions (on bg1.png coordinate space)
                lightsRayWidth: 4442,
                lightsRayHeight: 2543,

                // Position on bg1.png (center of lights ray)
                bg1X: 2943, // Center X position on bg1.png
                bg1Y: 1854, // Center Y position on bg1.png

                // Scale: calculated to make lights ray fit its designated space on bg1.png
                scale: 1.0, // Will be calculated below

                // Fine-tuning offsets
                offsetX: 0, // Additional offset in pixels (positive = right, negative = left)
                offsetY: 0, // Additional offset in pixels (positive = down, negative = up)
            };

            // Calculate scale to make lights ray image fit into designated space on bg1.png
            if (lightsRayImageWidth && lightsRayImageHeight && lightsRayConfig.lightsRayWidth && lightsRayConfig.lightsRayHeight) {
                const relativeScaleX = lightsRayConfig.lightsRayWidth / lightsRayImageWidth;
                const relativeScaleY = lightsRayConfig.lightsRayHeight / lightsRayImageHeight;

                // Use the smaller scale to ensure it fits (maintains aspect ratio)
                lightsRayConfig.scale = Math.min(relativeScaleX, relativeScaleY);
            } else {
                // Fallback: use natural size
                lightsRayConfig.scale = 1.0;
            }

            // Store config in userData for lights ray sprite
            lightsRaySprite.userData = lightsRaySprite.userData || {};
            lightsRaySprite.userData.config = lightsRayConfig;

            // Position immediately using resizeBackground to ensure correct positioning
            if (backgroundSprite && imageWidth && imageHeight) {
                // Call resizeBackground to position all sprites correctly
                resizeBackground();

                // Set initial visibility based on lights state (default is off, so hidden)
                lightsRaySprite.visible = false;

            } else {
                // If background not ready yet, make invisible until resizeBackground is called
                lightsRaySprite.visible = false;

            }

        } catch (error) {
            // Error loading lights_ray texture
        }

        // Position all sprites BEFORE showing them (ensures correct positioning during loading screen)
        // This is critical: all sprites must be positioned correctly BEFORE the loading screen ends
        resizeBackground();

        // Show all sprites after resizeBackground positions them correctly (prevents flash of incorrect positioning)
        // IMPORTANT: All sprites are positioned BEFORE the loading screen fades out
        if (backgroundSprite) {
            backgroundSprite.visible = true;
        }
        if (mutatorBgSprite) {
            mutatorBgSprite.visible = true;
        }
        if (mutatorCapsuleSprite) {
            mutatorCapsuleSprite.visible = true;
        }
        if (cupSprite) {
            cupSprite.visible = true;
        }
        if (glitchSprite) {
            glitchSprite.visible = true;
        }
        if (eyeLogoSprite) {
            eyeLogoSprite.visible = true;
        }
        if (cctvSprite) {
            cctvSprite.visible = true;
        }
        if (discordSprite) {
            // Ensure Discord is positioned correctly before making it visible
            // resizeBackground() was already called above, so Discord should be at correct position
            if (discordSprite.userData && discordSprite.userData.config) {
                // Double-check position is set correctly
                const discordConfig = discordSprite.userData.config;
                if (backgroundSprite && imageWidth && imageHeight) {
                    const scale = currentScale || backgroundSprite.scale.x || 1;
                    // Convert bg1.png coordinates to world coordinates - same as working sprites
                    // Calculate effective displayed dimensions based on ORIGINAL image dimensions
                    const effectiveDims = getEffectiveDisplayedDimensions();
                    const effectiveDisplayedWidth = effectiveDims.width;
                    const effectiveDisplayedHeight = effectiveDims.height;
                    const bg1LeftEffective = backgroundSprite.x - effectiveDisplayedWidth / 2;
                    const bg1TopEffective = backgroundSprite.y - effectiveDisplayedHeight / 2;
                    // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                    const normalizedX = discordConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                    const normalizedY = discordConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                    discordSprite.x = bg1LeftEffective + (normalizedX * effectiveDisplayedWidth) + discordConfig.offsetX;
                    discordSprite.y = bg1TopEffective + (normalizedY * effectiveDisplayedHeight) + discordConfig.offsetY;

                }
            }
            discordSprite.visible = true;
        }
        if (promoSprite) {
            // Ensure Promo is positioned correctly before making it visible
            // resizeBackground() was already called above, but we double-check position here
            // This ensures Promo is at the correct position BEFORE the loading screen ends
            if (promoSprite.userData && promoSprite.userData.config) {
                const promoConfig = promoSprite.userData.config;
                if (backgroundSprite && imageWidth && imageHeight) {
                    const scale = currentScale || backgroundSprite.scale.x || 1;
                    // Convert bg1.png coordinates to world coordinates
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;
                    const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                    const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                    // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                    const normalizedX = promoConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                    const normalizedY = promoConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                    promoSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + promoConfig.offsetX;
                    promoSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + promoConfig.offsetY;

                    // Ensure scale is set correctly
                    if (promoConfig.scale !== null && promoConfig.scale !== undefined) {
                        const promoScale = promoConfig.scale * scale;
                        promoSprite.scale.set(promoScale);
                    } else {
                        promoSprite.scale.set(scale);
                    }

                }
            } else if (promoSprite && backgroundSprite) {
                // Fallback: position at background center if config is missing
                promoSprite.x = backgroundSprite.x;
                promoSprite.y = backgroundSprite.y;
            }
            // Make visible - this ensures Promo appears at correct position on first load
            promoSprite.visible = true;
        }
        if (telegramSprite) {
            // Ensure Telegram is positioned correctly before making it visible
            // resizeBackground() was already called above, but we double-check position here
            // This ensures Telegram is at the correct position BEFORE the loading screen ends
            if (telegramSprite.userData && telegramSprite.userData.config && backgroundSprite) {
                const telegramConfig = telegramSprite.userData.config;
                const imageWidth = backgroundSprite.texture?.width || 1920;
                const imageHeight = backgroundSprite.texture?.height || 1080;
                const scale = backgroundSprite.scale?.x || 1.0;

                // Convert bg1.png coordinates to world coordinates
                const bg1DisplayedWidth = imageWidth * scale;
                const bg1DisplayedHeight = imageHeight * scale;
                const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                const normalizedX = telegramConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                const normalizedY = telegramConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;

                telegramSprite.x = bg1Left + (normalizedX * bg1DisplayedWidth) + telegramConfig.offsetX;
                telegramSprite.y = bg1Top + (normalizedY * bg1DisplayedHeight) + telegramConfig.offsetY;

            } else if (telegramSprite && backgroundSprite) {
                // Fallback: position at background center if config is missing
                telegramSprite.x = backgroundSprite.x;
                telegramSprite.y = backgroundSprite.y;
            }
            // Make visible - this ensures Telegram appears at correct position on first load
            telegramSprite.visible = true;
        }
        if (wallArtSprite) {
            wallArtSprite.visible = true;
        }
        if (bookSprite) {
            bookSprite.visible = true;
        }
        if (lightsOffSprite) {
            // Ensure Lights off is positioned correctly before making it visible
            if (lightsOffSprite.userData && lightsOffSprite.userData.config) {
                const lightsOffConfig = lightsOffSprite.userData.config;
                if (backgroundSprite && imageWidth && imageHeight) {
                    const scale = currentScale || backgroundSprite.scale.x || 1;
                    // Convert bg1.png coordinates to world coordinates - same as working sprites
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;
                    const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                    const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                    // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                    const normalizedX = lightsOffConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                    const normalizedY = lightsOffConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                    
                    // Calculate center position
                    const centerX = bg1Left + (normalizedX * bg1DisplayedWidth) + lightsOffConfig.offsetX;
                    const centerY = bg1Top + (normalizedY * bg1DisplayedHeight) + lightsOffConfig.offsetY;
                    
                    // Since anchor is at (0.5, 0), adjust Y to position the top correctly
                    const lightsOffHeight = lightsOffSprite.texture?.orig?.height || lightsOffSprite.texture?.height || 1087;
                    const scaledHeight = lightsOffHeight * lightsOffSprite.scale.y;
                    
                    lightsOffSprite.x = centerX;
                    lightsOffSprite.y = centerY - scaledHeight / 2;

                }
            } else if (lightsOffSprite && backgroundSprite) {
                // Fallback: position at background center if config is missing
                lightsOffSprite.x = backgroundSprite.x;
                lightsOffSprite.y = backgroundSprite.y;
            }
            // Make visible - this ensures Lights off appears at correct position on first load
            lightsOffSprite.visible = true;
        }
        if (lightsSwitchSprite) {
            // Ensure Lights switch is positioned correctly before making it visible
            if (lightsSwitchSprite.userData && lightsSwitchSprite.userData.config) {
                const lightsSwitchConfig = lightsSwitchSprite.userData.config;
                if (backgroundSprite && imageWidth && imageHeight) {
                    const scale = currentScale || backgroundSprite.scale.x || 1;
                    // Convert bg1.png coordinates to world coordinates - same as working sprites
                    const bg1DisplayedWidth = imageWidth * scale;
                    const bg1DisplayedHeight = imageHeight * scale;
                    const bg1Left = backgroundSprite.x - bg1DisplayedWidth / 2;
                    const bg1Top = backgroundSprite.y - bg1DisplayedHeight / 2;
                    // Normalize coordinates using ORIGINAL image dimensions (accounts for CDN optimization)
                    const normalizedX = lightsSwitchConfig.bg1X / ORIGINAL_IMAGE_WIDTH;
                    const normalizedY = lightsSwitchConfig.bg1Y / ORIGINAL_IMAGE_HEIGHT;
                    
                    // Calculate center position
                    const centerX = bg1Left + (normalizedX * bg1DisplayedWidth) + lightsSwitchConfig.offsetX;
                    const centerY = bg1Top + (normalizedY * bg1DisplayedHeight) + lightsSwitchConfig.offsetY;
                    
                    // Since anchor is at (0.5, 0), adjust Y to position the top correctly
                    const lightsSwitchHeight = lightsSwitchSprite.texture?.orig?.height || lightsSwitchSprite.texture?.height || 843;
                    const scaledHeight = lightsSwitchHeight * lightsSwitchSprite.scale.y;
                    
                    lightsSwitchSprite.x = centerX;
                    lightsSwitchSprite.y = centerY - scaledHeight / 2;

                }
            } else if (lightsSwitchSprite && backgroundSprite) {
                // Fallback: position at background center if config is missing
                lightsSwitchSprite.x = backgroundSprite.x;
                lightsSwitchSprite.y = backgroundSprite.y;
            }
            // Make visible - this ensures Lights switch appears at correct position on first load
            lightsSwitchSprite.visible = true;
        }
        // Show dots after everything is positioned correctly
        if (mutatorCapsuleDot) {
            // Check if mobile/tablet - if so, show label text below dot (keep dot visible)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                // On mobile/tablet: show dot and simple label text below it (no stroke, no animation speed change, no circle text)
                mutatorCapsuleDot.visible = true; // Keep dot visible
                if (mutatorCapsuleLabelText) {
                    mutatorCapsuleLabelText.x = mutatorCapsuleDot.x;
                    mutatorCapsuleLabelText.y = mutatorCapsuleDot.y + 40; // Position label below dot
                    mutatorCapsuleLabelText.visible = true;
                }
                // Don't show stroke overlay, speed up animation, or circle text on mobile/tablet
            } else {
                // On desktop: show dot normally (hover to see "Click To Explore" circle text with stroke)
                mutatorCapsuleDot.visible = true;
                if (mutatorCapsuleLabelText) {
                    mutatorCapsuleLabelText.visible = false; // Hide label on desktop
                }
            }
        }
        if (cctvDot) {
            // Check if mobile/tablet - if so, show label text below dot (keep dot visible)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                // On mobile/tablet: show dot and simple label text below it (no stroke, no circle text)
                cctvDot.visible = true; // Keep dot visible
                if (cctvLabelText) {
                    cctvLabelText.x = cctvDot.x;
                    cctvLabelText.y = cctvDot.y + 40; // Position label below dot
                    cctvLabelText.visible = true;
                }
                // Don't show stroke overlay or circle text on mobile/tablet
            } else {
                // On desktop: show dot normally (hover to see "Click To Explore" circle text with stroke)
                cctvDot.visible = true;
                if (cctvLabelText) {
                    cctvLabelText.visible = false; // Hide label on desktop
                }
            }
        }
        if (wallArtDot) {
            // Check if mobile/tablet - if so, show label text below dot (keep dot visible)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                // On mobile/tablet: show dot and simple label text below it
                wallArtDot.visible = true;
                if (wallArtLabelText) {
                    wallArtLabelText.x = wallArtDot.x;
                    wallArtLabelText.y = wallArtDot.y + 40;
                    wallArtLabelText.visible = true;
                    // Ensure text is on top by bringing it to front
                    app.stage.removeChild(wallArtLabelText);
                    app.stage.addChild(wallArtLabelText);
                }
            } else {
                // On desktop: show dot normally (hover to see stroke and "OUR TEAM" text)
                wallArtDot.visible = true; // Visible so users can hover over it
                if (wallArtLabelText) {
                    wallArtLabelText.visible = false; // Hide on desktop
                }
            }
        }
        if (bookDot) {
            // Check if mobile/tablet - if so, show label text below dot (keep dot visible)
            if (typeof window.isMobileOrTablet === 'function' && window.isMobileOrTablet()) {
                // On mobile/tablet: show dot and simple label text below it
                bookDot.visible = true;
                if (bookLabelText) {
                    bookLabelText.x = bookDot.x;
                    bookLabelText.y = bookDot.y + 40;
                    bookLabelText.visible = true;
                    // Ensure text is on top by bringing it to front
                    app.stage.removeChild(bookLabelText);
                    app.stage.addChild(bookLabelText);
                }
            } else {
                // On desktop: show dot normally (hover to see stroke and "Community" text)
                bookDot.visible = true; // Visible so users can hover over it
                if (bookLabelText) {
                    bookLabelText.visible = false; // Hide on desktop
                }
            }
        }
        // Stroke sprite is hidden initially and shown on hover, so no need to show it here

        window.addEventListener('resize', () => {
            requestAnimationFrame(resizeBackground);
        });

        app.renderer.on('resize', resizeBackground);

        setupPanning();

        // Fade out loading screen when critical assets are ready
        const minDisplayTime = 400; // Minimum 0.4 seconds display time (prevents flash)
        const minProgressToFade = 0.85; // Fade out at 85% loaded (most critical assets ready)
        const fastProgressToFade = 0.95; // If 95%+ loaded, fade immediately (very fast loading)
        const absoluteMinProgress = 0.75; // Never fade out before 75% (safety threshold)

        // Fade out loading screen after assets reach threshold
        const checkLoadingInterval = setInterval(() => {
            if (!loadingScreenStartTime) {
                loadingScreenStartTime = Date.now(); // Fallback if not set
            }
            const elapsed = Date.now() - loadingScreenStartTime;
            const minTimeElapsed = elapsed >= minDisplayTime;
            
            // Fade out if:
            // 1. Assets are 95%+ loaded (fade immediately, very fast loading)
            // 2. OR assets are 85%+ loaded AND at least 75% loaded (safety) AND minimum time passed
            if (assetLoadingProgress >= fastProgressToFade || 
                (assetLoadingProgress >= absoluteMinProgress && 
                 assetLoadingProgress >= minProgressToFade && 
                 minTimeElapsed)) {
                clearInterval(checkLoadingInterval);
                // Wait a moment after threshold is reached, then fade out
                setTimeout(() => {
                    fadeOutLoadingScreen();
                }, 150);
            }
        }, 100);

        // Safety timeout - fade out after max 6 seconds regardless (only if assets are mostly loaded)
        setTimeout(() => {
            clearInterval(checkLoadingInterval);
            // Only fade out on timeout if at least 80% of assets are loaded
            if (loadingScreen && loadingScreenAlpha > 0 && assetLoadingProgress >= 0.8) {

                fadeOutLoadingScreen();
            } else if (!ENABLE_INTRO_LOADING_SCREEN) {
                // If loading screen is disabled, show instruction after a short delay
                setTimeout(() => {
                    showInstructionAnimation();
                }, 500);
                
                // Also show audio control immediately if loading screen is disabled
                const audioControl = document.getElementById('audio-control');
                if (audioControl) {
                    audioControl.classList.add('visible');

                }
            }
        }, 15000);
    } catch (error) {
        // Error loading background texture
    }
})();