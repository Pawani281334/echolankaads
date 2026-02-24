const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:8000/api`
    : `${window.location.origin}/api`;

const STORAGE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:8000/storage/`
    : `${window.location.origin}/storage/`;

// State
let authToken = localStorage.getItem('auth_token');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let currentAds = [];
let isAdminMode = false;

let currentLang = localStorage.getItem('currentLang') || 'en';

// Translations
const translations = {
    en: {
        navAllAds: 'All ads',
        navChat: 'Chat', navLogin: 'Login', navMyAds: 'My Ads', navSettings: 'Settings', navLogout: 'Logout',
        postAd: 'POST YOUR AD', search: 'Search', searchPlaceholder: 'What are you looking for?',
        gridTitle: 'Browse items by category', sidebarSort: 'Sort results by',
        sidebarCategory: 'Category', sidebarPrice: 'Price (LKR)',
        aiAssist: 'AI Assistant', aiTrilingual: 'Online | English, සිංහල, தமிழ்',
        aiWelcome: "Hello! I'm your Echo Lanka AI assistant. How can I help you today?",
        aiWelcomeSmall: "සිංහල හෝ දෙමළ භාෂාවෙන්ද විමසිය හැක."
    },
    si: {
        navAllAds: 'සියලුම දැන්වීම්',
        navChat: 'සංවාදය', navLogin: 'පිවිසෙන්න', navMyAds: 'මගේ දැන්වීම්', navSettings: 'සැකසුම්', navLogout: 'ඉවත් වන්න',
        postAd: 'දැන්වීමක් පළ කරන්න', search: 'සොයන්න', searchPlaceholder: 'ඔබ සොයන්නේ කුමක්ද?',
        gridTitle: 'ප්‍රවර්ග අනුව බලන්න', sidebarSort: 'පිළිවෙල සකසන්න',
        sidebarCategory: 'ප්‍රවර්ගය', sidebarPrice: 'මිළ (රු.)',
        aiAssist: 'AI සහායක', aiTrilingual: 'සබැඳි | English, සිංහල, தமிழ்',
        aiWelcome: "ආයුබෝවන්! මම ඔබේ Echo Lanka AI සහායකයා. මට අද ඔබට උදව් කළ හැක්කේ කෙසේද?",
        aiWelcomeSmall: "Ask in English or Tamil too."
    },
    ta: {
        navAllAds: 'அனைத்து விளம்பரங்களும்',
        navChat: 'அரட்டை', navLogin: 'உள்நுழைக', navMyAds: 'எனது விளம்பரங்கள்', navSettings: 'அமைப்புகள்', navLogout: 'வெளியேறு',
        postAd: 'விளம்பரம் இடுக', search: 'தேடல்', searchPlaceholder: 'நீங்கள் எதைத் தேடுகிறீர்கள்?',
        gridTitle: 'வகை வாரியாகப் பாருங்கள்', sidebarSort: 'வரிசைப்படுத்து',
        sidebarCategory: 'வகை', sidebarPrice: 'விலை (LKR)',
        aiAssist: 'AI உதவியாளர்', aiTrilingual: 'ஆன்லைன் | English, සිංහල, தமிழ்',
        aiWelcome: "வணக்கம்! நான் உங்கள் Echo Lanka AI உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        aiWelcomeSmall: "Ask in English or Sinhalese too."
    }
};

// Initialize Application
window.addEventListener('load', () => {
    console.log('Echo Lanka PWA initializing...');
    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => {
                console.log('Service Worker registered successfully:', reg.scope);
                // Check if manifest is linked
                const manifestLink = document.querySelector('link[rel="manifest"]');
                console.log('Manifest status:', manifestLink ? 'Linked' : 'NOT LINKED');
            })
            .catch(err => {
                console.error('Service Worker registration failed:', err);
            });
    } else {
        console.warn('Service workers are not supported in this browser.');
    }

    // Auth & Ad Loading
    updateAuthUI();
    fetchAds();
    fetchCategoryCounts();
    setupAuthListeners();
    applyLanguage();
});

// PWA Install Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('✅ beforeinstallprompt event captured!');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
});

window.addEventListener('appinstalled', (evt) => {
    console.log('🏠 Echo Lanka app was installed.');
});

function handleInstallClick() {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
        alert('To install Echo Lanka on your iPhone/iPad:\n\n1. Tap the "Share" button at the bottom of Safari.\n2. Scroll down and tap "Add to Home Screen".');
        return;
    }

    if (!deferredPrompt) {
        alert('The app is already installed or your browser is not quite ready. You can also use your browser menu (three dots) and select "Install App" or "Add to Home Screen".');
        return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            deferredPrompt = null;
        } else {
            console.log('User dismissed the install prompt');
        }
    });
}

window.setLanguage = (lang) => {
    currentLang = lang;
    localStorage.setItem('currentLang', lang);
    applyLanguage();
};

function applyLanguage() {
    const t = translations[currentLang];

    // Update active state in nav
    ['en', 'si', 'ta'].forEach(l => {
        const el = document.getElementById(`lang-${l}`);
        if (el) {
            if (l === currentLang) {
                el.classList.add('text-[#ffc800]', 'font-bold');
            } else {
                el.classList.remove('text-[#ffc800]', 'font-bold');
            }
        }
    });

    // Translate Elements
    const elements = {
        navAllAdsText: t.navAllAds,
        navChatText: t.navChat,
        navLoginText: t.navLogin,
        navMyAdsText: t.navMyAds,
        navSettingsText: t.navSettings,
        postAdBtn: t.postAd,
        searchBtn: t.search,
        gridTitle: t.gridTitle,
        sidebarSortTitle: t.sidebarSort,
        sidebarCategoryTitle: t.sidebarCategory,
        sidebarPriceTitle: t.sidebarPrice
    };

    for (const [id, text] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;

    // Update AI Chat Home
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages && chatMessages.children.length <= 1) { // Only if just the welcome message
        chatMessages.innerHTML = `
            <div class="flex gap-2">
                <div class="w-8 h-8 rounded-full bg-[#ffc800] flex items-center justify-center shrink-0 shadow-sm border border-white/50">
                    <svg class="w-5 h-5 text-[#3e3e3e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
                        </path>
                    </svg>
                </div>
                <div class="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 max-w-[85%]">
                    <p class="text-sm text-gray-900">${t.aiWelcome}</p>
                    <p class="text-[10px] text-gray-400 mt-1">${t.aiWelcomeSmall}</p>
                </div>
            </div>
        `;
    }
}

// --- Auth Functions ---

function updateAuthUI() {
    const loginBtn = document.getElementById('navLoginBtn');
    const userDropdown = document.getElementById('navUserDropdown');
    const userNameSpan = document.getElementById('navUserName');
    const navAvatar = document.querySelector('#navUserDropdown img');
    const navAvatarPlaceholder = document.querySelector('#navUserDropdown svg:first-of-type');

    if (authToken && user) {
        if (loginBtn) {
            loginBtn.style.display = 'none';
        }
        if (userDropdown) {
            userDropdown.classList.remove('hidden');
            if (userNameSpan) userNameSpan.innerText = user.name;

            // Show avatar if exists
            if (user.avatar && navAvatar) {
                navAvatar.src = `${STORAGE_URL}${user.avatar}`;
                navAvatar.classList.remove('hidden');
                if (navAvatarPlaceholder) navAvatarPlaceholder.classList.add('hidden');
                if (navAvatar) navAvatar.classList.add('hidden');
                navAvatarPlaceholder.classList.remove('hidden');
            }

            // Show Admin Toggle
            const adminToggle = document.getElementById('adminToggle');
            if (user.is_admin && adminToggle) {
                adminToggle.classList.remove('hidden');
                adminToggle.classList.add('flex');
            }
        }
    } else {
        if (loginBtn) {
            loginBtn.style.display = '';
            loginBtn.classList.remove('hidden');
        }
        if (userDropdown) userDropdown.classList.add('hidden');
    }
}

async function login(email, password) {
    console.log(`Attempting login to: ${API_URL}/login`);
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        console.log('Login Response Status:', response.status);
        const data = await response.json();
        console.log('Login Response Data:', data);

        if (response.ok) {
            authToken = data.access_token;
            user = data.user;
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('user', JSON.stringify(user));

            updateAuthUI();
            document.getElementById('loginModal').classList.add('hidden');
            alert(`Welcome back, ${user.name}!`);
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(`An error occurred during login: ${error.message}\n\nThis usually means the server is not responding or your connection is blocked.`);
    }
}

async function register(name, email, password) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.access_token;
            user = data.user;
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('user', JSON.stringify(user));

            updateAuthUI();
            document.getElementById('signupModal').classList.add('hidden');
            alert(`Account created! Welcome, ${user.name}!`);
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration.');
    }
}

async function logout() {
    if (!authToken) return;

    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Logout error (ignoring):', error);
    } finally {
        authToken = null;
        user = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        updateAuthUI();
        alert('Logged out successfully.');
    }
}

// --- Click Handlers for Dropdown ---
window.handleMyAdsClick = (e) => {
    if (e) e.preventDefault();
    console.log('My Ads clicked');
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = ''; // Clear search when clicking My Ads
    fetchAds('', true); // true = my ads only
};

window.handleSettingsClick = (e) => {
    if (e) e.preventDefault();
    console.log('Settings clicked');
    if (user) {
        document.getElementById('settingsName').innerText = user.name;
        document.getElementById('settingsEmail').innerText = user.email;
        document.getElementById('settingsDate').innerText = new Date(user.created_at).toLocaleDateString();

        // Set avatar in settings
        const avatarImg = document.getElementById('settingsAvatar');
        const placeholder = document.getElementById('settingsAvatarPlaceholder');
        if (user.avatar) {
            avatarImg.src = `${STORAGE_URL}${user.avatar}`;
            avatarImg.classList.remove('hidden');
            if (placeholder) placeholder.classList.add('hidden');
        } else if (placeholder) {
            if (avatarImg) avatarImg.classList.add('hidden');
            placeholder.classList.remove('hidden');
            placeholder.innerText = user.name.charAt(0);
        }

        document.getElementById('settingsModal').classList.remove('hidden');
    }
};

function setupAuthListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            await login(email, password);
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = signupForm.querySelector('input[type="text"]').value;
            const email = signupForm.querySelector('input[type="email"]').value;
            const password = signupForm.querySelector('input[type="password"]').value;
            await register(name, email, password);
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Avatar Upload Listener
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const formData = new FormData();
                formData.append('avatar', e.target.files[0]);

                try {
                    const response = await fetch(`${API_URL}/update-profile`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        }
                    });

                    const data = await response.json();
                    if (response.ok) {
                        user = data.user;
                        localStorage.setItem('user', JSON.stringify(user));
                        updateAuthUI();
                        // Update settings modal UI
                        const avatarImg = document.getElementById('settingsAvatar');
                        const placeholder = document.getElementById('settingsAvatarPlaceholder');
                        if (avatarImg) {
                            avatarImg.src = `${STORAGE_URL}${user.avatar}`;
                            avatarImg.classList.remove('hidden');
                        }
                        if (placeholder) placeholder.classList.add('hidden');
                        alert('Profile photo updated!');
                    } else {
                        alert(data.message || 'Failed to update photo');
                    }
                } catch (error) {
                    console.error('Avatar upload error:', error);
                }
            }
        });
    }

    // Password Change Listener
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match');
                return;
            }

            try {
                const response = await fetch(`${API_URL}/change-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword,
                        new_password_confirmation: confirmPassword
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    alert('Password changed successfully!');
                    changePasswordForm.reset();
                } else {
                    alert(data.message || 'Failed to change password');
                }
            } catch (error) {
                console.error('Password change error:', error);
            }
        });
    }

    // Social Login
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            window.location.href = `${API_URL}/auth/google`;
        });
    }

    const fbBtn = document.getElementById('facebookLoginBtn');
    if (fbBtn) {
        fbBtn.addEventListener('click', () => {
            window.location.href = `${API_URL}/auth/facebook`;
        });
    }

    const locationSelect = document.getElementById('locationSelect');
    if (locationSelect) {
        locationSelect.addEventListener('change', () => {
            fetchAds();
        });
    }

    // Edit Ad Form Listener
    const editAdForm = document.getElementById('editAdForm');
    if (editAdForm) {
        editAdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const adId = document.getElementById('editAdId').value;
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Updating...';

            const formData = new FormData(e.target);
            // Laravel needs _method: PUT for spoofing in FormData
            formData.append('_method', 'PUT');

            try {
                const response = await fetch(`${API_URL}/ads/${adId}`, {
                    method: 'POST', // Use POST with _method spoofing
                    body: formData,
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                if (response.ok) {
                    document.getElementById('editAdModal').classList.add('hidden');
                    document.getElementById('adDetailModal').classList.add('hidden');
                    fetchAds();
                    fetchCategoryCounts();
                    alert('Ad updated successfully!');
                } else {
                    const error = await response.json();
                    alert('Error: ' + (error.message || 'Failed to update ad'));
                }
            } catch (error) {
                console.error('Update error:', error);
                alert('An error occurred while updating.');
            } finally {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });
    }
}

// Check for social login callback
const urlParams = new URLSearchParams(window.location.search);
const tokenParam = urlParams.get('token');
const userParam = urlParams.get('user');

if (tokenParam && userParam) {
    authToken = tokenParam;
    user = JSON.parse(decodeURIComponent(userParam));
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('user', JSON.stringify(user));
    window.history.replaceState({}, document.title, window.location.pathname);
    alert(`Welcome, ${user.name}!`);
}

// --- Ads Functions ---

function handleCategoryClick(category) {
    fetchAds('', false, category);
}

async function fetchAds(searchQuery = '', myAdsOnly = false, category = '') {
    const container = document.getElementById('adsContainer');
    if (!container) return;

    // Loading spinner
    container.innerHTML = `
        <div class="bg-white p-12 text-center rounded border border-gray-200">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f172a] mx-auto mb-4"></div>
            <p class="text-gray-600">Loading ads...</p>
        </div>
    `;

    try {
        let url = `${API_URL}/ads`;
        const params = new URLSearchParams();

        const searchInput = document.getElementById('searchInput');
        const locationSelect = document.getElementById('locationSelect');
        const sortSelect = document.getElementById('sortSelect');
        const minPriceInput = document.getElementById('minPriceInput');
        const maxPriceInput = document.getElementById('maxPriceInput');

        let q = searchQuery || (searchInput && !myAdsOnly ? searchInput.value : '');
        let loc = locationSelect && !myAdsOnly ? locationSelect.value : '';
        let sort = sortSelect ? sortSelect.value : 'newest';
        let minP = minPriceInput ? minPriceInput.value : '';
        let maxP = maxPriceInput ? maxPriceInput.value : '';

        if (q) params.append('search', q);
        if (loc) params.append('location', loc);
        if (category) params.append('category', category);
        if (sort) params.append('sort', sort);
        if (minP) params.append('min_price', minP);
        if (maxP) params.append('max_price', maxP);

        if (myAdsOnly && user) {
            params.append('user_id', user.id);
        }

        if (isAdminMode && user && user.is_admin) {
            params.append('admin_view', '1');
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const headers = {
            'Accept': 'application/json'
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(url, { headers });
        currentAds = await response.json();

        // Update count display
        const countDisplay = document.getElementById('adCountDisplay');
        if (countDisplay) {
            countDisplay.innerText = `Showing all ${currentAds.length} ads`;
        }

        container.innerHTML = '';

        if (myAdsOnly) {
            const heading = document.createElement('div');
            heading.className = 'mb-6 flex justify-between items-center bg-white p-4 rounded border border-[#0f172a] shadow-sm';
            heading.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="bg-[#0f172a] text-white p-2 rounded-full">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-gray-800">My Advertisements</h2>
                        <p class="text-xs text-gray-600">Showing all ads posted by you</p>
                    </div>
                </div>
                <button onclick="fetchAds()" class="text-xs font-bold text-[#0f172a] hover:underline">Show all ads</button>
            `;
            container.appendChild(heading);
        }

        if (currentAds.length === 0) {
            const emptyMsg = myAdsOnly ? 'You haven\'t posted any ads yet.' : 'No results found.';
            const subMsg = myAdsOnly ? 'Click the "POST YOUR AD" button to get started!' : 'Try a broad search or check spelling.';

            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'bg-white p-12 text-center rounded border border-gray-200';
            emptyDiv.innerHTML = `
                <div class="text-[#0f172a] opacity-20 mb-4 flex justify-center">
                    <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                </div>
                <p class="text-gray-600 text-lg font-bold">${emptyMsg}</p>
                <p class="text-sm text-gray-400 mt-1">${subMsg}</p>
            `;
            container.appendChild(emptyDiv);
            return;
        }

        currentAds.forEach(ad => {
            const card = document.createElement('div');
            card.className = 'bg-white border border-gray-200 rounded p-3 flex gap-4 hover:shadow-md transition-shadow cursor-pointer group relative';
            card.onclick = () => showAdDetail(ad.id);

            const formattedPrice = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(ad.price);
            const date = new Date(ad.created_at);
            const timeAgo = getTimeAgo(date);

            card.innerHTML = `
                <div class="w-32 h-24 md:w-48 md:h-32 flex-shrink-0 bg-gray-100 rounded overflow-hidden relative">
                    <img src="${STORAGE_URL}${ad.image}" alt="${ad.title}" class="w-full h-full object-cover">
                    <div class="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-[10px] px-1 rounded-tr">1/1</div>
                </div>
                <div class="flex-grow flex flex-col justify-between">
                    <div>
                        <h3 class="text-base md:text-lg font-bold text-gray-800 group-hover:text-[#0f172a] leading-tight mb-1">${ad.title}</h3>
                        <div class="text-xs text-gray-600 mb-1">${ad.location || 'Sri Lanka'}, ${ad.category || 'General'}</div>
                        <div class="text-[#0f172a] font-bold text-base md:text-lg">${formattedPrice}</div>
                    </div>
                    <div class="flex justify-between items-end mt-2">
                        <div class="text-[11px] text-gray-400">${timeAgo}</div>
                        <div class="text-right">
                            ${ad.status === 'pending' ? '<span class="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide mr-1 border border-red-200">Pending</span>' : ''}
                            <span class="bg-[#ffc800] text-[#3e3e3e] text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Member</span>
                            ${ad.phone ? `<div class="text-xs text-gray-600 mt-1">📞 ${ad.phone}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error fetching ads:', error);
        container.innerHTML = '<div class="bg-red-50 text-red-500 p-4 rounded text-center">Failed to load ads.</div>';
    }
}

function showAdDetail(adId) {
    const ad = currentAds.find(a => a.id === adId);
    if (!ad) return;

    document.getElementById('detailAdImage').src = `${STORAGE_URL}${ad.image}`;
    document.getElementById('detailAdTitle').innerText = ad.title;
    document.getElementById('detailAdPrice').innerText = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(ad.price);
    document.getElementById('detailAdDescription').innerText = ad.description;
    document.getElementById('detailAdCategory').innerText = ad.category || 'General';
    document.getElementById('detailAdLocation').innerText = ad.location || 'Sri Lanka';
    document.getElementById('detailAdPhone').innerText = ad.phone || 'N/A';
    document.getElementById('detailAdEmail').innerText = ad.email || 'N/A';

    // Owner controls
    const ownerControls = document.getElementById('ownerControls');
    if (user && user.id === ad.user_id) {
        ownerControls.classList.remove('hidden');
        document.getElementById('editAdBtn').onclick = () => openEditModal(ad);
        document.getElementById('deleteAdBtn').onclick = () => deleteAd(ad.id);
    } else {
        ownerControls.classList.add('hidden');
    }

    // Admin controls
    const adminControls = document.getElementById('adminControls');
    const approveBtn = document.getElementById('approveAdBtn');
    const adminDeleteBtn = document.getElementById('adminDeleteBtn');

    if (user && user.is_admin) {
        adminControls.classList.remove('hidden');
        if (ad.status === 'pending') {
            approveBtn.classList.remove('hidden');
            approveBtn.onclick = () => approveAd(ad.id);
        } else {
            approveBtn.classList.add('hidden');
        }
        adminDeleteBtn.onclick = () => deleteAdAdmin(ad.id);
    } else {
        adminControls.classList.add('hidden');
    }

    document.getElementById('adDetailModal').classList.remove('hidden');
}

function openEditModal(ad) {
    document.getElementById('editAdId').value = ad.id;
    document.getElementById('editAdTitleField').value = ad.title;
    document.getElementById('editAdPriceField').value = ad.price;
    document.getElementById('editAdCategoryField').value = ad.category || 'Mobiles';
    document.getElementById('editAdLocationField').value = ad.location || '';
    document.getElementById('editAdDescriptionField').value = ad.description;
    document.getElementById('editAdPhoneField').value = ad.phone || '';
    document.getElementById('editAdEmailField').value = ad.email || '';

    // Clear image preview
    document.getElementById('editImagePreview').classList.add('hidden');

    document.getElementById('editAdModal').classList.remove('hidden');
}

async function deleteAd(adId) {
    if (!confirm('Are you sure you want to delete this advertisement? This action cannot be undone.')) return;

    try {
        const response = await fetch(`${API_URL}/ads/${adId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            document.getElementById('adDetailModal').classList.add('hidden');
            fetchAds();
            fetchCategoryCounts();
            alert('Ad deleted successfully.');
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to delete ad');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('An error occurred while deleting.');
    }
}

window.previewEditImage = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.getElementById('editImagePreview');
            img.src = e.target.result;
            img.classList.remove('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
};

async function fetchCategoryCounts() {
    try {
        const response = await fetch(`${API_URL}/ads/categories`);
        const counts = await response.json();

        // Reset all counts
        const countElements = document.querySelectorAll('[id^="count-"]');
        countElements.forEach(el => el.innerText = '(0)');

        // Fill in new counts
        for (const [category, count] of Object.entries(counts)) {
            if (!category || category === 'null') continue; // Skip null categories
            const slug = category.replace(/[^a-zA-Z0-9]+/g, '-');

            // Sidebar counts
            const sidebarEl = document.getElementById(`count-${slug}`);
            if (sidebarEl) sidebarEl.innerText = `(${count})`;

            // Grid counts
            const gridEl = document.getElementById(`grid-count-${slug}`);
            if (gridEl) gridEl.innerText = `(${count})`;
        }
    } catch (error) {
        console.error('Error fetching category counts:', error);
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
}

// Global search handler
window.handleSearch = () => {
    fetchAds();
};

// Global search input listener
document.addEventListener('keypress', (e) => {
    if (e.target.id === 'searchInput' && e.key === 'Enter') {
        fetchAds();
    }
    if ((e.target.id === 'minPriceInput' || e.target.id === 'maxPriceInput') && e.key === 'Enter') {
        fetchAds();
    }
});

// --- Content Safety Filter ---
const PROHIBITED_KEYWORDS = {
    en: ['porn', 'sex', 'naked', 'explicit', 'adult', 'dating', 'escort', 'hot girls', 'xxx'],
    si: ['ලිංගික', 'කුණු', 'අසභ්‍ය', 'හොට්', 'කෙල්ලෝ', 'සෙක්ස්'],
    ta: ['பாலியல்', 'ஆபாச', 'நிர்வாண', 'adult', 'sex']
};

function validateAdContent(title, description) {
    const combinedText = (title + ' ' + description).toLowerCase();

    // Check all language lists
    for (const lang in PROHIBITED_KEYWORDS) {
        for (const word of PROHIBITED_KEYWORDS[lang]) {
            if (combinedText.includes(word.toLowerCase())) {
                return {
                    isValid: false,
                    word: word,
                    lang: lang
                };
            }
        }
    }
    return { isValid: true };
}

function showComplianceWarning(violation) {
    const modal = document.getElementById('complianceModal');
    const wordEl = document.getElementById('violatedWord');
    if (modal && wordEl) {
        wordEl.innerText = `"${violation.word}"`;
        modal.classList.remove('hidden');
    }
}

// Update Ad Post Form with validation
const adForm = document.getElementById('adForm');
if (adForm) {
    adForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const title = formData.get('title');
        const description = formData.get('description');

        const validation = validateAdContent(title, description);
        if (!validation.isValid) {
            showComplianceWarning(validation);
            return;
        }

        if (!authToken) {
            alert('Please login to post an ad.');
            document.getElementById('postAdModal').classList.add('hidden');
            document.getElementById('loginModal').classList.remove('hidden');
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Publishing...';

        try {
            const response = await fetch(`${API_URL}/ads`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                document.getElementById('postAdModal').classList.add('hidden');
                e.target.reset();
                const preview = document.getElementById('imagePreview');
                if (preview) preview.classList.add('hidden');
                fetchAds();
                fetchCategoryCounts();
                alert('Ad posted successfully!');
            } else {
                const error = await response.json();
                alert('Error: ' + (error.message || 'Failed to post ad'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to post ad.');
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    });
}

// Update Edit Ad Form with validation
const editAdForm = document.getElementById('editAdForm');
if (editAdForm) {
    editAdForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const title = formData.get('title');
        const description = formData.get('description');

        const validation = validateAdContent(title, description);
        if (!validation.isValid) {
            showComplianceWarning(validation);
            return;
        }

        const adId = document.getElementById('editAdId').value;
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Updating...';

        formData.append('_method', 'PUT');

        try {
            const response = await fetch(`${API_URL}/ads/${adId}`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                document.getElementById('editAdModal').classList.add('hidden');
                document.getElementById('adDetailModal').classList.add('hidden');
                fetchAds();
                fetchCategoryCounts();
                alert('Ad updated successfully!');
            } else {
                const error = await response.json();
                alert('Error: ' + (error.message || 'Failed to update ad'));
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('An error occurred while updating.');
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    });
}
// AI Chat Logic
window.toggleAIChat = () => {
    const drawer = document.getElementById('aiChatDrawer');
    drawer.classList.toggle('translate-x-full');
};

window.sendChatMessage = async () => {
    const input = document.getElementById('chatInput');
    const container = document.getElementById('chatMessages');
    const typing = document.getElementById('typingIndicator');
    const message = input.value.trim();

    if (!message) return;

    // Add User Message
    const userMsgHTML = `
        <div class="flex justify-end">
            <div class="bg-[#ffc800] text-[#3e3e3e] p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] font-medium">
                <p class="text-sm">${message}</p>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', userMsgHTML);
    input.value = '';
    container.scrollTop = container.scrollHeight;

    // Show Typing
    typing.classList.remove('hidden');
    container.scrollTop = container.scrollHeight;

    // Simulate AI delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get AI Response
    const response = getAIResponse(message);
    typing.classList.add('hidden');

    // Add AI Message
    const aiMsgHTML = `
        <div class="flex gap-2">
            <div class="w-8 h-8 rounded-full bg-[#ffc800] flex items-center justify-center shrink-0 shadow-sm border border-white/50">
                <svg class="w-5 h-5 text-[#3e3e3e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
                    </path>
                </svg>
            </div>
            <div class="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 max-w-[85%]">
                <p class="text-sm text-gray-900">${response}</p>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', aiMsgHTML);
    container.scrollTop = container.scrollHeight;
};

function getAIResponse(query) {
    query = query.toLowerCase();

    // Language Detection
    const isSinhala = /[\u0D80-\u0DFF]/.test(query);
    const isTamil = /[\u0B80-\u0BFF]/.test(query);

    const responses = {
        en: {
            post: "To post an ad, click the yellow 'POST YOUR AD' button in the navbar. You'll need to be logged in first!",
            safety: "Stay safe! We recommend meeting in a public place and never sending money before seeing the item.",
            categories: "You can find all categories in the sidebar or in the 'Browse Categories' section on the homepage.",
            hello: "Hello! I'm here to help you with Echo Lanka. What can I do for you?",
            default: "I'm sorry, I didn't quite catch that. You can ask me about posting ads, safety, or categories!"
        },
        si: {
            post: "දැන්වීමක් පළ කිරීමට, ඉහළ ඇති කහ පැහැති 'POST YOUR AD' බොත්තම ඔබන්න. ඒ සඳහා ඔබ ප්‍රථමයෙන් ලොග් විය යුතුය!",
            safety: "ආරක්ෂිත වන්න! භාණ්ඩය පරීක්ෂා කිරීමට පෙර මුදල් ගෙවීමෙන් වළකින්න සහ පොදු ස්ථානයකදී හමුවන්න.",
            categories: "ඔබට සියලුම ප්‍රවර්ග ප්‍රධාන පිටුවේ හෝ පැති තීරුවේ දැක ගත හැක.",
            hello: "ආයුබෝවන්! මම ඔබට උදව් කරන්නේ කෙසේද?",
            default: "සමාවන්න, මට එය වැටහුණේ නැත. දැන්වීම් පළ කිරීම, ආරක්ෂාව හෝ ප්‍රවර්ග ගැන මගෙන් විමසන්න!"
        },
        ta: {
            post: "விளம்பரத்தை இடுகையிட, மெனுவில் உள்ள மஞ்சள் 'POST YOUR AD' பொத்தானைக் கிளிக் செய்யவும். நீங்கள் முதலில் லாக்-இன் செய்ய வேண்டும்!",
            safety: "பாதுகாப்பாக இருங்கள்! பொருளைப் பார்ப்பதற்கு முன் பணம் அனுப்ப வேண்டாம் மற்றும் பொது இடத்தில் சந்திக்கவும்.",
            categories: "பக்கவாட்டு பட்டி அல்லது முகப்புப்பக்கத்தில் உள்ள அனைத்து வகைகளையும் நீங்கள் காணலாம்.",
            hello: "வணக்கம்! நான் உங்களுக்கு எப்படி உதவ முடியும்?",
            default: "மன்னிக்கவும், எனக்கு புரியவில்லை. விளம்பரங்களை இடுகையிடுவது அல்லது பாதுகாப்பு பற்றி நீங்கள் என்னிடம் கேட்கலாம்!"
        }
    };

    let lang = currentLang;
    if (isSinhala) lang = 'si';
    else if (isTamil) lang = 'ta';

    if (query.includes('post') || query.includes('දැන්වීම') || query.includes('விளம்பரம்')) return responses[lang].post;
    if (query.includes('safe') || query.includes('ආරක්ෂ') || query.includes('பாதுகாப்பு')) return responses[lang].safety;
    if (query.includes('category') || query.includes('ප්‍රවර්ග') || query.includes('வகை')) return responses[lang].categories;
    if (query.includes('hi') || query.includes('hello') || query.includes('හலோ') || query.includes('வணக்கம்')) return responses[lang].hello;

    return responses[lang].default;
}

// Service Info Modal Logic
const serviceData = {
    'sell-fast': {
        title: 'Sell Fast',
        subtitle: 'Our Quick Listing Service',
        content: `
            <div class="flex items-start gap-4 mb-4">
                <div class="bg-[#ffc800] p-3 rounded-full shrink-0">
                    <svg class="w-6 h-6 text-[#0f172a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                </div>
                <div>
                    <h4 class="font-bold text-gray-900">Get assistance from experts</h4>
                    <p class="text-sm text-gray-600">Not tech-savvy? No problem. Our network of newsagents and communication outlets can help you take photos and create premium listings for you.</p>
                </div>
            </div>
            <div class="bg-gray-100 p-4 rounded-xl">
                <h5 class="font-bold text-xs uppercase tracking-widest text-gray-500 mb-2">Benefits</h5>
                <ul class="space-y-2 text-sm text-gray-800">
                    <li class="flex items-center gap-2">✅ Professional photo assistance</li>
                    <li class="flex items-center gap-2">✅ Immediate premium ad activation</li>
                    <li class="flex items-center gap-2">✅ Reach 10x more buyers instantly</li>
                </ul>
            </div>
        `
    },
    'membership': {
        title: 'Membership',
        subtitle: 'For Frequent Sellers & Businesses',
        content: `
            <div class="flex items-start gap-4 mb-4">
                <div class="bg-[#ffc800] p-3 rounded-full shrink-0">
                    <svg class="w-6 h-6 text-[#0f172a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                </div>
                <div>
                    <h4 class="font-bold text-gray-900">Scale your business</h4>
                    <p class="text-sm text-gray-600">Perfect for shops and individuals with many items. Memberships unlock higher ad limits and automated promotional tools.</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 text-center">
                <div class="border border-gray-200 p-3 rounded-xl bg-white">
                    <div class="text-[#ffc800] font-bold text-xl">∞</div>
                    <div class="text-[10px] uppercase font-bold text-gray-500">Ad Limits</div>
                </div>
                <div class="border border-gray-200 p-3 rounded-xl bg-white">
                    <div class="text-[#ffc800] font-bold text-xl">Auto</div>
                    <div class="text-[10px] uppercase font-bold text-gray-500">Reposting</div>
                </div>
            </div>
        `
    },
    'banner-ads': {
        title: 'Banner Ads',
        subtitle: 'Targeted High-Impact Branding',
        content: `
            <div class="flex items-start gap-4 mb-4">
                <div class="bg-[#ffc800] p-3 rounded-full shrink-0">
                    <svg class="w-6 h-6 text-[#0f172a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <div>
                    <h4 class="font-bold text-gray-900">Be seen by Everyone</h4>
                    <p class="text-sm text-gray-600">Place your brand in prime positions like the leaderboard or skyscraper banners. Target specific districts or categories for maximum ROI.</p>
                </div>
            </div>
            <div class="space-y-2">
                <div class="h-8 bg-gray-200 rounded w-full flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">Leaderboard (728x90)</div>
                <div class="flex gap-2">
                    <div class="h-16 bg-gray-200 rounded w-12 flex items-center justify-center text-[8px] text-gray-400 font-bold uppercase text-center leading-tight">Sky<br>scraper</div>
                    <div class="h-16 bg-gray-100 rounded flex-grow"></div>
                </div>
            </div>
        `
    },
    'boost-ad': {
        title: 'Boost Ad',
        subtitle: 'Get Up To 10x More Views',
        content: `
            <div class="space-y-4">
                <div class="flex gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div class="font-bold text-[#ffc800] text-lg">🚀</div>
                    <div>
                        <h4 class="font-bold text-sm text-gray-900">Bump Up</h4>
                        <p class="text-xs text-gray-600">Your ad jumps back to the top of the listings every day.</p>
                    </div>
                </div>
                <div class="flex gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div class="font-bold text-blue-500 text-lg">⭐</div>
                    <div>
                        <h4 class="font-bold text-sm text-gray-900">Top Ad</h4>
                        <p class="text-xs text-gray-600">Get a highlighted premium spot at the very top of results.</p>
                    </div>
                </div>
                <div class="flex gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                    <div class="font-bold text-red-500 text-lg">🔥</div>
                    <div>
                        <h4 class="font-bold text-sm text-gray-900">Urgent Tag</h4>
                        <p class="text-xs text-gray-600">Help buyers know you want to sell fast with a bright red tag.</p>
                    </div>
                </div>
            </div>
        `
    },
    'faq': {
        title: 'Frequently Asked Questions',
        subtitle: 'Everything you need to know',
        content: `
            <div class="space-y-6">
                <div>
                    <h4 class="font-bold text-gray-900 mb-2 underline whitespace-nowrap">How do I post an advertisement?</h4>
                    <p class="text-sm text-gray-600 leading-relaxed">Simply click the yellow <strong>"POST YOUR AD"</strong> button at the top right, fill in your item details, upload a photo, and hit post! If you are an admin, it's public immediately. Regular users' ads will be reviewed within 24 hours.</p>
                </div>
                <div>
                    <h4 class="font-bold text-gray-900 mb-2 underline whitespace-nowrap">Is it free to use Echo Lanka?</h4>
                    <p class="text-sm text-gray-600 leading-relaxed">Yes! Posting standard advertisements is completely free for all members. We only charge for premium "Boost" features if you want more views.</p>
                </div>
                <div>
                    <h4 class="font-bold text-gray-900 mb-2 underline whitespace-nowrap">How can I contact a seller?</h4>
                    <p class="text-sm text-gray-600 leading-relaxed">Click on any ad to see the seller's phone number or email. You can also use our built-in <strong>AI Chat</strong> to get help with finding specific items.</p>
                </div>
            </div>
        `
    },
    'stay-safe': {
        title: 'Stay Safe on Echo Lanka',
        subtitle: 'Your security is our priority',
        content: `
            <div class="space-y-4">
                <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <h4 class="font-bold text-emerald-800 text-sm mb-2">Safety Tips for Buyers:</h4>
                    <ul class="text-xs text-emerald-700 space-y-2 list-disc pl-4 leading-relaxed">
                        <li><strong>Meet in public:</strong> Always choose a safe, public location like a mall or police station.</li>
                        <li><strong>Inspect the item:</strong> Check the quality and functionality before handing over any money.</li>
                        <li><strong>No Advance Payments:</strong> Never send money via bank transfer or mobile reload before receiving the item.</li>
                    </ul>
                </div>
                <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 class="font-bold text-blue-800 text-sm mb-2">Detailed Guide:</h4>
                    <p class="text-xs text-blue-700 leading-relaxed mb-3">For a comprehensive guide on staying safe during online trading, visit our partner safety resource:</p>
                    <a href="https://ikman.lk/en/stay-safe" target="_blank" class="inline-block bg-[#0f172a] text-white px-4 py-2 rounded font-bold text-[10px] hover:bg-black transition-colors">VISIT SAFETY CENTER</a>
                </div>
            </div>
        `
    },
    'contact-us': {
        title: 'Contact Echo Lanka',
        subtitle: 'We are here to help',
        content: `
            <div class="space-y-5">
                <div class="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <div class="w-10 h-10 bg-[#ffc800] rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-[#0f172a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-gray-400 uppercase">Phone Support</h4>
                        <p class="text-sm font-bold text-gray-900 leading-tight">077 534 1169</p>
                        <p class="text-sm font-bold text-gray-900 leading-tight">078 534 1169</p>
                    </div>
                </div>
                <div class="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <div class="w-10 h-10 bg-[#ffc800] rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-[#0f172a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-gray-400 uppercase">Email Us</h4>
                        <p class="text-sm font-bold text-gray-900">echolankaads@gmail.com</p>
                    </div>
                </div>
                <div class="flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <div class="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-amber-700 uppercase">Hotline</h4>
                        <p class="text-sm font-bold text-amber-900">COMING SOON</p>
                    </div>
                </div>
            </div>
        `
    },
    'about-us': {
        title: 'About Echo Lanka',
        subtitle: 'Sri Lanka\'s Premier Marketplace',
        content: `
            <div class="space-y-4">
                <p class="text-sm text-gray-600 leading-relaxed"><strong>Echo Lanka</strong> is dedicated to building the most reliable and user-friendly online marketplace in Sri Lanka. Our mission is to empower individuals and small businesses by providing a platform to reach millions of buyers with ease.</p>
                <div class="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <h4 class="font-bold text-[#0f172a] text-sm mb-2">Why choose us?</h4>
                    <ul class="text-xs text-gray-700 space-y-2 list-disc pl-4">
                        <li><strong>Safe Trading:</strong> We prioritize user security and content moderation.</li>
                        <li><strong>Smart Search:</strong> Find exactly what you need with our AI-driven suggestions.</li>
                        <li><strong>Local Presence:</strong> Built specifically for the needs of the Sri Lankan community.</li>
                    </ul>
                </div>
            </div>
        `
    },
    'careers': {
        title: 'Careers at Echo Lanka',
        subtitle: 'Grow with us',
        content: `
            <div class="space-y-4 text-center py-4">
                <div class="w-16 h-16 bg-[#ffc800] rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <svg class="w-8 h-8 text-[#0f172a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <h4 class="font-bold text-gray-900">We are always looking for talent!</h4>
                <p class="text-sm text-gray-600 leading-relaxed">Join a team of innovators building the future of e-commerce in Sri Lanka. We have openings in Software Engineering, Marketing, and Customer Success.</p>
                <div class="inline-block px-4 py-2 border-2 border-[#0f172a] rounded-lg text-xs font-bold text-[#0f172a]">
                    Send your CV: careers@echolanka.com
                </div>
            </div>
        `
    },
    'terms': {
        title: 'Terms and Conditions',
        subtitle: 'Effective from Feb 2024',
        content: `
            <div class="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                <section>
                    <h4 class="font-bold text-gray-900 text-sm mb-1">1. Acceptance of Terms</h4>
                    <p class="text-xs text-gray-600 leading-relaxed">By accessing Echo Lanka, you agree to be bound by these Terms and Conditions and all applicable laws and regulations.</p>
                </section>
                <section>
                    <h4 class="font-bold text-gray-900 text-sm mb-1">2. User Conduct</h4>
                    <p class="text-xs text-gray-600 leading-relaxed">Users are responsible for the content they post. Fraudulent, offensive, or illegal content is strictly prohibited and will be removed.</p>
                </section>
                <section>
                    <h4 class="font-bold text-gray-900 text-sm mb-1">3. Marketplace Safety</h4>
                    <p class="text-xs text-gray-600 leading-relaxed">Echo Lanka provides a platform for connecting buyers and sellers. We do not take responsibility for the quality or legality of items traded.</p>
                </section>
                <section>
                    <h4 class="font-bold text-gray-900 text-sm mb-1">4. Modifications</h4>
                    <p class="text-xs text-gray-600 leading-relaxed">We reserve the right to modify these terms at any time. Continued use of the site implies acceptance of new terms.</p>
                </section>
            </div>
        `
    },
    'privacy': {
        title: 'Privacy Policy',
        subtitle: 'Protecting your data',
        content: `
            <div class="space-y-4">
                <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-4">
                     <div class="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center shrink-0">
                        <svg class="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                    </div>
                    <p class="text-xs text-emerald-800 leading-relaxed">We value your privacy. Echo Lanka collects minimal data required to provide our services and never sells your personal information to third parties.</p>
                </div>
                <div class="space-y-3 pl-2 max-h-[40vh] overflow-y-auto pr-2">
                    <h4 class="font-bold text-gray-900 text-sm italic underline">Information We Collect:</h4>
                    <ul class="text-xs text-gray-600 space-y-1 list-disc pl-4 mb-4">
                        <li>Account information (Name, Email, Phone)</li>
                        <li>Usage data to improve our search AI</li>
                        <li>Cookies to keep you logged in securely</li>
                    </ul>

                    <h4 class="font-bold text-gray-900 text-sm italic underline">Third-party Advertising & Cookies:</h4>
                    <p class="text-xs text-gray-600 leading-relaxed mb-2">We use <strong>Google AdSense</strong> to serve ads when you visit our website. Google, as a third-party vendor, uses cookies to serve ads on this site. Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.</p>
                    
                    <h4 class="font-bold text-gray-900 text-[11px] italic">Personalized Advertising:</h4>
                    <p class="text-[10px] text-gray-500 leading-relaxed mb-4">Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" class="text-blue-600 underline">Google Ad Settings</a>. Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info" target="_blank" class="text-blue-600 underline">www.aboutads.info</a>.</p>
                </div>
            </div>
        `
    },
    'sitemap': {
        title: 'Sitemap',
        subtitle: 'Platform Structure & Navigation',
        content: `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 bg-white p-2">
                <!-- Column 1: Marketplace Categories -->
                <div>
                    <h4 class="font-bold text-[#0f172a] text-xs uppercase mb-3 pb-1 border-b border-gray-100 flex items-center gap-2">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                        Main Categories
                    </h4>
                    <ul class="text-[11px] text-gray-600 space-y-2">
                        <li><a href="#" onclick="handleCategoryClick('Vehicles')" class="hover:text-[#ffc800] transition-colors">• Vehicles & Parts</a></li>
                        <li><a href="#" onclick="handleCategoryClick('Mobiles')" class="hover:text-[#ffc800] transition-colors">• Mobile Phones & Accessories</a></li>
                        <li><a href="#" onclick="handleCategoryClick('Electronics')" class="hover:text-[#ffc800] transition-colors">• Electronics & Home Appliances</a></li>
                        <li><a href="#" onclick="handleCategoryClick('Property')" class="hover:text-[#ffc800] transition-colors">• Property & Real Estate</a></li>
                        <li><a href="#" onclick="handleCategoryClick('Home & Garden')" class="hover:text-[#ffc800] transition-colors">• Home, Garden & Furniture</a></li>
                        <li><a href="#" onclick="handleCategoryClick('Fashion & Beauty')" class="hover:text-[#ffc800] transition-colors">• Fashion, Health & Beauty</a></li>
                        <li><a href="#" onclick="handleCategoryClick('Jobs')" class="hover:text-[#ffc800] transition-colors">• Job Vacancies</a></li>
                        <li><a href="#" onclick="handleCategoryClick('Services')" class="hover:text-[#ffc800] transition-colors">• Professional Services</a></li>
                        <li><a href="#" onclick="handleCategoryClick('Business & Industry')" class="hover:text-[#ffc800] transition-colors">• Business & Industrial</a></li>
                        <li><a href="#" onclick="handleCategoryClick('Agriculture')" class="hover:text-[#ffc800] transition-colors">• Agriculture & Food</a></li>
                    </ul>
                </div>

                <!-- Column 2: Popular Locations -->
                <div>
                    <h4 class="font-bold text-[#0f172a] text-xs uppercase mb-3 pb-1 border-b border-gray-100 flex items-center gap-2">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>
                        Ads by Location
                    </h4>
                    <ul class="text-[11px] text-gray-600 space-y-2">
                        <li><a href="#" class="hover:text-[#ffc800] transition-colors">• Colombo</a></li>
                        <li><a href="#" class="hover:text-[#ffc800] transition-colors">• Gampaha</a></li>
                        <li><a href="#" class="hover:text-[#ffc800] transition-colors">• Kandy</a></li>
                        <li><a href="#" class="hover:text-[#ffc800] transition-colors">• Galle</a></li>
                        <li><a href="#" class="hover:text-[#ffc800] transition-colors">• Kurunegala</a></li>
                        <li><a href="#" class="hover:text-[#ffc800] transition-colors">• Kalutara</a></li>
                        <li><a href="#" class="hover:text-[#ffc800] transition-colors">• Matara</a></li>
                        <li><a href="#" class="hover:text-[#ffc800] transition-colors">• Anuradhapura</a></li>
                        <li><a href="#" class="hover:text-[#ffc800] transition-colors">• Ratnapura</a></li>
                        <li><a href="#" class="hover:text-[#ffc800] transition-colors">• Jaffna</a></li>
                    </ul>
                </div>

                <!-- Column 3: Platform & Support -->
                <div>
                    <h4 class="font-bold text-[#0f172a] text-xs uppercase mb-3 pb-1 border-b border-gray-100 flex items-center gap-2">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
                        Site Information
                    </h4>
                    <ul class="text-[11px] text-gray-600 space-y-2 mb-6">
                        <li><a href="javascript:void(0)" onclick="showServiceInfo('about-us')" class="hover:text-[#ffc800] transition-colors">• About Echo Lanka</a></li>
                        <li><a href="javascript:void(0)" onclick="showServiceInfo('careers')" class="hover:text-[#ffc800] transition-colors">• Career Opportunities</a></li>
                        <li><a href="javascript:void(0)" onclick="showServiceInfo('terms')" class="hover:text-[#ffc800] transition-colors">• Terms and Conditions</a></li>
                        <li><a href="javascript:void(0)" onclick="showServiceInfo('privacy')" class="hover:text-[#ffc800] transition-colors">• Privacy Policy</a></li>
                    </ul>

                    <h4 class="font-bold text-[#0f172a] text-xs uppercase mb-3 pb-1 border-b border-gray-100 flex items-center gap-2">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"></path><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.59.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"></path></svg>
                        Help Center
                    </h4>
                    <ul class="text-[11px] text-gray-600 space-y-2">
                        <li><a href="javascript:void(0)" onclick="showServiceInfo('faq')" class="hover:text-[#ffc800] transition-colors">• FAQ / Getting Started</a></li>
                        <li><a href="javascript:void(0)" onclick="showServiceInfo('stay-safe')" class="hover:text-[#ffc800] transition-colors">• Safety Center</a></li>
                        <li><a href="javascript:void(0)" onclick="showServiceInfo('contact-us')" class="hover:text-[#ffc800] transition-colors">• Contact Support</a></li>
                        <li><a href="javascript:void(0)" onclick="showServiceInfo('sell-fast')" class="hover:text-[#ffc800] transition-colors">• Sell Fast Guide</a></li>
                    </ul>
                </div>
            </div>
        `
    }
};

function showServiceInfo(key) {
    const service = serviceData[key];
    if (!service) return;

    const modal = document.getElementById('serviceInfoModal');
    const content = document.getElementById('serviceInfoModalContent');
    const title = document.getElementById('serviceInfoTitle');
    const subtitle = document.getElementById('serviceInfoSubtitle');
    const body = document.getElementById('serviceInfoBody');

    title.innerText = service.title;
    subtitle.innerText = service.subtitle;
    body.innerHTML = service.content;

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0', 'translate-y-4');
    }, 10);
}

function hideServiceInfo() {
    const modal = document.getElementById('serviceInfoModal');
    const content = document.getElementById('serviceInfoModalContent');

    content.classList.add('scale-95', 'opacity-0', 'translate-y-4');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Admin Moderation Functions
function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    const adminToggle = document.getElementById('adminToggle');
    if (isAdminMode) {
        adminToggle.classList.add('bg-red-50', 'p-1', 'rounded', 'ring-1', 'ring-red-200');
        alert('Admin Mode Enabled: You can now see pending ads.');
    } else {
        adminToggle.classList.remove('bg-red-50', 'p-1', 'rounded', 'ring-1', 'ring-red-200');
        alert('Admin Mode Disabled: Showing only approved ads.');
    }
    fetchAds();
}

async function approveAd(adId) {
    if (!confirm('Approve this advertisement? It will become visible to all users.')) return;

    try {
        const response = await fetch(`${API_URL}/ads/${adId}/approve`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            alert('Ad approved successfully!');
            document.getElementById('adDetailModal').classList.add('hidden');
            fetchAds();
        } else {
            const data = await response.json();
            alert(`Error: ${data.message || 'Failed to approve ad'}`);
        }
    } catch (error) {
        console.error('Error approving ad:', error);
        alert('Network error while approving ad.');
    }
}

async function deleteAdAdmin(adId) {
    if (!confirm('ADMIN: Are you sure you want to delete this advertisement? This will remove it for all users.')) return;

    try {
        const response = await fetch(`${API_URL}/ads/${adId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            alert('Ad deleted by admin.');
            document.getElementById('adDetailModal').classList.add('hidden');
            fetchAds();
        } else {
            const data = await response.json();
            alert(`Error: ${data.message || 'Failed to delete ad'}`);
        }
    } catch (error) {
        console.error('Error in admin delete:', error);
        alert('Network error during admin delete.');
    }
}
