// importMenu.js
const admin = require("firebase-admin");
const fs = require("fs");

// โหลด service account จาก environment variable แทนไฟล์
if (!process.env.FIREBASE_KEY) {
  throw new Error("❌ โปรดตั้งค่า environment variable FIREBASE_KEY ก่อนรัน");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// โหลด JSON
const data = JSON.parse(fs.readFileSync("menus.json", "utf-8"));

async function importData() {
  const batch = db.batch();

  data.forEach((menu) => {
    const ref = db.collection("menus").doc(); // ให้ Firestore สร้าง id อัตโนมัติ
    batch.set(ref, menu);
  });

  await batch.commit();
  console.log("✅ Import เสร็จสิ้น! เพิ่มเมนูเข้า Firestore แล้ว");
}

importData().catch((err) => {
  console.error("❌ Import ล้มเหลว:", err);
});
