const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendHugPush = onDocumentCreated("hugEvents/{eventId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return null;
  const data = snapshot.data();
  
  const recipientId = data.to; // "partner_a" or "partner_b"
  if (!recipientId) return null;

  // Fetch the token specific to the recipient
  const tokenDoc = await admin.firestore().collection("tokens").doc(recipientId).get();
  if (!tokenDoc.exists) return null;
  
  const token = tokenDoc.data().token;
  if (!token) return null;

  const senderName = data.from === "partner_a" ? "Partner A" : "Partner B";

  const message = {
    notification: {
      title: "Virtual Hug! ❤️",
      body: `${senderName} sent you a virtual hug!`,
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
    return null;
  } catch (error) {
    console.log("Error sending message:", error);
    return null;
  }
});