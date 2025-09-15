import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import Swal from "sweetalert2";

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
  qty: number;
  price: number;
};

export default function CustomerMenu() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [dineIn, setDineIn] = useState<"dine-in" | "takeaway">("dine-in");
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<MenuOption | null>(null);
  const [selectedNoodle, setSelectedNoodle] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const table: string = params.get("table") ?? "ไม่ระบุ";

  // โหลดเมนูจาก Firestore
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const snap = await getDocs(collection(db, "menus"));
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as MenuItem[];
        setMenu(data);
      } catch (err) {
        console.error("❌ โหลดเมนูล้มเหลว", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // เพิ่มเมนูลงตะกร้า
  const addToCart = (item: MenuItem, option: MenuOption, noodle?: string) => {
    const finalPrice = item.price + (option.extraPrice || 0);
    setCart((prev) => {
      const existing = prev.find(
        (x) => x.id === item.id && x.option === option.name && x.noodle === noodle
      );
      if (existing)
        return prev.map((x) =>
          x.id === item.id && x.option === option.name && x.noodle === noodle
            ? { ...x, qty: x.qty + 1 }
            : x
        );
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          basePrice: item.price,
          option: option.name,
          noodle,
          qty: 1,
          price: finalPrice,
        },
      ];
    });
    setSelectedItem(null);
    setSelectedOption(null);
    setSelectedNoodle(null);
  };

  // แก้ไข/ลบจากตะกร้า
  const removeFromCart = (index: number) => setCart((prev) => prev.filter((_, i) => i !== index));
  const updateQty = (index: number, change: number) =>
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty: Math.max(1, item.qty + change) } : item))
    );

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // ยืนยันการสั่งอาหาร (ส่งไป Firestore)
  const confirmOrder = async () => {
    if (cart.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "ยังไม่ได้เลือกเมนู",
        text: "กรุณาเลือกเมนูก่อนกดยืนยันสั่งอาหาร",
        confirmButtonColor: "#16a34a",
      });
      return;
    }
    try {
      await addDoc(collection(db, "orders"), {
        table,
        dineIn,
        items: cart.map((c) => ({
          menuId: c.id,
          name: c.name,
          price: c.price,
          qty: c.qty,
          option: c.option,
          noodle: c.noodle || null,
        })),
        totalPrice,
        status: "new",
        createdAt: serverTimestamp(),
      });

      Swal.fire({
        icon: "success",
        title: "สั่งอาหารเรียบร้อย",
        text: "กรุณารอสักครู่ อาหารกำลังถูกจัดเตรียม",
        confirmButtonColor: "#16a34a",
      });
      setCart([]);
      setShowCart(false);
    } catch (err: any) {
      console.error("❌ Error confirming order:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถสั่งอาหารได้ โปรดลองใหม่อีกครั้ง",
        confirmButtonColor: "#16a34a",
      });
    }
  };

  if (loading)
    return (
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

  return (
    <div className="min-h-screen bg-gray-50 font-kanit pb-32">
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="flex flex-col items-center mb-4">
          <img src="/logonoodle.jpg" alt="Noodle Logo" className="h-16 mb-2 rounded-full object-contain" />
          <h1 className="text-2xl font-bold text-center">เมนูอาหาร (โต๊ะ {table})</h1>
        </div>

        {/* DineIn / Takeaway */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            className={`px-4 py-2 rounded-lg ${
              dineIn === "dine-in" ? "bg-green-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => {
              setDineIn("dine-in");
              setCart([]);
            }}
          >
            ทานที่นี่
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              dineIn === "takeaway" ? "bg-green-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => {
              setDineIn("takeaway");
              setCart([]);
            }}
          >
            กลับบ้าน
          </button>
        </div>

        {/* Menu List */}
        {Object.entries(groupedMenu).map(([category, items]) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">📌 {category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <div key={item.id} className="border rounded-xl p-4 shadow bg-white flex flex-col">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="w-full h-40 object-cover rounded-lg mb-2" />
                  )}
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <p className="text-gray-600 mb-2">เริ่มต้น {item.price} บาท</p>
                  <button onClick={() => setSelectedItem(item)} className="mt-auto px-3 py-2 bg-green-500 text-white rounded">
                    เลือก
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex justify-between items-center gap-3">
          <h2 className="text-lg font-bold">รวม: {totalPrice} บาท</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowCart(true)} className="bg-gray-200 px-4 py-2 rounded">
              🛒 ดูตะกร้า ({cart.length})
            </button>
            <button onClick={confirmOrder} className="bg-green-600 text-white py-2 px-6 rounded-xl text-lg font-semibold">
              ยืนยันสั่งอาหาร
            </button>
          </div>
        </div>
      </div>

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">🛒 ตะกร้าของคุณ</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500">ยังไม่มีสินค้าในตะกร้า</p>
            ) : (
              <ul className="space-y-3">
                {cart.map((item, index) => (
                  <li key={index} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.option} {item.noodle && `(${item.noodle})`}
                      </p>
                      <p className="text-sm">{item.price}฿ × {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(index, -1)} className="px-2 py-1 bg-gray-200 rounded">
                        -
                      </button>
                      <button onClick={() => updateQty(index, +1)} className="px-2 py-1 bg-gray-200 rounded">
                        +
                      </button>
                      <button onClick={() => removeFromCart(index)} className="px-2 py-1 bg-red-500 text-white rounded">
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-between items-center">
              <h3 className="font-bold">รวม: {totalPrice} บาท</h3>
              <button onClick={() => setShowCart(false)} className="px-3 py-1 bg-gray-300 rounded">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option / Noodle Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            {selectedItem.image && (
              <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-48 object-cover rounded mb-3" />
            )}
            <h2 className="text-xl font-bold mb-2">{selectedItem.name}</h2>

            <h3 className="font-medium mb-1">เลือกขนาด/option:</h3>
            <div className="space-y-2 mb-3">
              {selectedItem.options?.map((opt) => (
                <label key={opt.name} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="option"
                    value={opt.name}
                    checked={selectedOption?.name === opt.name}
                    onChange={() => setSelectedOption(opt)}
                  />
                  {opt.name} (+{opt.extraPrice}฿)
                </label>
              ))}
            </div>

            {selectedItem.noodles && (
              <>
                <h3 className="font-medium mb-1">เลือกเส้น:</h3>
                <div className="space-y-2 mb-3">
                  {selectedItem.noodles.map((n) => (
                    <label key={n.name} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="noodle"
                        value={n.name}
                        checked={selectedNoodle === n.name}
                        onChange={() => setSelectedNoodle(n.name)}
                      />
                      {n.name}
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedItem(null)} className="px-3 py-1 bg-gray-300 rounded">
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (!selectedOption) {
                    Swal.fire({
                      icon: "warning",
                      title: "กรุณาเลือกขนาด/option",
                      text: "คุณยังไม่ได้เลือกขนาดหรือ option",
                      confirmButtonColor: "#16a34a",
                    });
                    return;
                  }
                  if (selectedItem.noodles && !selectedNoodle) {
                    Swal.fire({
                      icon: "warning",
                      title: "กรุณาเลือกเส้น",
                      text: "กรุณาเลือกประเภทเส้นก่อนเพิ่มลงตะกร้า",
                      confirmButtonColor: "#16a34a",
                    });
                    return;
                  }
                  addToCart(selectedItem, selectedOption, selectedNoodle || undefined);
                }}
                className="px-3 py-1 bg-green-500 text-white rounded"
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
