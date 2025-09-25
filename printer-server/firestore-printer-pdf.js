const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { print } = require('pdf-to-printer');
const generatePayload = require('promptpay-qr');
const qrcode = require('qrcode');

if (!process.env.FIREBASE_KEY) {
  throw new Error("❌ โปรดตั้งค่า environment variable FIREBASE_KEY ก่อนรัน");
}

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
      const filePath = path.join(__dirname, `receipt_${orderId}.pdf`);
      const doc = new PDFDocument({ size: [220, 1200], margin: 5 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);
      doc.font(FONT_PATH);

      // --- Header ---
      doc.fontSize(30).text(STORE_NAME, { align: 'center', lineGap: 6 });
      doc.moveDown(0.2);
      const now = orderData.createdAt?.toDate ? orderData.createdAt.toDate() : new Date();
      doc.fontSize(16).text(`วันที่: ${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH')}`, { lineGap: 2 });
      doc.text(`โต๊ะ: ${orderData.table || '-'}`, { lineGap: 2 });
      doc.text('================================', { lineGap: 3 });

      // --- Items ---
      let totalPrice = 0;
      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach((item, i) => {
          
          // ⭐️⭐️⭐️ [Debug] แสดงข้อมูลดิบของแต่ละ item ใน Terminal ⭐️⭐️⭐️
          console.log(`[Debug] Item #${i+1}:`, JSON.stringify(item, null, 2));

          totalPrice += (item.price || 0) * (item.qty || 1);

          doc.fontSize(20).text(`${i + 1}. ${item.name}`, { continued: true });
          doc.text(` x${item.qty || 1}`, { align: 'right' });

          doc.fontSize(14);
          if (item.noodle) doc.text(`   เส้น: ${item.noodle}`, { lineGap: 1 });
          if (item.option && item.option !== '-') doc.text(`   ขนาด: ${item.option}`, { lineGap: 1 });
          
          // ⭐️⭐️⭐️ โค้ดแสดง "ทานที่นี่ / กลับบ้าน" ที่ปรับปรุงแล้ว ⭐️⭐️⭐️
          if (item.dineIn === 'dine-in') {
            doc.text(`   วิธีรับประทาน: ทานที่นี่`, { lineGap: 1 });
          } else if (item.dineIn === 'takeaway') {
            doc.text(`   วิธีรับประทาน: กลับบ้าน`, { lineGap: 1 });
          }

          if (item.notes && item.notes.trim() !== '') {
            doc.font(FONT_PATH).fontSize(15).text(`   เพิ่มเติม: ${item.notes}`, { width: 210, lineGap: 1 });
          }
          
          doc.fontSize(16).text(`   ราคา: ${(item.price || 0) * (item.qty || 1)} บาท`, { lineGap: 5 });
        });
      }

      // --- Total & Footer ---
      doc.fontSize(16).text('================================', { lineGap: 3 });
      doc.fontSize(22).text(`รวมทั้งหมด: ${totalPrice} บาท`, { lineGap: 4, align: 'right' });
      doc.text('================================', { lineGap: 3 });
      doc.fontSize(18).text('🙏 ขอบคุณที่อุดหนุนครับ 🙏', { align: 'center', lineGap: 5 });

      const phoneNumber = "0862516610";
      const payload = generatePayload(phoneNumber, { amount: parseFloat(totalPrice) });
      const qrDataUrl = await qrcode.toDataURL(payload);
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      const qrSize = 100;
      const qrY = doc.y;
      doc.image(qrBuffer, (doc.page.width - qrSize) / 2, qrY, { fit: [qrSize, qrSize] });

      const finalHeight = qrY + qrSize + 20;
      doc.page.height = finalHeight;
      doc.flushPages();
      doc.end();

      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

async function printPDF(filePath) {
  try {
    await print(filePath, { printer: PRINTER_NAME });
    console.log(`[Print] พิมพ์ไฟล์ ${path.basename(filePath)} สำเร็จ`);
    fs.unlinkSync(filePath); 
  } catch (err) {
    console.error(`[Print] เกิดข้อผิดพลาดในการพิมพ์:`, err);
  }
}

// --- Listen for new orders ---
const scriptStartTime = new Date();
console.log(`[System] โปรแกรมพิมพ์เริ่มทำงาน: ${scriptStartTime.toLocaleString('th-TH')}`);
console.log("[System] กำลังรอรับออเดอร์ใหม่...");

const ordersQuery = db.collection('orders').where('createdAt', '>=', scriptStartTime);

ordersQuery.onSnapshot(snapshot => {
  snapshot.docChanges().forEach(async change => {
    if (change.type === 'added') {
      const orderId = change.doc.id;
      const orderData = change.doc.data();
      
      console.log(`🆕 พบออเดอร์ใหม่: ${orderId} จากโต๊ะ ${orderData.table}`);
      try {
        const pdfPath = await createReceiptPDF(orderId, orderData);
        await printPDF(pdfPath);
      } catch (err) {
        console.error(`❌ เกิดข้อผิดพลาดกับออเดอร์ ${orderId}:`, err);
      }
    }
  });
});
