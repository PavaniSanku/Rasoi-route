import {
  Check,
  Copy,
  Download,
  FileCheck2,
  Printer,
  QrCode,
  ShieldCheck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useState } from "react";
import { formatCurrency as money } from "../lib/formatCurrency";

export interface InvoiceData {
  orderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    hsnCode?: string;
  }>;
  subtotal: number;
  discount: number;
  discountLabel: string;
  deliveryFee: number;
  deliveryLabel: string;
  packagingFee: number;
  platformFee: number;
  riderTip: number;
  charityRoundUp: number;
  coinsDiscount: number;
  paymentOfferDiscount: number;
  paymentOfferLabel?: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  isCorporateGst?: boolean;
  companyName?: string;
  gstin?: string;
}

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData;
}

export function TaxInvoiceModal({ isOpen, onClose, invoice }: TaxInvoiceModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    const textLines = [
      `==================================================`,
      `RASOI ROUTE — DEMONSTRATION ORDER RECEIPT`,
      `College demonstration; no registered business details configured`,
      `SAC Code: 996331 (Restaurant & Food Delivery)`,
      `Invoice No: ${invoice.invoiceNumber}`,
      `Order ID: ${invoice.orderId}`,
      `Date & Time: ${invoice.invoiceDate}`,
      `--------------------------------------------------`,
      `Customer: ${invoice.customerName || "Customer"} | Phone: ${invoice.customerPhone || "Not provided"}`,
      `Delivery Address: ${invoice.customerAddress || "Not provided"}`,
      invoice.isCorporateGst
        ? `Corporate GST: ${invoice.gstin} (${invoice.companyName})`
        : ``,
      `--------------------------------------------------`,
      `ITEMIZED BILL:`,
      ...invoice.items.map(
        (i) => `${i.name} x ${i.quantity} @ ${money(i.unitPrice)} = ${money(i.total)}`
      ),
      `--------------------------------------------------`,
      `Subtotal: ${money(invoice.subtotal)}`,
      invoice.discount > 0 ? `Discount (${invoice.discountLabel}): -${money(invoice.discount)}` : ``,
      invoice.paymentOfferDiscount > 0 ? `Bank Offer (${invoice.paymentOfferLabel}): -${money(invoice.paymentOfferDiscount)}` : ``,
      invoice.coinsDiscount > 0 ? `Rasoi Coins Redeemed: -${money(invoice.coinsDiscount)}` : ``,
      `Delivery Charge (${invoice.deliveryLabel}): ${invoice.deliveryFee === 0 ? "FREE" : money(invoice.deliveryFee)}`,
      invoice.packagingFee > 0 ? `Eco Packaging: ${money(invoice.packagingFee)}` : ``,
      invoice.platformFee > 0 ? `Platform Fee: ${money(invoice.platformFee)}` : ``,
      invoice.riderTip > 0 ? `Delivery Partner Tip: ${money(invoice.riderTip)}` : ``,
      invoice.charityRoundUp > 0 ? `Charity Contribution: ${money(invoice.charityRoundUp)}` : ``,
      `Taxable Value: ${money(invoice.taxableValue)}`,
      `CGST (2.5%): ${money(invoice.cgst)}`,
      `SGST (2.5%): ${money(invoice.sgst)}`,
      `Total Taxes (5% GST): ${money(invoice.totalGst)}`,
      `--------------------------------------------------`,
      `GRAND TOTAL: ${money(invoice.grandTotal)}`,
      `Payment Mode: ${invoice.paymentMethod} (${invoice.paymentStatus})`,
      `==================================================`,
      `Thank you for ordering with Rasoi Route!`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(textLines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden my-auto border border-gray-200">
        {/* Modal Toolbar (hidden in print) */}
        <div className="print:hidden flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-orange-100 text-orange-600 text-sm font-bold">
              🧾
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 leading-tight">
                Order Receipt
              </h3>
              <p className="text-[11px] text-gray-500">
                Invoice #{invoice.invoiceNumber} • Demonstration receipt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition shadow-2xs"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-gray-900 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-gray-800 transition shadow-xs"
            >
              <Printer size={13} />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-xl bg-gray-200/70 text-gray-600 hover:bg-gray-300 transition"
              aria-label="Close invoice"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div id="printable-tax-invoice" className="p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          {/* Header & Restaurant Info */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-gray-900 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-orange-500 text-white font-bold text-lg">
                  🍲
                </span>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-gray-900 leading-none">
                    Rasoi Route
                  </h1>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Authentic Culinary Cloud Kitchens
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-gray-600 pt-1 leading-relaxed">
                College demonstration — business registration details not configured.<br />
                <strong className="text-gray-900">SAC Code:</strong> 996331 (Restaurant & Takeaway Food Services)
              </p>
            </div>

            <div className="sm:text-right shrink-0 bg-orange-50/70 border border-orange-200 rounded-2xl p-3 sm:p-3.5">
              <span className="inline-block rounded-md bg-orange-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                ORDER RECEIPT
              </span>
              <p className="mt-1 text-xs font-mono font-bold text-gray-900">
                {invoice.invoiceNumber}
              </p>
              <p className="text-[11px] text-gray-500">
                Order: <strong className="font-mono text-gray-800">{invoice.orderId}</strong>
              </p>
              <p className="text-[11px] text-gray-500">
                {invoice.invoiceDate}
              </p>
            </div>
          </div>

          {/* Customer & Billing Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-gray-50/80 p-4 border border-gray-100 text-xs">
            <div>
              <p className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">
                Billed To & Delivery Address
              </p>
              <p className="mt-1 font-bold text-gray-900">
                {invoice.customerName || "Valued Customer"}
              </p>
              <p className="text-gray-600">{invoice.customerAddress || "Not provided"}</p>
              <p className="text-gray-600">Phone: {invoice.customerPhone || "Not provided"}</p>
            </div>

            <div className="sm:text-right">
              <p className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">
                Tax & Payment Status
              </p>
              <div className="mt-1 inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-md">
                <FileCheck2 size={12} /> {invoice.paymentStatus === "PAID" ? "PAID" : "PAYMENT DUE"} via {invoice.paymentMethod}
              </div>
              {invoice.isCorporateGst && invoice.gstin && (
                <div className="mt-2 text-left sm:text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Company & GSTIN</p>
                  <p className="font-bold text-gray-900">{invoice.companyName}</p>
                  <p className="font-mono text-xs text-orange-700 font-bold">{invoice.gstin}</p>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-gray-200 text-gray-500 uppercase font-extrabold text-[10px] tracking-wider">
                  <th className="pb-2.5">#</th>
                  <th className="pb-2.5">Item Description</th>
                  <th className="pb-2.5 text-center">SAC</th>
                  <th className="pb-2.5 text-center">Qty</th>
                  <th className="pb-2.5 text-right">Unit Rate</th>
                  <th className="pb-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-2.5 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 font-bold text-gray-900">{item.name}</td>
                    <td className="py-2.5 text-center font-mono text-gray-500 text-[11px]">996331</td>
                    <td className="py-2.5 text-center font-mono font-bold text-gray-800">{item.quantity}</td>
                    <td className="py-2.5 text-right font-mono text-gray-600">{money(item.unitPrice)}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-gray-900">{money(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown & Tax Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-gray-200">
            {/* Left: GST Tax Split Schedule */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-700 font-bold text-[11px]">
                <ShieldCheck size={13} className="text-orange-600" />
                <span>GST Tax Schedule (5% Composite GST)</span>
              </div>
              <div className="space-y-1 divide-y divide-gray-200/60 pt-1 text-[11px]">
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Net Taxable Base Amount:</span>
                  <span className="font-mono font-bold text-gray-900">{money(invoice.taxableValue)}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Central GST (CGST @ 2.5%):</span>
                  <span className="font-mono font-semibold text-gray-800">{money(invoice.cgst)}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>State GST (SGST @ 2.5%):</span>
                  <span className="font-mono font-semibold text-gray-800">{money(invoice.sgst)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-gray-900">
                  <span>Total Tax Assessment:</span>
                  <span className="font-mono text-orange-600">{money(invoice.totalGst)}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 italic pt-1 leading-normal">
                Demonstration tax calculation. This is not a legally issued tax invoice.
              </p>
            </div>

            {/* Right: Net Invoice Math */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Items Subtotal:</span>
                <span className="font-mono font-semibold text-gray-900">{money(invoice.subtotal)}</span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon ({invoice.discountLabel}):</span>
                  <span className="font-mono">−{money(invoice.discount)}</span>
                </div>
              )}

              {invoice.paymentOfferDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Bank Discount ({invoice.paymentOfferLabel}):</span>
                  <span className="font-mono">−{money(invoice.paymentOfferDiscount)}</span>
                </div>
              )}

              {invoice.coinsDiscount > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Coins Redeemed:</span>
                  <span className="font-mono">−{money(invoice.coinsDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Delivery Charge ({invoice.deliveryLabel}):</span>
                <span className="font-mono font-semibold text-gray-900">
                  {invoice.deliveryFee === 0 ? "FREE" : money(invoice.deliveryFee)}
                </span>
              </div>

              {invoice.packagingFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Eco Packaging:</span>
                  <span className="font-mono font-semibold text-gray-900">{money(invoice.packagingFee)}</span>
                </div>
              )}

              {invoice.platformFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Platform Fee:</span>
                  <span className="font-mono font-semibold text-gray-900">{money(invoice.platformFee)}</span>
                </div>
              )}

              {invoice.riderTip > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Partner Tip:</span>
                  <span className="font-mono font-semibold text-gray-900">{money(invoice.riderTip)}</span>
                </div>
              )}

              {invoice.charityRoundUp > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Mid-Day Meal Charity:</span>
                  <span className="font-mono font-semibold text-gray-900">{money(invoice.charityRoundUp)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Taxes (5% GST):</span>
                <span className="font-mono font-semibold text-gray-900">{money(invoice.totalGst)}</span>
              </div>

              <div className="flex justify-between pt-3 border-t-2 border-gray-900 text-sm font-black text-gray-900">
                <span>Total Amount {invoice.paymentStatus === "PAID" ? "Paid" : "Due"}:</span>
                <span className="font-mono text-base text-orange-600">{money(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Footer & QR Verification */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-[11px] text-gray-500">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-800">Rasoi Route Digital Invoicing System</p>
              <p>Computer-generated demonstration receipt.</p>
              <p className="text-[10px] text-gray-400">Keep your order ID for reference.</p>
            </div>

            <div className="shrink-0 flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <QrCode size={24} className="text-gray-800" />
              <div className="text-[10px] font-mono leading-tight">
                <span className="font-bold block text-gray-900">ORDER RECORD</span>
                <span className="text-gray-500">DEMO RECEIPT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
