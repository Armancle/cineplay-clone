/* CinePlay - Authentication and Cloud Sync Manager */

document.addEventListener("DOMContentLoaded", () => {
  initAuthUI();
  setupAuthListeners();
});

// Current user state
let currentUser = null;

// Safe Toast Dispatcher that works across all pages (even if app.js is not loaded)
function safeShowToast(msg, icon = "fa-solid fa-circle-user") {
  if (window.CinePlay && typeof window.CinePlay.showToast === "function") {
    window.CinePlay.showToast(msg, icon);
  }
}

// Initialize the Auth UI placeholders
function initAuthUI() {
  const authContainers = document.querySelectorAll("#auth-container");
  if (authContainers.length === 0) return;

  authContainers.forEach(container => {
    container.innerHTML = `
      <div class="auth-wrapper">
        <a href="login.html" id="nav-login-btn" class="nav-auth-btn btn btn-outline" aria-label="Sign In or Register" style="text-decoration:none;">
          <i class="fa-solid fa-user"></i> <span>Sign In</span>
        </a>
        <div id="nav-user-badge" class="user-profile" style="display: none;">
          <img id="nav-user-avatar" class="user-avatar" src="" alt="User Avatar" referrerpolicy="no-referrer" loading="lazy">
          <span id="nav-user-name" class="user-name"></span>
          <button id="nav-logout-btn" class="logout-btn" title="Logout" aria-label="Logout">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </div>
    `;

    // Add click listeners
    const logoutBtn = container.querySelector("#nav-logout-btn");
    const avatarImg = container.querySelector("#nav-user-avatar");

    if (logoutBtn) logoutBtn.addEventListener("click", logout);
    if (avatarImg) {
      avatarImg.addEventListener("error", function() {
        const userName = container.querySelector("#nav-user-name")?.textContent || "User";
        this.onerror = null;
        this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=e50914&color=ffffff&bold=true&rounded=true`;
      });
    }
  });
}

// Setup state listeners for Firebase or Mock Auth
function setupAuthListeners() {
  if (window.useFirebase) {
    // Ensure persistence is set to LOCAL
    try {
      window.firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (e) {
      console.warn("Persistence setting error:", e);
    }

    // Handle return from redirect (crucial for mobile devices)
    window.firebaseAuth.getRedirectResult()
      .then(async (result) => {
        if (result && result.user) {
          currentUser = result.user;
          const photo = result.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.user.displayName || "User")}&background=e50914&color=ffffff&bold=true&rounded=true`;
          updateUIForLoggedInUser(result.user.displayName, photo);
          await syncUserDataOnLogin(result.user.uid);
          safeShowToast(`Welcome back, ${result.user.displayName}!`, "fa-solid fa-circle-user");
        }
      })
      .catch((error) => {
        if (error.code && error.code !== "auth/null-user" && error.code !== "auth/credential-already-in-use") {
          console.warn("Redirect result error:", error);
        }
      });

    // Listen to continuous auth state changes
    window.firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        currentUser = user;
        const photo = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "User")}&background=e50914&color=ffffff&bold=true&rounded=true`;
        updateUIForLoggedInUser(user.displayName, photo);
        await syncUserDataOnLogin(user.uid);
      } else {
        currentUser = null;
        updateUIForLoggedOutUser();
      }
    });
    // Check PHP Backend Session first
    checkPhpSession().then(hasSession => {
      if (hasSession) return;

      // Check local storage for mock user session
      const savedMockUser = localStorage.getItem("cineplay_mock_user");
      if (savedMockUser) {
        try {
          const user = JSON.parse(savedMockUser);
          currentUser = user;
          updateUIForLoggedInUser(user.displayName, user.photoURL);
          syncUserDataOnLogin(user.uid);
        } catch (e) {
          console.error("Error parsing mock user", e);
        }
      } else {
        currentUser = null;
        updateUIForLoggedOutUser();
      }
    });
  }
}

// Check if an active PHP session exists on backend
async function checkPhpSession() {
  try {
    const authEndpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.AUTH) || "../backend/api/auth.php";
    const res = await fetch(`${authEndpoint}?action=me`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.logged_in && data.user) {
        currentUser = {
          uid: data.user.user_id,
          displayName: data.user.username,
          email: data.user.email,
          isPhpUser: true
        };
        const photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}&background=e50914&color=ffffff&bold=true&rounded=true`;
        updateUIForLoggedInUser(data.user.username, photo);
        await syncUserDataOnLogin(data.user.user_id);
        return true;
      }
    }
  } catch (e) {
    // Backend offline or non-PHP server, gracefully ignore
  }
  return false;
}

// Update UI to logged-in state
function updateUIForLoggedInUser(name, photoURL) {
  const loginBtns = document.querySelectorAll("#nav-login-btn");
  const userBadges = document.querySelectorAll("#nav-user-badge");
  const avatars = document.querySelectorAll("#nav-user-avatar");
  const names = document.querySelectorAll("#nav-user-name");

  const displayName = name ? name.split(" ")[0] : "User";
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=e50914&color=ffffff&bold=true&rounded=true`;

  loginBtns.forEach(btn => btn.style.display = "none");
  userBadges.forEach(badge => badge.style.display = "flex");
  avatars.forEach(avatar => {
    avatar.setAttribute("referrerpolicy", "no-referrer");
    avatar.onerror = function() {
      this.onerror = null;
      this.src = defaultAvatar;
    };
    avatar.src = photoURL || defaultAvatar;
  });
  names.forEach(n => n.textContent = displayName);
}

// Update UI to logged-out state
function updateUIForLoggedOutUser() {
  const loginBtns = document.querySelectorAll("#nav-login-btn");
  const userBadges = document.querySelectorAll("#nav-user-badge");

  loginBtns.forEach(btn => btn.style.display = "flex");
  userBadges.forEach(badge => badge.style.display = "none");
}

// Trigger Google Login
function login() {
  if (window.useFirebase) {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Try popup first (fastest on desktop and supported mobile browsers)
    window.firebaseAuth.signInWithPopup(provider)
      .then((result) => {
        if (result && result.user) {
          safeShowToast(`Welcome back, ${result.user.displayName}!`, "fa-solid fa-circle-user");
        }
      })
      .catch((error) => {
        console.error("Firebase Login Error:", error);
        
        // If popup is blocked or fails on mobile browser due to popup restrictions, fallback to redirect
        if (
          error.code === "auth/popup-blocked" || 
          error.code === "auth/cancelled-popup-request" ||
          error.code === "auth/popup-closed-by-user"
        ) {
          safeShowToast("Opening secure Google Sign-In...", "fa-brands fa-google");
          window.firebaseAuth.signInWithRedirect(provider).catch(e => {
            console.error("Redirect fallback error:", e);
            safeShowToast("Login failed. Check authorized domains in Firebase.", "fa-solid fa-circle-exclamation");
          });
        } else if (error.code === "auth/unauthorized-domain") {
          safeShowToast("Domain not authorized in Firebase Console Settings.", "fa-solid fa-triangle-exclamation");
        } else {
          safeShowToast("Login issue: " + (error.message || "Please try again"), "fa-solid fa-circle-exclamation");
        }
      });
  } else {
    showMockAuthPopup();
  }
}

// Trigger Sign Out
function logout() {
  if (confirm("Are you sure you want to log out?")) {
    if (currentUser && currentUser.isPhpUser) {
      const authEndpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.AUTH) || "../backend/api/auth.php";
      fetch(`${authEndpoint}?action=logout`, { method: "POST", credentials: "include" })
        .finally(() => {
          localStorage.removeItem("cineplay_favorites");
          localStorage.removeItem("cineplay_dislikes");
          currentUser = null;
          updateUIForLoggedOutUser();
          window.dispatchEvent(new Event("favoritesChanged"));
          window.dispatchEvent(new Event("dislikesChanged"));
          safeShowToast("Logged out successfully", "fa-solid fa-right-from-bracket");
        });
      return;
    }

    if (window.useFirebase) {
      window.firebaseAuth.signOut().then(() => {
        // Clear local storage favorites and dislikes on logout
        localStorage.removeItem("cineplay_favorites");
        localStorage.removeItem("cineplay_dislikes");
        window.dispatchEvent(new Event("favoritesChanged"));
        window.dispatchEvent(new Event("dislikesChanged"));
        safeShowToast("Logged out successfully", "fa-solid fa-right-from-bracket");
      });
    } else {
      localStorage.removeItem("cineplay_mock_user");
      localStorage.removeItem("cineplay_favorites");
      localStorage.removeItem("cineplay_dislikes");
      currentUser = null;
      updateUIForLoggedOutUser();
      window.dispatchEvent(new Event("favoritesChanged"));
      window.dispatchEvent(new Event("dislikesChanged"));
      safeShowToast("Logged out", "fa-solid fa-right-from-bracket");
    }
  }
}

// Sync local wishlist and dislikes with cloud/mock database upon login
async function syncUserDataOnLogin(uid) {
  let localFavs = JSON.parse(localStorage.getItem("cineplay_favorites")) || [];
  let localDislikes = JSON.parse(localStorage.getItem("cineplay_dislikes")) || [];
  let cloudFavs = [];
  let cloudDislikes = [];

  if (currentUser && currentUser.isPhpUser) {
    try {
      const favEndpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.FAVORITES) || "../backend/api/favorites.php";
      const res = await fetch(`${favEndpoint}?action=list`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          cloudFavs = json.data.map(item => ({
            id: item.item_id,
            type: item.item_type,
            title: item.title,
            poster: item.poster_url,
            rating: item.rating
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch favorites from MySQL:", e);
    }
  } else if (window.useFirebase && window.firebaseDb) {
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 1000));
      const docRef = window.firebaseDb.collection("users").doc(uid);
      const doc = await Promise.race([docRef.get(), timeoutPromise]);
      if (doc && doc.exists) {
        const data = doc.data();
        cloudFavs = data.favorites || [];
        cloudDislikes = data.dislikes || [];
      }
    } catch (e) {
      console.warn("Firestore sync skipped (timeout or offline):", e.message);
    }
  } else {
    // Read from Mock user data in local storage
    const mockDbFavs = localStorage.getItem(`cineplay_favorites_mock_${uid}`);
    if (mockDbFavs) cloudFavs = JSON.parse(mockDbFavs);
    const mockDbDislikes = localStorage.getItem(`cineplay_dislikes_mock_${uid}`);
    if (mockDbDislikes) cloudDislikes = JSON.parse(mockDbDislikes);
  }

  // Merge favorites (preserving uniqueness by id)
  let mergedFavs = [...cloudFavs];
  localFavs.forEach(localItem => {
    const localId = String(typeof localItem === "object" ? localItem.id : localItem);
    if (!mergedFavs.some(cloudItem => String(typeof cloudItem === "object" ? cloudItem.id : cloudItem) === localId)) {
      mergedFavs.push(localItem);
    }
  });

  // Merge dislikes (preserving uniqueness by id)
  let mergedDislikes = [...cloudDislikes];
  localDislikes.forEach(localItem => {
    const localId = String(typeof localItem === "object" ? localItem.id : localItem);
    if (!mergedDislikes.some(cloudItem => String(typeof cloudItem === "object" ? cloudItem.id : cloudItem) === localId)) {
      mergedDislikes.push(localItem);
    }
  });

  // Save the merged data back to the database
  if (window.useFirebase && window.firebaseDb) {
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 1000));
      await Promise.race([
        window.firebaseDb.collection("users").doc(uid).set({
          favorites: mergedFavs,
          dislikes: mergedDislikes,
          updatedAt: new Date().toISOString()
        }, { merge: true }),
        timeoutPromise
      ]);
    } catch (e) {
      console.warn("Firestore save skipped:", e.message);
    }
  } else {
    localStorage.setItem(`cineplay_favorites_mock_${uid}`, JSON.stringify(mergedFavs));
    localStorage.setItem(`cineplay_dislikes_mock_${uid}`, JSON.stringify(mergedDislikes));
  }

  // Save back to local storage and notify app layers
  localStorage.setItem("cineplay_favorites", JSON.stringify(mergedFavs));
  localStorage.setItem("cineplay_dislikes", JSON.stringify(mergedDislikes));
  window.dispatchEvent(new Event("favoritesChanged"));
  window.dispatchEvent(new Event("dislikesChanged"));
}

// Save active wishlist to the database (triggered by actions)
async function syncFavoritesToCloud(favorites) {
  if (!currentUser) return;

  if (currentUser.isPhpUser) {
    const favEndpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.FAVORITES) || "../backend/api/favorites.php";
    if (Array.isArray(favorites)) {
      if (favorites.length === 0) {
        try {
          await fetch(`${favEndpoint}?action=clear`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ action: "clear", user_id: currentUser.uid })
          });
        } catch (e) {
          console.warn("Failed to clear favorites in MySQL:", e);
        }
        return;
      }
      // Sync each favorite to MySQL
      for (const fav of favorites) {
        const itemObj = typeof fav === "object" ? fav : { id: fav, title: fav };
        try {
          await fetch(favEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              action: "add",
              user_id: currentUser.uid,
              item_id: String(itemObj.id || itemObj.tmdbId || itemObj.steamAppId || itemObj.item_id || ""),
              item_type: itemObj.type || (String(itemObj.id).startsWith("steam_") ? "game" : "movie"),
              title: itemObj.title || itemObj.name || "Untitled",
              poster_url: itemObj.poster || itemObj.poster_path || itemObj.poster_url || "",
              rating: itemObj.rating || itemObj.vote_average || null
            })
          });
        } catch (e) {
          console.warn("Failed to sync favorite to MySQL:", e);
        }
      }
    }
    return;
  }

  if (window.useFirebase) {
    try {
      await window.firebaseDb.collection("users").doc(currentUser.uid).set({
        favorites,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error syncing favorites to Firestore", e);
    }
  } else {
    localStorage.setItem(`cineplay_favorites_mock_${currentUser.uid}`, JSON.stringify(favorites));
  }
}

// Save active dislikes to the database (triggered by actions)
async function syncDislikesToCloud(dislikes) {
  if (!currentUser) return;

  if (window.useFirebase) {
    try {
      await window.firebaseDb.collection("users").doc(currentUser.uid).set({
        dislikes,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error syncing dislikes to Firestore", e);
    }
  } else {
    localStorage.setItem(`cineplay_dislikes_mock_${currentUser.uid}`, JSON.stringify(dislikes));
  }
}

// Helper: Show custom PHP / MySQL Sign-In Modal Popup
function showMockAuthPopup() {
  let modal = document.getElementById("cineplay-auth-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "cineplay-auth-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content glass-panel" style="max-width: 440px; padding: 35px 30px; text-align: center; display: flex; flex-direction: column; gap: 15px; position: relative;">
        <button class="modal-close" id="auth-modal-close-btn" style="position: absolute; top: 15px; right: 15px;"><i class="fa-solid fa-xmark"></i></button>
        <div style="font-size: 38px; color: var(--accent-red); margin-bottom: -5px;">
          <i class="fa-solid fa-database"></i>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; color: var(--text-primary);">Account & MySQL Sync</h2>
        
        <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 5px;">
          <button id="auth-tab-login" class="btn btn-outline" style="flex: 1; padding: 8px; border-radius: 20px; font-size: 14px; font-weight: 600; border-color: var(--accent-red); color: var(--accent-red);">Login</button>
          <button id="auth-tab-register" class="btn" style="flex: 1; padding: 8px; border-radius: 20px; font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.06); color: var(--text-muted);">Register</button>
        </div>

        <div id="auth-error-banner" style="display: none; padding: 10px; border-radius: 8px; background: rgba(229,9,20,0.15); border: 1px solid rgba(229,9,20,0.4); color: #ff6b6b; font-size: 13px; text-align: left;"></div>

        <form id="auth-form" style="display: flex; flex-direction: column; gap: 12px; text-align: left;">
          <div id="field-username-container" style="display: none;">
            <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Username</label>
            <input type="text" id="auth-input-username" placeholder="e.g. Cinephile99" style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.4); color: #fff; font-size: 14px;">
          </div>
          <div>
            <label id="auth-identifier-label" style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Email or Username</label>
            <input type="text" id="auth-input-identifier" placeholder="e.g. user@cineplay.local" required style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.4); color: #fff; font-size: 14px;">
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Password</label>
            <input type="password" id="auth-input-password" placeholder="••••••••" required style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.4); color: #fff; font-size: 14px;">
          </div>
          <button type="submit" id="auth-submit-btn" class="btn btn-primary" style="width: 100%; padding: 11px; border-radius: 25px; font-weight: 600; margin-top: 5px;">
            Sign In
          </button>
        </form>

        <div style="display: flex; align-items: center; gap: 10px; margin: 5px 0;">
          <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
          <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">or</span>
          <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
        </div>

        <button class="btn btn-outline" id="mock-guest-btn" style="width: 100%; padding: 9px; border-radius: 20px; font-size: 13px; font-weight: 600;">
          <i class="fa-solid fa-user-astronaut"></i> Quick Demo Login
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector("#auth-modal-close-btn");
    const tabLogin = modal.querySelector("#auth-tab-login");
    const tabRegister = modal.querySelector("#auth-tab-register");
    const usernameContainer = modal.querySelector("#field-username-container");
    const identifierLabel = modal.querySelector("#auth-identifier-label");
    const submitBtn = modal.querySelector("#auth-submit-btn");
    const form = modal.querySelector("#auth-form");
    const errBanner = modal.querySelector("#auth-error-banner");
    const guestBtn = modal.querySelector("#mock-guest-btn");

    let currentMode = "login"; // 'login' or 'register'

    tabLogin.addEventListener("click", () => {
      currentMode = "login";
      tabLogin.style.borderColor = "var(--accent-red)";
      tabLogin.style.color = "var(--accent-red)";
      tabRegister.style.borderColor = "transparent";
      tabRegister.style.color = "var(--text-muted)";
      usernameContainer.style.display = "none";
      identifierLabel.textContent = "Email or Username";
      submitBtn.textContent = "Sign In";
      errBanner.style.display = "none";
    });

    tabRegister.addEventListener("click", () => {
      currentMode = "register";
      tabRegister.style.borderColor = "var(--accent-red)";
      tabRegister.style.color = "var(--accent-red)";
      tabLogin.style.borderColor = "transparent";
      tabLogin.style.color = "var(--text-muted)";
      usernameContainer.style.display = "block";
      identifierLabel.textContent = "Email Address";
      submitBtn.textContent = "Create Account";
      errBanner.style.display = "none";
    });

    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errBanner.style.display = "none";
      const identifier = modal.querySelector("#auth-input-identifier").value.trim();
      const password = modal.querySelector("#auth-input-password").value;
      const username = modal.querySelector("#auth-input-username").value.trim();

      const authEndpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.AUTH) || "../backend/api/auth.php";

      submitBtn.disabled = true;
      submitBtn.textContent = "Please wait...";

      try {
        const payload = currentMode === "register" 
          ? { action: "register", username, email: identifier, password }
          : { action: "login", identifier, password };

        const res = await fetch(`${authEndpoint}?action=${currentMode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Authentication failed.");
        }

        // Successfully authenticated with PHP / MySQL
        currentUser = {
          uid: data.user.user_id,
          displayName: data.user.username,
          email: data.user.email,
          isPhpUser: true
        };
        const photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}&background=e50914&color=ffffff&bold=true&rounded=true`;
        updateUIForLoggedInUser(data.user.username, photo);
        await syncUserDataOnLogin(data.user.user_id);

        modal.classList.remove("active");
        safeShowToast(data.message || `Welcome, ${data.user.username}!`, "fa-solid fa-circle-user");
      } catch (err) {
        errBanner.textContent = err.message || "An error occurred. Check XAMPP MySQL status.";
        errBanner.style.display = "block";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = currentMode === "register" ? "Create Account" : "Sign In";
      }
    });

    guestBtn.addEventListener("click", () => {
      const mockUserObj = {
        uid: "guest_user",
        displayName: "Guest Cinephile",
        photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
        isPhpUser: false
      };
      localStorage.setItem("cineplay_mock_user", JSON.stringify(mockUserObj));
      currentUser = mockUserObj;
      updateUIForLoggedInUser(mockUserObj.displayName, mockUserObj.photoURL);
      modal.classList.remove("active");
      syncUserDataOnLogin(mockUserObj.uid);
      safeShowToast("Logged in as Guest", "fa-solid fa-circle-user");
    });
  }

  modal.classList.add("active");
}

// Exported Auth Action Methods
async function loginManual(identifier, password) {
  const authEndpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.AUTH) || "../backend/api/auth.php";
  const res = await fetch(`${authEndpoint}?action=login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ identifier, password })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Login failed.");
  }
  currentUser = {
    uid: data.user.user_id,
    displayName: data.user.username,
    email: data.user.email,
    isPhpUser: true
  };
  const photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}&background=e50914&color=ffffff&bold=true&rounded=true`;
  updateUIForLoggedInUser(data.user.username, photo);
  await syncUserDataOnLogin(data.user.user_id);
  safeShowToast(data.message || `Welcome, ${data.user.username}!`, "fa-solid fa-circle-user");
  return data;
}

async function registerManual(username, email, password) {
  const authEndpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.AUTH) || "../backend/api/auth.php";
  const res = await fetch(`${authEndpoint}?action=register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Registration failed.");
  }
  currentUser = {
    uid: data.user.user_id,
    displayName: data.user.username,
    email: data.user.email,
    isPhpUser: true
  };
  const photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}&background=e50914&color=ffffff&bold=true&rounded=true`;
  updateUIForLoggedInUser(data.user.username, photo);
  await syncUserDataOnLogin(data.user.user_id);
  safeShowToast(data.message || `Welcome, ${data.user.username}!`, "fa-solid fa-circle-user");
  return data;
}

async function loginGoogle() {
  if (window.useFirebase && window.firebaseAuth) {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await window.firebaseAuth.signInWithPopup(provider);
    if (result && result.user) {
      // Sync Google user with MySQL backend
      const authEndpoint = (window.CINEPLAY_CONFIG && window.CINEPLAY_CONFIG.BACKEND && window.CINEPLAY_CONFIG.BACKEND.AUTH) || "../backend/api/auth.php";
      try {
        const res = await fetch(`${authEndpoint}?action=firebase_auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            uid: result.user.uid
          })
        });
        const data = await res.json();
        if (data && data.success && data.user) {
          currentUser = {
            uid: data.user.user_id,
            displayName: data.user.username,
            email: data.user.email,
            photoURL: data.user.photoURL || result.user.photoURL,
            isPhpUser: true
          };
          updateUIForLoggedInUser(currentUser.displayName, currentUser.photoURL);
          await syncUserDataOnLogin(data.user.user_id);
          safeShowToast(`Welcome back, ${currentUser.displayName}!`, "fa-solid fa-circle-user");
          return currentUser;
        }
      } catch (e) {
        console.warn("MySQL sync for Google user failed, falling back to local:", e);
      }
      currentUser = result.user;
      updateUIForLoggedInUser(result.user.displayName, result.user.photoURL);
      await syncUserDataOnLogin(result.user.uid);
      safeShowToast(`Welcome back, ${result.user.displayName}!`, "fa-solid fa-circle-user");
      return currentUser;
    }
  } else {
    throw new Error("Google Sign-In requires active Firebase settings. Use Username & Password to sign in directly with MySQL!");
  }
}

// Export auth references
window.CinePlayAuth = {
  getCurrentUser: () => currentUser,
  isLoggedIn: () => currentUser !== null,
  syncFavoritesToCloud,
  syncDislikesToCloud,
  loginManual,
  registerManual,
  loginGoogle,
  showMockAuthPopup
};
