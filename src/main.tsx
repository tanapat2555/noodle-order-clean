import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App"; // หน้า QR ของร้าน
import CustomerMenu from "./CustomerMenu"; // เมนูลูกค้า
import './index.css'  // ✅ ต้องมี
import StaffDashboard from "./StaffDashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* ✅ "/" = หน้า QR */}
        <Route index element={<App />} />

        {/* ✅ "/menu" = เมนูลูกค้า */}
        <Route path="menu" element={<CustomerMenu />} />

        {/* ✅ "/staff" = สตาฟ */}
        <Route path="staff" element={<StaffDashboard />} />

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

