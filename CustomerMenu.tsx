import { useEffect, useState, useRef } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import Swal from "sweetalert2";

// --- Type Definitions ---
type MenuOption = { name: string; extraPrice: number };
type NoodleOption = { name: string };

type MenuItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  options?: MenuOption[];
  noodles?: NoodleOption[];
};

type CartItem = {
  id: string;
  name: string;
  basePrice: number;
  option: string;
  noodle?: string;
  dineIn: "dine-in" | "takeaway";
  notes?: string;
  qty: number;
  price: number;
};

// --- Main Component ---
export default function CustomerMenu() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<MenuOption | null>(null);
  const [selectedNoodle, setSelectedNoodle] = useState<string | null>(null);
  const [selectedDineIn, setSelectedDineIn] = useState<"dine-in" | "takeaway">("dine-in");
  const [itemNotes, setItemNotes] = useState("");

  const [showCart, setShowCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement>>({});

  const params = new URLSearchParams(window.location.search);
  const table: string = params.get("table") ?? "ไม่ระบุ";

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const snap = await getDocs(collection(db, "menus"));
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as MenuItem[];
        setMenu(data);
        if (data.length > 0) {
           const firstCategory = data[0].category || "ไม่ระบุหมวดหมู่";
           setActiveCategory(firstCategory);
        }
      } catch (err) {
        console.error("❌ โหลดเมนูล้มเหลว", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollToTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveCategory(entry.target.id.replace("cat-", ""));
        });
      },
      { rootMargin: "-30% 0px -70% 0px", threshold: 0 }
    );
    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      Object.values(categoryRefs.current).forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [menu]);

  const addToCart = (item: MenuItem, option: MenuOption, noodle?: string, dineIn?: "dine-in" | "takeaway", notes?: string) => {
    const finalPrice = item.price + (option.extraPrice || 0);
    setCart((prev) => {
      const existing = prev.find(
        (x) => x.id === item.id && x.option === option.name && x.noodle === noodle && x.dineIn === dineIn && x.notes === (notes || "")
      );
      if (existing) {
        return prev.map((x) =>
          x.id === item.id && x.option === option.name && x.noodle === noodle && x.dineIn === dineIn && x.notes === (notes || "")
            ? { ...x, qty: x.qty + 1 }
            : x
        );
      }
      return [
        ...prev,
        {
          id: item.id, name: item.name, basePrice: item.price,
          option: option.name, noodle, dineIn: dineIn || "dine-in",
          notes: notes || "", qty: 1, price: finalPrice,
        },
      ];
    });
    setSelectedItem(null);
    setSelectedOption(null);
    setSelectedNoodle(null);
    setSelectedDineIn("dine-in");
    setItemNotes("");
  };
  
  const handleSelectItem = (item: MenuItem) => {
    if (!item.options || item.options.length === 0) {
      const defaultOption = { name: '-', extraPrice: 0 };
      addToCart(item, defaultOption, undefined, 'dine-in', '');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `เพิ่ม ${item.name} แล้ว`,
        showConfirmButton: false,
        timer: 1500
      })
    } else {
      setSelectedItem(item);
      setSelectedOption(item.options[0]);
    }
  };

  const removeFromCart = (index: number) => setCart((prev) => prev.filter((_, i) => i !== index));
  const updateQty = (index: number, change: number) =>
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty: Math.max(1, item.qty + change) } : item))
    );
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // ⭐️⭐️⭐️ ฟังก์ชันยืนยันออเดอร์ที่แก้ไขใหม่ ⭐️⭐️⭐️
  const confirmOrder = async () => {
    if (cart.length === 0) {
      Swal.fire({ icon: "warning", title: "ยังไม่ได้เลือกเมนู", text: "กรุณาเลือกเมนูก่อนยืนยัน", confirmButtonColor: "#16a34a" });
      return;
    }

    // 1. สร้าง HTML สำหรับแสดงสรุปรายการ
    const orderSummaryHtml = `
      <div style="text-align: left; max-height: 300px; overflow-y: auto; padding: 0 1em;">
        ${cart.map(item => `
          <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
            <p style="font-weight: bold; margin: 0; display: flex; justify-content: space-between;">
              <span>${item.name}</span>
              <span>x ${item.qty}</span>
            </p>
            <small style="color: #555;">
              ${item.option !== '-' ? `${item.option}` : ''}
              ${item.noodle ? `, ${item.noodle}` : ''}
              <br/>
              ${item.dineIn === 'dine-in' ? 'ทานที่นี่' : 'กลับบ้าน'}
              ${item.notes ? `<br/><span style="color: #0056b3; font-weight: bold;">เพิ่มเติม: ${item.notes}</span>` : ''}
            </small>
          </div>
        `).join('')}
      </div>
      <h3 style="text-align: right; margin-top: 15px; font-size: 1.25em;">
        รวมทั้งหมด: ${totalPrice.toLocaleString()} บาท
      </h3>
    `;

    // 2. แสดงหน้าต่างยืนยันด้วย SweetAlert2
    const result = await Swal.fire({
      title: `ยืนยันออเดอร์โต๊ะ ${table}?`,
      html: orderSummaryHtml,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    });

    // 3. ถ้าผู้ใช้กดยืนยัน (isConfirmed) จึงจะส่งข้อมูลไป Firestore
    if (result.isConfirmed) {
      try {
        await addDoc(collection(db, "orders"), {
          table,
          items: cart.map((c) => ({
            menuId: c.id, name: c.name, price: c.price,
            qty: c.qty, option: c.option, noodle: c.noodle || null,
            dineIn: c.dineIn, notes: c.notes || null,
          })),
          totalPrice,
          status: "new",
          createdAt: serverTimestamp(),
        });
        Swal.fire({ 
            icon: "success", 
            title: "สั่งอาหารเรียบร้อย", 
            text: "กรุณารอสักครู่ อาหารกำลังถูกจัดเตรียม", 
            confirmButtonColor: "#16a34a" 
        });
        setCart([]);
        setShowCart(false);
      } catch (err: any) {
        console.error("❌ Error confirming order:", err);
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message || "ไม่สามารถสั่งอาหารได้ โปรดลองใหม่อีกครั้ง", confirmButtonColor: "#16a34a" });
      }
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 font-kanit">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent"></div>
      <span className="ml-4 text-lg font-medium text-gray-600">กำลังโหลดเมนู...</span>
    </div>
  );

  const groupedMenu = menu.reduce((acc: Record<string, MenuItem[]>, item) => {
    const category = item.category || "ไม่ระบุหมวดหมู่";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const sortedCategories = Object.entries(groupedMenu).sort(([a], [b]) => {
    if (a === "ก๋วยเตี๋ยว") return -1; if (b === "ก๋วยเตี๋ยว") return 1;
    return a.localeCompare(b, "th");
  });

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = { "ก๋วยเตี๋ยว": "🍜", "เกาเหลา": "🍲", "เกี๊ยว": "🥟", "ข้าว": "🍚", "เย็นตาโฟ": "🍥", "เล้ง": "🦴", };
    return emojiMap[category] || "🍽️";
  };
  
  const predefinedOptions: MenuOption[] = [ { name: 'ธรรมดา', extraPrice: 0 }, { name: 'พิเศษ', extraPrice: 10 }, ];
  const predefinedNoodles: NoodleOption[] = [ { name: 'เส้นเล็ก' }, { name: 'เส้นใหญ่' }, { name: 'เส้นหมี่ขาว' }, { name: 'บะหมี่' }, ];

  return (
    <div className="min-h-screen bg-gray-50 font-kanit pb-32">
      {showScrollToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-4 bg-green-600 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center z-20 transition-opacity duration-300 hover:bg-green-700"
          aria-label="Go to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <div className="flex flex-col items-center pt-4 mb-4">
          <img src="/logonoodle.jpg" alt="Noodle Logo" className="h-20 w-20 mb-2 rounded-full object-cover border-2 border-white shadow-sm" />
          <h1 className="text-3xl font-bold text-center text-gray-800">เมนูอาหาร (โต๊ะ {table})</h1>
        </div>

        <div className="sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10 py-3 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
            {sortedCategories.map(([category]) => (
              <button
                key={category}
                onClick={() => { document.getElementById(`cat-${category}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-semibold transition-colors duration-300 ${
                  activeCategory === category ? "bg-green-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {getCategoryEmoji(category)} {category}
              </button>
            ))}
          </div>
        </div>

        {sortedCategories.map(([category, items]) => (
          <div key={category} id={`cat-${category}`} ref={(el) => { if (el) categoryRefs.current[category] = el; }} className="mb-8 scroll-mt-24">
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-4 text-gray-800">
              {getCategoryEmoji(category)} {category}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((item) => (
                <div key={item.id} className="border rounded-xl shadow-sm bg-white flex flex-col hover:shadow-lg transition-shadow">
                  {item.image && ( <img src={item.image} alt={item.name} className="w-full h-28 sm:h-32 object-cover rounded-t-lg" /> )}
                  <div className="p-2 sm:p-3 flex flex-col flex-grow">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800 flex-grow">{item.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{item.price > 0 ? `เริ่มต้น ${item.price} บาท` : ''}</p>
                    <button onClick={() => handleSelectItem(item)} className="mt-2 w-full px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors">
                      เลือก
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t p-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800">ยอดรวม: {totalPrice.toLocaleString()} บาท</h2>
          <div className="flex w-full sm:w-auto gap-2">
            <button onClick={() => setShowCart(true)} className="flex-1 bg-gray-200 px-4 py-2 rounded-lg font-semibold">
              🛒 ตะกร้า ({cart.length})
            </button>
            <button onClick={confirmOrder} className="flex-1 bg-green-600 text-white py-2 px-6 rounded-lg text-lg font-semibold hover:bg-green-700">
              ยืนยัน
            </button>
          </div>
        </div>
      </div>

      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[85vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4 flex-shrink-0">🛒 ตะกร้าของคุณ</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center my-8">ยังไม่มีสินค้าในตะกร้า</p>
            ) : (
              <ul className="space-y-4 overflow-y-auto pr-2 flex-grow">
                {cart.map((item, index) => (
                  <li key={index} className="flex justify-between items-start border-b pb-3">
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.option !== '-' ? `${item.option} ` : ''}
                        {item.noodle && `(${item.noodle})`} | {item.dineIn === "dine-in" ? "ทานที่นี่" : "กลับบ้าน"}
                      </p>
                      {item.notes && <p className="text-sm text-blue-600 font-semibold">เพิ่มเติม: {item.notes}</p>}
                      <p className="text-sm font-medium">{item.price}฿ × {item.qty} = {(item.price * item.qty).toLocaleString()}฿</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <button onClick={() => updateQty(index, -1)} className="w-7 h-7 bg-gray-200 rounded-full font-bold">-</button>
                      <span className="w-5 text-center font-semibold">{item.qty}</span>
                      <button onClick={() => updateQty(index, 1)} className="w-7 h-7 bg-gray-200 rounded-full font-bold">+</button>
                      <button onClick={() => removeFromCart(index)} className="w-7 h-7 bg-red-500 text-white rounded-full">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-between items-center border-t pt-4 flex-shrink-0">
              <h3 className="text-lg font-bold">รวม: {totalPrice.toLocaleString()} บาท</h3>
              <button onClick={() => setShowCart(false)} className="px-4 py-2 bg-gray-300 rounded-lg font-semibold">ปิด</button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="relative p-4 border-b">
                <button onClick={() => setSelectedItem(null)} className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-500 hover:text-gray-800" aria-label="Back to menu">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-xl font-bold text-center">{selectedItem.name}</h2>
            </div>
            <div className="p-6 overflow-y-auto">
                {selectedItem.image && ( <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-40 object-cover rounded-lg mb-4" /> )}
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2 text-lg">เลือกขนาด/option:</h3>
                        <div className="space-y-2">
                            {predefinedOptions.map((opt) => (
                            <label key={opt.name} className="flex items-center gap-3 p-3 border rounded-lg has-[:checked]:bg-green-50 has-[:checked]:border-green-500 cursor-pointer">
                                <input type="radio" name="option" value={opt.name} checked={selectedOption?.name === opt.name} onChange={() => setSelectedOption(opt)} className="w-4 h-4 text-green-600 focus:ring-green-500"/>
                                <span>{opt.name} (+{opt.extraPrice}฿)</span>
                            </label>
                            ))}
                        </div>
                    </div>
                    {selectedItem.noodles && (
                        <div>
                            <h3 className="font-semibold mb-2 text-lg">เลือกเส้น:</h3>
                            <div className="space-y-2">
                                {predefinedNoodles.map((n) => (
                                <label key={n.name} className="flex items-center gap-3 p-3 border rounded-lg has-[:checked]:bg-green-50 has-[:checked]:border-green-500 cursor-pointer">
                                    <input type="radio" name="noodle" value={n.name} checked={selectedNoodle === n.name} onChange={() => setSelectedNoodle(n.name)} className="w-4 h-4 text-green-600 focus:ring-green-500"/>
                                    <span>{n.name}</span>
                                </label>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold mb-2 text-lg">เลือกวิธีรับประทาน:</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center justify-center gap-2 p-3 border rounded-lg has-[:checked]:bg-green-50 has-[:checked]:border-green-500 cursor-pointer">
                                <input type="radio" name="dine" value="dine-in" checked={selectedDineIn === "dine-in"} onChange={() => setSelectedDineIn("dine-in")} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                                <span>ทานที่นี่</span>
                            </label>
                            <label className="flex items-center justify-center gap-2 p-3 border rounded-lg has-[:checked]:bg-green-50 has-[:checked]:border-green-500 cursor-pointer">
                                <input type="radio" name="dine" value="takeaway" checked={selectedDineIn === "takeaway"} onChange={() => setSelectedDineIn("takeaway")} className="w-4 h-4 text-green-600 focus:ring-green-500"/>
                                <span>กลับบ้าน</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-lg">อื่นๆ (เพิ่มเติม):</h3>
                        <textarea
                            value={itemNotes}
                            onChange={(e) => setItemNotes(e.target.value)}
                            rows={2}
                            className="w-full p-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                            placeholder="เช่น ไม่ใส่ผัก, ไม่เผ็ด, พิเศษลูกชิ้น"
                        ></textarea>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-auto p-4 border-t bg-gray-50 rounded-b-lg">
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2 bg-gray-200 rounded-lg font-semibold">ยกเลิก</button>
              <button
                onClick={() => {
                  if (!selectedOption) { Swal.fire({ icon: "warning", title: "กรุณาเลือกขนาด/option", confirmButtonColor: "#16a34a" }); return; }
                  if (selectedItem.noodles && !selectedNoodle) { Swal.fire({ icon: "warning", title: "กรุณาเลือกเส้น", confirmButtonColor: "#16a34a" }); return; }
                  addToCart(selectedItem, selectedOption, selectedNoodle || undefined, selectedDineIn, itemNotes);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold"
              >
                เพิ่มลงตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

