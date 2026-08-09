// hug-system.js
import { db, messaging, VAPID_KEY } from "/firebase-init.js";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, increment,
  collection, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

// Which person is on this page. Leave window.HUG_ROLE unset on HER page
// (it will default to partner_a). On HIS page, set window.HUG_ROLE =
// "partner_b" in an inline <script> tag right before this file loads.
const MY_ID = window.HUG_ROLE === "partner_b" ? "partner_b" : "partner_a";
const PARTNER_ID = MY_ID === "partner_a" ? "partner_b" : "partner_a";

// TEMPORARY: set to true to bring the once-a-day limit back.
const DAILY_LIMIT_ENABLED = false;

const statusRef = doc(db, "hugs", "status");
const counterRef = doc(db, "hugs", "counter");
const tokenRef = doc(db, "tokens", MY_ID);

function todayStr() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// ---------- Register this device for push notifications ----------
async function registerForPush() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      await setDoc(tokenRef, { token, updatedAt: Date.now() });
    }
  } catch (err) {
    console.warn("Push registration skipped:", err);
  }
}

// ---------- Streak + counter display ----------
function renderStreak(streak) {
  const el = document.getElementById("hug-streak");
  if (!el) return;
  if (!streak || streak < 1) {
    el.textContent = "No streak yet — send the first hug!";
  } else {
    el.textContent = `🔥 ${streak} day streak`;
  }
}

function updateButtonState(lastHugDate) {
  const btn = document.getElementById("hug-btn");
  if (!btn) return;
  const already = DAILY_LIMIT_ENABLED && lastHugDate === todayStr();
  btn.disabled = already;
  btn.style.opacity = already ? "0.6" : "1";
  btn.style.cursor = already ? "not-allowed" : "pointer";

  const label = document.getElementById("hug-btn-label");
  if (label) {
    label.textContent = already ? "Come back tomorrow 💤" : "Send a Virtual Hug";
  }
}

// Live-update UI whenever the shared status doc changes
onSnapshot(statusRef, (snap) => {
  const data = snap.data() || {};
  renderStreak(data.streak || 0);
  updateButtonState(data.lastHugDate || null);
});

// Live-update the global counter badge
onSnapshot(counterRef, (docSnap) => {
  const hugCountSpan = document.getElementById("hug-count");
  if (docSnap.exists() && hugCountSpan) {
    hugCountSpan.textContent = docSnap.data().total || 0;
  }
});

// ---------- "You got a hug from him/her" box ----------
function formatReceivedTime(ms) {
  const diffMinutes = Math.round((Date.now() - ms) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

let hideTimeout = null;

function renderReceivedBox(latestEvent) {
  const box = document.getElementById("hug-received-box");
  if (!box) return;

  if (!latestEvent) {
    box.textContent = "No hugs received yet";
    box.classList.remove("has-hug");
    return;
  }

  box.textContent = `🤗 You got a hug ${formatReceivedTime(latestEvent.sentAt)}`;
  box.classList.add("has-hug");

  // Reset timer so it hides cleanly after 5 seconds
  if (hideTimeout) clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    box.textContent = "No hugs received yet";
    box.classList.remove("has-hug");
  }, 10000);
}

// Track when this page session started to ignore old historical hugs
const sessionStartTime = Date.now();

// Listens only for incoming hugs sent TO this person from their partner
const receivedQuery = query(collection(db, "hugEvents"), where("to", "==", MY_ID));
onSnapshot(receivedQuery, (snap) => {
  let latest = null;
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    // Only process if it arrived after page load AND wasn't sent by yourself
    if (data.sentAt > sessionStartTime && data.from !== MY_ID) {
      if (!latest || data.sentAt > latest.sentAt) latest = data;
    }
  });

  if (latest) {
    renderReceivedBox(latest);
  }
});

// ---------- Sending a hug (limit + streak + counter logic lives here) ----------
async function sendHug() {
  const snap = await getDoc(statusRef);
  const data = snap.exists() ? snap.data() : {};
  const today = todayStr();

  if (DAILY_LIMIT_ENABLED && data.lastHugDate === today) {
    return false; // already used today's hug
  }

  let newStreak = 1;
  if (data.lastHugDate === yesterdayStr()) {
    newStreak = (data.streak || 0) + 1;
  }

  await setDoc(statusRef, {
    lastHugDate: today,
    streak: newStreak,
    lastSender: MY_ID
  }, { merge: true });

  await setDoc(counterRef, { total: increment(1) }, { merge: true });

  const now = Date.now();
  await setDoc(doc(db, "hugEvents", `${MY_ID}_${now}`), {
    from: MY_ID,
    to: PARTNER_ID,
    sentAt: now
  });

  // Note: Removed renderReceivedBox here so your own screen doesn't trigger your own notification box!

  return true;
}

// ---------- Wire up the existing button ----------
document.addEventListener("DOMContentLoaded", () => {
  registerForPush();

  const btn = document.getElementById("hug-btn");
  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    const allowed = await sendHug();
    if (!allowed) {
      e.stopImmediatePropagation();
      return;
    }

    if (typeof triggerHugAnimation === "function") {
      triggerHugAnimation();
    }
  });
});