import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomerMenu from "./CustomerMenu";
import StaffDashboard from "./StaffDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/menu" element={<CustomerMenu />} />
        <Route path="/staff" element={<StaffDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
