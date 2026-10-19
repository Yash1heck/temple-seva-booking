import React, { useMemo } from 'react';
import { getQrMatrix } from '../utils/qrcode.js';

interface UpiQrCodeProps {
  upiId: string;
  merchantName: string;
  amount: number;
  transactionNote?: string;
  size?: number;
}

export const UpiQrCode: React.FC<UpiQrCodeProps> = ({
  upiId,
  merchantName,
  amount,
  transactionNote = 'Temple Pooja Seva Booking',
  size = 200
}) => {
  const upiUri = useMemo(() => {
    const params = new URLSearchParams({
      pa: upiId.trim(),
      pn: merchantName.trim(),
      am: amount.toFixed(2),
      cu: 'INR',
      tn: transactionNote.trim()
    });
    return `upi://pay?${params.toString()}`;
  }, [upiId, merchantName, amount, transactionNote]);

  const matrix = useMemo(() => {
    try {
      return getQrMatrix(upiUri);
    } catch (e) {
      console.error('Failed to generate QR matrix', e);
      return [];
    }
  }, [upiUri]);

  if (!matrix || matrix.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-rose-600 bg-rose-50 rounded-lg border border-rose-200">
        Unable to generate UPI QR Code. Please check the configured UPI ID.
      </div>
    );
  }

  const moduleCount = matrix.length;
  const cellSize = size / moduleCount;

  return (
    <div className="flex flex-col items-center bg-white p-3.5 rounded-xl border-2 border-[#C86A1B]/40 shadow-sm space-y-2.5">
      {/* Top Banner with Merchant Name */}
      <div className="text-center w-full">
        <div className="text-[11px] font-bold text-[#7A1C23] tracking-wide uppercase">
          {merchantName}
        </div>
        <div className="text-[10px] text-gray-500 font-mono">
          VPA: {upiId}
        </div>
      </div>

      {/* SVG QR Code */}
      <div className="p-2 bg-white rounded-lg border border-[#E8DCCE] shadow-inner">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rounded"
        >
          <rect width={size} height={size} fill="#FFFFFF" />
          {matrix.map((row, r) =>
            row.map((isDark, c) => {
              if (!isDark) return null;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize + 0.1}
                  height={cellSize + 0.1}
                  fill="#2D2520"
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Amount Pill */}
      <div className="w-full text-center bg-[#FAF5EC] py-1.5 px-3 rounded-lg border border-[#E8DCCE]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
          Payable Amount (మొత్తం)
        </div>
        <div className="text-lg font-extrabold text-[#7A1C23]">
          ₹{amount.toFixed(2)}
        </div>
      </div>

      {/* Supported UPI Apps */}
      <div className="text-[9px] text-gray-500 font-medium text-center">
        ⚡ GPay • PhonePe • Paytm • BHIM • Any UPI App
      </div>
    </div>
  );
};
