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

type OrderItem = {
  menuId: string;
  name: string;
  price: number;
  qty: number;
  option: string;
  noodle?: string | null;
};

type Order = {
  id: string;
  table: string;
  dineIn: "dine-in" | "takeaway";
  items: OrderItem[];
  totalPrice: number;
  status: "new" | "cooking" | "served" | "ready" | "done";
  createdAt?: any;
};

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | "new" | "cooking" | "served" | "ready" | "done">("all");

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
        if (audioRef.current) {
          audioRef.current.play().catch(() => {
            console.warn("🔇 Auto-play ถูกบล็อค ต้องกด interaction ก่อน");
          });
        }
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

  const deleteOrder = async (id: string) => {
    if (confirm("คุณแน่ใจว่าต้องการลบออเดอร์นี้?")) {
      await deleteDoc(doc(db, "orders", id));
      toast.success("🗑️ ลบออเดอร์เรียบร้อย");
    }
  };

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 font-kanit p-4">
      <Toaster position="top-right" />

      <h1 className="text-2xl font-bold mb-4 text-center">📋 ออเดอร์ทั้งหมด</h1>

      {/* Filter */}
      <div className="flex justify-center gap-2 mb-4 flex-wrap">
        {["all", "new", "cooking", "ready", "served", "done"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-1 rounded-lg ${
              filter === f ? "bg-green-500 text-white" : "bg-gray-200"
            }`}
          >
            {f === "all"
              ? "ทั้งหมด"
              : f === "new"
              ? "ใหม่"
              : f === "cooking"
              ? "กำลังทำ"
              : f === "ready"
              ? "เสร็จแล้ว (กลับบ้าน)"
              : f === "served"
              ? "เสิร์ฟแล้ว"
              : "ปิดออเดอร์"}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="border rounded-xl p-4 bg-white shadow flex flex-col"
          >
            <h2 className="font-bold text-lg mb-1">
              โต๊ะ {order.table} ({order.dineIn === "dine-in" ? "ทานที่นี่" : "กลับบ้าน"})
            </h2>
            <p className="text-sm text-gray-500 mb-2">
              รวม: {order.totalPrice} บาท
            </p>

            <ul className="text-sm mb-3 space-y-1">
              {order.items.map((item, i) => (
                <li key={i}>
                  🍜 {item.name}{" "}
                  <span className="text-gray-600">
                    ({item.option}
                    {item.noodle ? `, ${item.noodle}` : ""})
                  </span>{" "}
                  × {item.qty} ={" "}
                  <span className="font-semibold">
                    {item.qty * item.price} บาท
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 flex-wrap mt-auto">
              {order.status === "new" && (
                <button
                  onClick={() => updateStatus(order.id, "cooking")}
                  className="px-3 py-1 bg-yellow-500 text-white rounded"
                >
                  เริ่มทำ
                </button>
              )}
              {order.status === "cooking" && (
                <>
                  {order.dineIn === "dine-in" ? (
                    <button
                      onClick={() => updateStatus(order.id, "served")}
                      className="px-3 py-1 bg-blue-500 text-white rounded"
                    >
                      เสิร์ฟแล้ว
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(order.id, "ready")}
                      className="px-3 py-1 bg-blue-500 text-white rounded"
                    >
                      พร้อมส่ง
                    </button>
                  )}
                </>
              )}
              {(order.status === "served" || order.status === "ready") && (
                <button
                  onClick={() => updateStatus(order.id, "done")}
                  className="px-3 py-1 bg-green-600 text-white rounded"
                >
                  ปิดออเดอร์
                </button>
              )}

              {/* ✅ ปุ่มลบ */}
              {order.status === "done" && (
                <button
                  onClick={() => deleteOrder(order.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded"
                >
                  ลบออเดอร์
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
