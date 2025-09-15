// server.js
const escpos = require("escpos");
const QRCode = require("qrcode");

// ✅ Firebase
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, onSnapshot } = require("firebase/firestore");

// ⚠️ ใส่ config ของโปรเจกต์ Firebase ของคุณเอง
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MSG_ID",
  appId: "YOUR_APP_ID"
};

// Init Firebase
const appFB = initializeApp(firebaseConfig);
const db = getFirestore(appFB);

// ✅ ESC/POS USB
escpos.USB = require("escpos-usb");

// ✅ ฟังก์ชันพิมพ์ใบเสร็จ
async function printOrder(order) {
  return new Promise((resolve, reject) => {
    const devices = escpos.USB.findPrinter();
    if (!devices || devices.length === 0) {
      return reject("ไม่พบเครื่องพิมพ์ USB");
    }

    const device = new escpos.USB(
      devices[0].deviceDescriptor.idVendor,
      devices[0].deviceDescriptor.idProduct
    );
    const printer = new escpos.Printer(device, { encoding: "GB18030" });

    device.open(async (err) => {
      if (err) return reject(err);

      printer
        .align("CT")
        .style("B")
        .size(1, 1)
        .text("🍜 ร้านบะหมี่ฟรีสไตล์ 🍜")
        .style("NORMAL")
        .text("----------------------------")
        .align("LT")
        .text(`โต๊ะ: ${order.table}`)
        .text("รายการอาหาร:");

      order.items.forEach((item, idx) => {
        printer.text(
          `${idx + 1}. ${item.name} (${item.option || ""} ${
            item.noodle || ""
          }) x${item.qty} = ${item.price * item.qty}฿`
        );
      });

      printer.text("----------------------------");
      printer.style("B").text(`รวมทั้งหมด: ${order.totalPrice} บาท`);
      printer.text("----------------------------");

      // ✅ QR Code
      if (order.qrText) {
        const qrBuffer = await QRCode.toBuffer(order.qrText);
        escpos.Image.load(qrBuffer, (image) => {
          printer.align("CT").raster(image);
          printer.cut().close(resolve);
        });
      } else {
        printer.cut().close(resolve);
      }
    });
  });
}

// ✅ Subscribe ฟัง Firestore orders
const ordersRef = collection(db, "orders");

onSnapshot(ordersRef, (snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === "added") {
      const order = change.doc.data();
      console.log("🆕 ออเดอร์ใหม่:", order);

      try {
        await printOrder(order);
        console.log("✅ พิมพ์เสร็จแล้ว");
      } catch (err) {
        console.error("❌ พิมพ์ไม่สำเร็จ:", err);
      }
    }
  });
});

console.log("✅ Printer server รันแล้ว กำลังฟัง Firestore...");
