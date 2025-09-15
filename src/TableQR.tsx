import { QRCodeCanvas } from "qrcode.react";

type Props = {
  tableNumber: number;
};

export default function TableQR({ tableNumber }: Props) {
  const baseUrl = "https://noodle-order-fd44a.web.app";
  const url = `${baseUrl}/menu?table=${tableNumber}`;

  return (
    <div className="p-4 border rounded-xl bg-white shadow flex flex-col items-center">
      <h2 className="font-bold mb-2">โต๊ะ {tableNumber}</h2>
      <QRCodeCanvas value={url} size={150} />
      <p className="mt-2 text-xs text-gray-500 break-all">{url}</p>
    </div>
  );
}
