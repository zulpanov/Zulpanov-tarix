// Firebase Realtime Database qoidalarini (database.rules.json) avtomatik joylash — GitHub Actions'dan
// Kerak: FIREBASE_SA sirri (Firebase → Project settings → Service accounts → Generate new private key fayli matni)
const fs = require("fs"), { GoogleAuth } = require("google-auth-library");
const DB = "https://zulpanov-tarix-default-rtdb.europe-west1.firebasedatabase.app";
(async () => {
  const creds = JSON.parse(process.env.FIREBASE_SA);
  const auth = new GoogleAuth({ credentials: creds, scopes: ["https://www.googleapis.com/auth/firebase.database", "https://www.googleapis.com/auth/userinfo.email"] });
  const tok = (await (await auth.getClient()).getAccessToken()).token;
  const body = fs.readFileSync("database.rules.json", "utf8"); JSON.parse(body);
  const r = await fetch(DB + "/.settings/rules.json", { method: "PUT", headers: { Authorization: "Bearer " + tok, "content-type": "application/json" }, body });
  const t = await r.text(); console.log(r.status, t.slice(0, 300)); if (!r.ok) process.exit(1);
})().catch(e => { console.error(e.message || e); process.exit(1); });
