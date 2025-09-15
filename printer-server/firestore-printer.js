// firestore-printer.js

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;
const iconv = require('iconv-lite');

// โหลด service account key ของ Firebase
const serviceAccount = require('./noodle-order-fd44a-firebase-adminsdk-fbsvc-4739566abe.json');

// ตั้งค่า Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore();

// ตั้งค่าเครื่องพิมพ์ XP-58 (Windows)
let printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: 'printer:XP-58 (copy 1)', // ชื่อเครื่องพิมพ์ใน Windows
  characterSet: 'SLOVENIA',           // ใช้ CP874 สำหรับไทย
  removeSpecialCharacters: false,
});

// ฟังก์ชันพิมพ์ออเดอร์
async function printOrder(orderId, orderData) {
  try {
    printer.clear();

    let content = '';
    content += `ร้าน: บะหมี่ฟรีสไตล์สุรินทร์\n`;
    content += `เลขที่ออเดอร์: ${orderId}\n`;
    content += `------------------------------\n`;

    if (orderData.items && Array.isArray(orderData.items)) {
      orderData.items.forEach((item, i) => {
        content += `${i + 1}. ${item.name}\n`;
        if (item.noodle) content += `   เส้น: ${item.noodle}\n`;
        if (item.option) content += `   ขนาด: ${item.option}\n`;
        content += `   ราคา: ${item.price} บาท\n`;
      });
    }

    content += `------------------------------\n`;
    content += `รวมทั้งหมด: ${orderData.total || 0} บาท\n`;
    content += `------------------------------\n`;
    content += `🙏 ขอบคุณที่อุดหนุนครับ 🙏\n`;

    // encode ภาษาไทยเป็น CP874
    const encodedContent = iconv.encode(content, 'cp874');
    printer.println(iconv.decode(encodedContent, 'cp874'));

    printer.cut();

    await printer.execute(); // ส่งคำสั่งไปยังเครื่องพิมพ์
    console.log(`✅ พิมพ์ออเดอร์แล้ว: ${orderId}`);
  } catch (err) {
    console.error('❌ พิมพ์ล้มเหลว:', err);
  }
}

// ฟัง Firestore ออเดอร์ใหม่
db.collection('orders').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      console.log('🆕 ออเดอร์ใหม่:', change.doc.id);
      printOrder(change.doc.id, change.doc.data());
    }
  });
});
