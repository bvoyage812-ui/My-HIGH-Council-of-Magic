import { auth, db, googleProvider } from "./firebase-init.js";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const MY_ROLE = window.HUG_ROLE === "emma" ? "emma" : "nin";
const PARTNER_ROLE = MY_ROLE === "nin" ? "emma" : "nin";
const stateRef = doc(db, "hugs", "state");

const button = document.getElementById("hug-btn");
const buttonLabel = document.getElementById("hug-btn-label");
const totalCount = document.getElementById("hug-count");
const receivedBox = document.getElementById("hug-received-box");
const statusText = document.getElementById("hug-streak");

let unsubscribeFromHugs = null;
let previousReceived = null;

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Could not save the sign-in session:", error);
});

function setStatus(message, isError = false) {
  if (!statusText) return;
  statusText.textContent = message;
  statusText.classList.toggle("hug-error", isError);
}

function renderState(data = {}) {
  const total = Number(data.total) || 0;
  const received = Number(data[`${MY_ROLE}Received`]) || 0;

  if (totalCount) totalCount.textContent = String(total);
  if (receivedBox) {
    receivedBox.textContent = `You've received ${received} ${received === 1 ? "hug" : "hugs"}`;
    receivedBox.classList.toggle("has-hug", received > 0);
  }

  if (previousReceived !== null && received > previousReceived) {
    const newHugs = Math.min(received - previousReceived, 8);
    for (let index = 0; index < newHugs; index += 1) {
      window.setTimeout(() => launchHeart("incoming"), index * 180);
    }
  }

  previousReceived = received;
}

function stopListening() {
  if (unsubscribeFromHugs) unsubscribeFromHugs();
  unsubscribeFromHugs = null;
  previousReceived = null;
}

function startListening() {
  stopListening();
  unsubscribeFromHugs = onSnapshot(
    stateRef,
    (snapshot) => renderState(snapshot.exists() ? snapshot.data() : {}),
    (error) => {
      console.error("Could not listen for hugs:", error);
      setStatus("The hugs could not be loaded. Check the Firestore rules.", true);
    },
  );
}

function launchHeart(direction) {
  if (!button) return;

  const buttonRect = button.getBoundingClientRect();
  const buttonX = buttonRect.left + buttonRect.width / 2;
  const buttonY = buttonRect.top + buttonRect.height / 2;
  const partnerEdgeX = MY_ROLE === "nin" ? window.innerWidth + 70 : -70;
  const isIncoming = direction === "incoming";
  const startX = isIncoming ? partnerEdgeX : buttonX;
  const startY = isIncoming ? window.innerHeight / 2 : buttonY;
  const endX = isIncoming ? buttonX : partnerEdgeX;
  const endY = isIncoming ? buttonY : window.innerHeight / 2;
  const midX = (startX + endX) / 2;
  const midY = Math.max(70, Math.min(startY, endY) - 110);

  const heart = document.createElement("div");
  heart.className = `flying-hug ${isIncoming ? "is-incoming" : "is-outgoing"}`;
  heart.textContent = "♥";
  heart.setAttribute("aria-hidden", "true");
  heart.style.left = `${startX}px`;
  heart.style.top = `${startY}px`;
  heart.style.setProperty("--mid-x", `${midX - startX}px`);
  heart.style.setProperty("--mid-y", `${midY - startY}px`);
  heart.style.setProperty("--end-x", `${endX - startX}px`);
  heart.style.setProperty("--end-y", `${endY - startY}px`);
  document.body.appendChild(heart);
  heart.addEventListener("animationend", () => heart.remove(), { once: true });
}

async function signIn() {
  if (auth.currentUser) return auth.currentUser;
  setStatus("Opening Google sign-in...");
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

async function sendHug() {
  await signIn();

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    const state = snapshot.exists() ? snapshot.data() : {};
    const ninReceived = Number(state.ninReceived) || 0;
    const emmaReceived = Number(state.emmaReceived) || 0;

    transaction.set(stateRef, {
      total: (Number(state.total) || 0) + 1,
      ninReceived: ninReceived + (PARTNER_ROLE === "nin" ? 1 : 0),
      emmaReceived: emmaReceived + (PARTNER_ROLE === "emma" ? 1 : 0),
      lastSender: MY_ROLE,
      updatedAt: serverTimestamp(),
    });
  });

  launchHeart("outgoing");
}

onAuthStateChanged(auth, (user) => {
  if (!button) return;

  if (user) {
    button.disabled = false;
    setStatus("Connected — hugs update in real time.");
    startListening();
  } else {
    stopListening();
    button.disabled = false;
    if (totalCount) totalCount.textContent = "—";
    if (receivedBox) receivedBox.textContent = "Sign in to see your hugs";
    setStatus("Google sign-in will open when you send your first hug.");
  }
});

if (button) {
  button.addEventListener("click", async () => {
    button.disabled = true;
    if (buttonLabel) buttonLabel.textContent = "Sending...";

    try {
      await sendHug();
      setStatus("Hug sent! ♥");
    } catch (error) {
      console.error("Could not send the hug:", error);
      const permissionDenied = error?.code === "permission-denied"
        || error?.code === "firestore/permission-denied";

      if (permissionDenied) {
        await signOut(auth).catch(() => {});
      }

      const message = error?.code === "auth/popup-closed-by-user"
        ? "Sign-in was cancelled. No hug was sent."
        : permissionDenied
          ? "This account is not authorized for this side. Choose the other Google account."
          : "The hug could not be sent. Check your connection and try again.";
      setStatus(message, true);
    } finally {
      button.disabled = false;
      if (buttonLabel) buttonLabel.textContent = "Send a Virtual Hug";
    }
  });
}
