'use client';

import React from 'react';
import { Smartphone, X, Wifi, QrCode, Copy, Check } from 'lucide-react';
import { useToast } from './Toast';

interface MobileConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  localIp: string;
  port: number;
}

export default function MobileConnectModal({
  isOpen,
  onClose,
  localIp,
  port,
}: MobileConnectModalProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const mobileUrl = `http://${localIp}:${port}`;
  // Generate QR code URL using public QR API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    mobileUrl
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    showToast('Đã sao chép link truy cập điện thoại!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-elevated border border-slate-200 w-full max-w-md p-6 sm:p-7 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Mở trên điện thoại</h3>
              <p className="text-xs text-slate-500">Quét mã QR để học ngay trên điện thoại</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <img
              src={qrCodeUrl}
              alt="QR Code kết nối điện thoại"
              width={200}
              height={200}
              className="rounded-lg"
            />
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">
            Dùng <b>Camera iPhone</b> hoặc <b>Zalo / Google Lens trên Android</b> để quét mã
          </p>
        </div>

        {/* URL Link and Copy */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Hoặc gõ địa chỉ này vào trình duyệt điện thoại:
          </label>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-800">
            <span className="flex-1 font-bold text-blue-700">{mobileUrl}</span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-white shadow-2xs hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition"
              title="Sao chép"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Step-by-step Notes */}
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <Wifi className="w-4 h-4 text-amber-600" />
            <span>Điều kiện kết nối:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
            <li>Điện thoại và máy tính cần kết nối vào <b>cùng một mạng Wi-Fi</b> trong nhà.</li>
            <li>
              <b>Cài đặt như App:</b> Trên Safari (iOS), nhấn nút <i>Chia sẻ</i> → chọn <b>"Thêm vào MH chính"</b>. Trên Chrome (Android), nhấn menu 3 chấm → <b>"Cài đặt ứng dụng"</b>.
            </li>
          </ul>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
