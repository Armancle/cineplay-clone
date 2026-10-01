/* CinePlay - Central Firestore Database & Cache Service */

const CinePlayFirestoreService = {
  get db() {
    return window.firebaseDb;
  },

  get isEnabled() {
    return window.useFirebase && window.firebaseDb !== null;
  },

  // Helper to check document freshness (24h TTL)
  isDocFresh(docData) {
    if (!docData || !docData.updatedAt) return false;
    const updatedAt = new Date(docData.updatedAt).getTime();
    const now = new Date().getTime();
    const ttlMs = window.CINEPLAY_CONFIG.CACHE.EXPIRATION_MS;
    return (now - updatedAt) < ttlMs;
  },

  /* ==========================================================================
     1. MOVIES COLLECTION (movies/{tmdbId})
     ========================================================================== */

  async getMovie(movieId) {
    if (!this.isEnabled) return null;
    try {
      const cleanId = String(movieId).replace("tmdb_", "");
      const docRef = this.db.collection("movies").doc(cleanId);
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 500));
      const docSnap = await Promise.race([docRef.get(), timeout]);

      if (docSnap && docSnap.exists) {
        const data = docSnap.data();
        if (this.isDocFresh(data)) {
          return data;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  async saveMovie(movie) {
    if (!this.isEnabled || !movie) return false;
    try {
      const cleanId = String(movie.tmdbId || movie.id).replace("tmdb_", "");
      const movieDoc = {
        ...movie,
        updatedAt: new Date().toISOString()
      };
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 500));
      await Promise.race([this.db.collection("movies").doc(cleanId).set(movieDoc, { merge: true }), timeout]);
      return true;
    } catch (error) {
      return false;
    }
  },

  /* ==========================================================================
     2. GAMES COLLECTION (games/{steamAppId})
     ========================================================================== */

  async getGame(gameId) {
    if (!this.isEnabled) return null;
    try {
      const cleanId = String(gameId).replace("steam_", "");
      const docRef = this.db.collection("games").doc(cleanId);
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 500));
      const docSnap = await Promise.race([docRef.get(), timeout]);

      if (docSnap && docSnap.exists) {
        const data = docSnap.data();
        if (this.isDocFresh(data)) {
          return data;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  async saveGame(game) {
    if (!this.isEnabled || !game) return false;
    try {
      const cleanId = String(game.steamAppId || game.id).replace("steam_", "");
      const gameDoc = {
        ...game,
        updatedAt: new Date().toISOString()
      };
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 500));
      await Promise.race([this.db.collection("games").doc(cleanId).set(gameDoc, { merge: true }), timeout]);
      return true;
    } catch (error) {
      return false;
    }
  },

  /* ==========================================================================
     3. PEOPLE COLLECTION (people/{tmdbId})
     ========================================================================== */

  async getPerson(personId) {
    if (!this.isEnabled) return null;
    try {
      const cleanId = String(personId).replace("person_", "");
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 500));
      const docSnap = await Promise.race([this.db.collection("people").doc(cleanId).get(), timeout]);
      if (docSnap && docSnap.exists && this.isDocFresh(docSnap.data())) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  async savePerson(person) {
    if (!this.isEnabled || !person) return false;
    try {
      const cleanId = String(person.tmdbId || person.id).replace("person_", "");
      await this.db.collection("people").doc(cleanId).set({
        ...person,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (error) {
      return false;
    }
  },

  /* ==========================================================================
     4. USER PREFERENCES, FAVORITES & HISTORY (users/{uid}/...)
     ========================================================================== */

  async saveUserDislike(uid, item) {
    if (!this.isEnabled || !uid || !item) return false;
    try {
      const prefRef = this.db.collection("users").doc(uid).collection("preferences").doc("dislikes");
      await prefRef.set({
        dislikedItems: firebase.firestore.FieldValue.arrayUnion(item.id),
        dislikedGenres: firebase.firestore.FieldValue.arrayUnion(...(item.genre || item.genres || [])),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (error) {
      console.warn("[Firestore Error] saveUserDislike:", error);
      return false;
    }
  },

  async saveUserFavorite(uid, type, item) {
    if (!this.isEnabled || !uid || !item) return false;
    try {
      const favRef = this.db.collection("users").doc(uid).collection("favorites").doc(item.id);
      await favRef.set({
        id: item.id,
        type: type,
        title: item.title || item.name,
        poster: item.poster || item.headerImage,
        rating: item.rating || 8.0,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.warn("[Firestore Error] saveUserFavorite:", error);
      return false;
    }
  },

  async removeUserFavorite(uid, itemId) {
    if (!this.isEnabled || !uid || !itemId) return false;
    try {
      await this.db.collection("users").doc(uid).collection("favorites").doc(itemId).delete();
      return true;
    } catch (error) {
      console.warn("[Firestore Error] removeUserFavorite:", error);
      return false;
    }
  },

  async getUserFavorites(uid) {
    if (!this.isEnabled || !uid) return [];
    try {
      const snap = await this.db.collection("users").doc(uid).collection("favorites").get();
      const list = [];
      snap.forEach(doc => list.push(doc.data()));
      return list;
    } catch (error) {
      console.warn("[Firestore Error] getUserFavorites:", error);
      return [];
    }
  },

  async recordUserHistory(uid, type, item) {
    if (!this.isEnabled || !uid || !item) return false;
    try {
      const histRef = this.db.collection("users").doc(uid).collection("history").doc(item.id);
      await histRef.set({
        id: item.id,
        type: type,
        title: item.title || item.name,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      return false;
    }
  }
};

window.CinePlayFirestoreService = CinePlayFirestoreService;
