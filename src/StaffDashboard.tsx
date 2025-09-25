import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  query,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { toast, Toaster } from "react-hot-toast";
import Swal from "sweetalert2";

// Type สำหรับรายการอาหารในออเดอร์
type OrderItem = {
  menuId: string;
  name: string;
  price: number;
  qty: number;
  option: string;
  noodle?: string | null;
  dineIn: "dine-in" | "takeaway";
  notes?: string | null;
};

// Type สำหรับออเดอร์
type Order = {
  id: string;
  table: string;
  items: OrderItem[];
  totalPrice: number;
  status: "new" | "cooking" | "served" | "ready" | "done";
  createdAt?: any;
};

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Order["status"] | "all">("all");

  const prevIds = useRef<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/ding.mp3");

    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Order[];

      const newOrder = data.find(
        (o) => !prevIds.current.includes(o.id) && o.status === "new"
      );

      if (newOrder) {
        audioRef.current?.play().catch(() => {
          console.warn("🔇 Auto-play ถูกบล็อค ต้องกด interaction ก่อน");
        });
        toast.success(`📢 มีออเดอร์ใหม่จากโต๊ะ ${newOrder.table}`);
      }

      prevIds.current = data.map((o) => o.id);
      setOrders(data);
    });
    return () => unsub();
  }, []);

  const updateStatus = async (id: string, status: Order["status"]) => {
    await updateDoc(doc(db, "orders", id), { status });
  };

  // ✅ ลบออเดอร์สำหรับทุกคน
  const deleteOrder = async (id: string) => {
    const { isConfirmed } = await Swal.fire({
      title: 'แน่ใจหรือไม่?',
      text: "คุณต้องการลบออเดอร์นี้ใช่ไหม",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    });

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, "orders", id));
        toast.success("🗑️ ลบออเดอร์เรียบร้อย");
      } catch (err) {
        console.error(err);
        toast.error("❌ ลบออเดอร์ไม่สำเร็จ");
      }
    }
  };

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const isTakeawayOrder = (order: Order) => {
    return order.items.every(item => item.dineIn === 'takeaway');
  };

  return (
    <div className="min-h-screen bg-gray-100 font-kanit p-4">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">📋 รายการออเดอร์</h1>

      {/* Filter */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {(["all", "new", "cooking", "ready", "served", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full font-semibold transition-colors duration-200 ${
              filter === f ? "bg-green-600 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "ทั้งหมด" : f === "new" ? "ใหม่" : f === "cooking" ? "กำลังทำ" : f === "ready" ? "เสร็จแล้ว(กลับบ้าน)" : f === "served" ? "เสิร์ฟแล้ว" : "ปิดจบ"}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="border rounded-xl p-4 bg-white shadow-md flex flex-col"
          >
            <div className="pb-2 border-b mb-3">
              <h2 className="font-bold text-xl text-gray-800">โต๊ะ {order.table}</h2>
              <p className="text-sm text-gray-500">
                รวม: <span className="font-semibold text-base text-black">{order.totalPrice.toLocaleString()}</span> บาท
              </p>
            </div>
            
            <ul className="text-base mb-4 space-y-3 flex-grow">
              {order.items.map((item, i) => (
                <li key={i} className="border-b border-dashed pb-2 last:border-none">
                  <div className="flex justify-between font-semibold">
                    <span>{item.name}</span>
                    <span>x {item.qty}</span>
                  </div>
                  <div className="pl-2 text-sm text-gray-600">
                    {[item.option !== '-' && item.option, item.noodle, item.dineIn === 'dine-in' ? 'ทานที่นี่' : 'กลับบ้าน'].filter(Boolean).join(', ')}
                  </div>
                  {item.notes && item.notes.trim() !== '' && (
                    <div className="pl-2 mt-1 text-sm text-blue-800 font-bold bg-blue-100 p-1.5 rounded">
                      เพิ่มเติม: {item.notes}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex gap-2 flex-wrap mt-auto">
              {order.status === "new" && (
                <button onClick={() => updateStatus(order.id, "cooking")} className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600">เริ่มทำ</button>
              )}
              {order.status === "cooking" && (
                <>
                  {isTakeawayOrder(order) ? (
                    <button onClick={() => updateStatus(order.id, "ready")} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">พร้อมส่ง (กลับบ้าน)</button>
                  ) : (
                    <button onClick={() => updateStatus(order.id, "served")} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">เสิร์ฟแล้ว</button>
                  )}
                </>
              )}
              {(order.status === "served" || order.status === "ready") && (
                <button onClick={() => updateStatus(order.id, "done")} className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">ปิดออเดอร์</button>
              )}
              {order.status === "done" && (
                <button onClick={() => deleteOrder(order.id)} className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">ลบ</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
