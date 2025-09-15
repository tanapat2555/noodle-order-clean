import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

type OrderItem = {
  menuId: string;
  name: string;
  type: string;
  qty: number;
  price: number;
};

type Order = {
  id: string;
  table: number;
  status: string;
  createdAt?: any;
  items: OrderItem[];
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: Order[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          table: data.table,
          status: data.status,
          createdAt: data.createdAt?.toDate().toLocaleString(),
          items: data.items || [],
        };
      });
      setOrders(list);
    };
    fetchOrders();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">รายการออเดอร์</h1>

      {orders.map((order) => {
        const total = order.items.reduce(
          (sum, item) => sum + item.qty * item.price,
          0
        );

        return (
          <div
            key={order.id}
            className="border rounded-xl p-4 mb-4 shadow-md bg-white"
          >
            <h2 className="text-lg font-semibold">
              โต๊ะ {order.table} ({order.status})
            </h2>
            <p className="text-sm text-gray-500">
              เวลา: {order.createdAt || "-"}
            </p>

            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">เมนู</th>
                  <th className="text-center py-1">ประเภท</th>
                  <th className="text-center py-1">จำนวน</th>
                  <th className="text-right py-1">ราคา</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td>{item.name}</td>
                    <td className="text-center">{item.type}</td>
                    <td className="text-center">{item.qty}</td>
                    <td className="text-right">{item.qty * item.price} บาท</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right font-bold mt-2">
              รวมทั้งหมด: {total} บาท
            </div>
          </div>
        );
      })}
    </div>
  );
}
