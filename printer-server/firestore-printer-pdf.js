const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { print } = require('pdf-to-printer');
const QRCode = require('qrcode');

// เช็ค environment variable
if (!process.env.FIREBASE_KEY) {
  throw new Error("❌ โปรดตั้งค่า environment variable FIREBASE_KEY ก่อนรัน");
}

// โหลด service account จาก env
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore();

const PRINTER_NAME = "XP-58";
const FONT_PATH = path.join(__dirname, "fonts", "THSarabunNew Bold.ttf");
const STORE_NAME = "บะหมี่ฟรีสไตล์สุรินทร์";

async function createReceiptPDF(orderId, orderData) {
  return new Promise(async (resolve, reject) => {
    try {
      const itemCount = orderData.items?.length || 1;
      const pdfHeight = 200 + itemCount * 40 + 150;
      const filePath = path.join(__dirname, `receipt_${orderId}.pdf`);
      const doc = new PDFDocument({ size: [200, pdfHeight], margin: 10 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      doc.font(FONT_PATH);

      // ชื่อร้านชัดเจน
      doc.fontSize(22).text(STORE_NAME, { align: 'center', lineGap: 6 });

      doc.fontSize(16);
      const now = new Date();
      doc.text(`วันที่: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, { lineGap: 2 });
      doc.text(`โต๊ะ: ${orderData.table || '-'}`, { lineGap: 2 });
      doc.text('------------------------------', { lineGap: 2 });

      // รายการอาหารและรวมราคา
      let totalPrice = 0;
      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach((item, i) => {
          const qty = item.qty || 1;
          const itemTotal = (item.price || 0) * qty;
          totalPrice += itemTotal;

          doc.text(`${i + 1}. ${item.name} x${qty}`, { lineGap: 1 });
          if (item.noodle) doc.text(`   เส้น: ${item.noodle}`, { lineGap: 1 });
          if (item.option) doc.text(`   ขนาด: ${item.option}`, { lineGap: 1 });
          doc.text(`   ราคา: ${itemTotal} บาท`, { lineGap: 1 });
        });
      }

      doc.text('------------------------------', { lineGap: 2 });
      doc.text(`รวมทั้งหมด: ${totalPrice} บาท`, { lineGap: 2 });
      doc.text('------------------------------', { lineGap: 2 });
      doc.text('🙏 ขอบคุณที่อุดหนุนครับ 🙏', { lineGap: 4 });

      // QR Code พร้อมเพย์
      const promptPayLink = `https://promptpay.io/0954162007/${totalPrice}`;
      const qrDataUrl = await QRCode.toDataURL(promptPayLink);
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrBuffer, { fit: [100, 100], align: 'center', valign: 'center' });

      doc.end();

      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

async function printPDF(filePath) {
  await print(filePath, { printer: PRINTER_NAME });
}

db.collection('orders').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(async change => {
    if (change.type === 'added') {
      const orderId = change.doc.id;
      const orderData = change.doc.data();
      console.log('🆕 ออเดอร์ใหม่:', orderId);

      try {
        const pdfPath = await createReceiptPDF(orderId, orderData);
        await printPDF(pdfPath);
        console.log(`✅ พิมพ์ออเดอร์แล้ว: ${orderId}`);
      } catch (err) {
        console.error('❌ พิมพ์ล้มเหลว:', err);
      }
    }
  });
});
