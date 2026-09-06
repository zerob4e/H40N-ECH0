const VERSION = "12.18.0";
const APP = `https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`;
const AUTH = `https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`;
const STORE = `https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`;

let cache = null;

function configured() {
  const c = window.MIRROR_FIREBASE_CONFIG || {};
  return Boolean(c.apiKey && c.projectId && !String(c.apiKey).includes("PASTE_") && !String(c.projectId).includes("PASTE_"));
}

export async function getFirebase() {
  if (cache) return cache;
  if (!configured()) return null;

  const [{ initializeApp }, authMod, dbMod] = await Promise.all([
    import(APP), import(AUTH), import(STORE)
  ]);

  const app = initializeApp(window.MIRROR_FIREBASE_CONFIG);
  const auth = authMod.getAuth(app);
  const db = dbMod.getFirestore(app);
  cache = { app, auth, db, authMod, dbMod };
  return cache;
}

export async function ensureAnonymousUser() {
  const fb = await getFirebase();
  if (!fb) return null;
  if (fb.auth.currentUser) return fb.auth.currentUser;
  const credential = await fb.authMod.signInAnonymously(fb.auth);
  return credential.user;
}

export { configured };
