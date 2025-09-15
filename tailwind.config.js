/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // ✅ สำคัญ ไม่งั้นบางหน้าไม่โดน apply
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Kanit", "sans-serif"], // ✅ ตั้งค่า font Kanit
      },
    },
  },
  plugins: [],
};
