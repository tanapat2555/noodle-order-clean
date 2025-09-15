const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");

async function finalPrintTest() {
  let printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: 'win32',
    printerName: 'XP-58 (copy 4)', // ตรวจสอบว่าชื่อนี้ถูกต้อง
    // ไม่มีการตั้งค่า characterSet ที่นี่
  });

  try {
    console.log("กำลังส่งงานพิมพ์ไปยังไดรเวอร์ Windows...");

    printer.alignCenter();
    printer.println("สวัสดีประเทศไทย!");
    printer.println("การพิมพ์สำเร็จ!");
    printer.cut();
    
    await printer.execute(); 
    
    console.log("ส่งคำสั่งพิมพ์เรียบร้อยแล้ว!");

  } catch (error) {
    console.error("เกิดข้อผิดพลาดระหว่างการพิมพ์:", error);
  }
}

finalPrintTest();