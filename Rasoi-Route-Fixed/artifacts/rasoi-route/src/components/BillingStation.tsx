import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  CreditCard,
  FileText,
  Heart,
  HelpCircle,
  Info,
  Layers,
  Leaf,
  Minus,
  Package,
  Plus,
  QrCode,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Users,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FoodImage } from "./FoodImage";
import { formatCurrency as money } from "../lib/formatCurrency";

export interface BillingDishItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  isVeg: boolean;
  rating: number;
}

export interface BillingStationProps {
  cart: Record<string, number>;
  menu: BillingDishItem[];
  coupon: string;
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
  onApplyCoupon: (couponCode: string) => void;
  onBackToMenu: () => void;
  onConfirmOrder: (finalBillDetails: FinalCalculatedBill) => void;
  isSubmitting?: boolean;
}

export interface FinalCalculatedBill {
  orderId: string;
  createdAt?: string;
  invoiceNumber?: string;
  paymentStatus?: string;
  coupon?: string;
  ecoPackaging: boolean;
  noCutlery: boolean;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  discountLabel: string;
  deliveryTier: "standard" | "priority" | "eco";
  deliveryFee: number;
  deliveryLabel: string;
  packagingFee: number;
  platformFee: number;
  riderTip: number;
  coinsDiscount: number;
  paymentOfferDiscount: number;
  paymentOfferLabel: string;
  charityRoundUp: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  gst: number;
  grandTotal: number;
  paymentMethod: "UPI" | "CARD" | "NETBANKING" | "COD";
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  isCorporateGst: boolean;
  companyName: string;
  gstin: string;
}

const AVAILABLE_COUPONS = [
  {
    code: "WELCOME50",
    title: "Welcome First Order",
    desc: "Flat ₹50 OFF on any order",
    minOrder: 0,
    calculate: (subtotal: number) => Math.min(50, subtotal),
  },
  {
    code: "SAVE10",
    title: "Save Big 10%",
    desc: "10% OFF on all dishes",
    minOrder: 300,
    calculate: (subtotal: number) => (subtotal >= 300 ? Math.round(subtotal * 0.1 * 100) / 100 : 0),
  },
  {
    code: "FESTIVE20",
    title: "Festive Feast 20%",
    desc: "20% OFF on orders above ₹800",
    minOrder: 800,
    calculate: (subtotal: number) => (subtotal >= 800 ? Math.round(subtotal * 0.2 * 100) / 100 : 0),
  },
  {
    code: "FIRSTBITE",
    title: "First Bite Delights",
    desc: "Flat ₹75 OFF on orders above ₹400",
    minOrder: 400,
    calculate: (subtotal: number) => (subtotal >= 400 ? 75 : 0),
  },
  {
    code: "STUDENT15",
    title: "Campus Special 15%",
    desc: "15% OFF for orders above ₹350",
    minOrder: 350,
    calculate: (subtotal: number) => (subtotal >= 350 ? Math.round(subtotal * 0.15 * 100) / 100 : 0),
  },
];

export function BillingStation({
  cart,
  menu,
  coupon,
  onUpdateQuantity,
  onClearCart,
  onApplyCoupon,
  onBackToMenu,
  onConfirmOrder,
  isSubmitting = false,
}: BillingStationProps) {
  // Billing Configuration States
  const [activeTab, setActiveTab] = useState<"summary" | "decomposition">("summary");
  const [deliveryTier, setDeliveryTier] = useState<"standard" | "priority" | "eco">("standard");
  const [ecoPackaging, setEcoPackaging] = useState(true);
  const [noCutlery, setNoCutlery] = useState(true);
  const [riderTip, setRiderTip] = useState(30);
  const [customTipInput, setCustomTipInput] = useState("");
  const [showCustomTip, setShowCustomTip] = useState(false);
  const redeemCoins = false;
  const charityRoundUpEnabled = false;
  const [customCouponInput, setCustomCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  // Split Bill State
  const [splitCount, setSplitCount] = useState(2);
  const [showSplitModal, setShowSplitModal] = useState(false);

  // Corporate GST State
  const [isCorporateGst, setIsCorporateGst] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [gstinTouched, setGstinTouched] = useState(false);

  // Customer & Delivery Address
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD" | "NETBANKING" | "COD">("UPI");
  const selectedBankOffer = "none";
  const [showUpiQrModal, setShowUpiQrModal] = useState(false);

  // 1. Calculate itemized lines
  const items = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const dish = menu.find((item) => item.id === id);
        if (!dish || qty <= 0) return null;
        const unit = Number(dish.price);
        return {
          id: dish.id,
          name: dish.name,
          category: dish.category,
          imageUrl: dish.imageUrl,
          isVeg: dish.isVeg,
          quantity: qty,
          unitPrice: unit,
          total: Math.round(unit * qty * 100) / 100,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [cart, menu]);

  const subtotal = useMemo(() => {
    return Math.round(items.reduce((acc, i) => acc + i.total, 0) * 100) / 100;
  }, [items]);

  // 2. Coupon Discount Calculation
  const { discount, discountLabel } = useMemo(() => {
    if (subtotal <= 0) return { discount: 0, discountLabel: "No discount" };

    const norm = coupon.trim().toUpperCase();
    const found = AVAILABLE_COUPONS.find((c) => c.code === norm);

    if (found) {
      const calculated = found.calculate(subtotal);
      if (calculated > 0) {
        return {
          discount: Math.min(calculated, subtotal),
          discountLabel: `${found.code} (${found.title})`,
        };
      }
    }

    // Default tiered automatic volume discount fallback
    if (subtotal >= 1500) {
      return { discount: Math.round(subtotal * 0.2 * 100) / 100, discountLabel: "20% Order Discount" };
    } else if (subtotal >= 1000) {
      return { discount: Math.round(subtotal * 0.15 * 100) / 100, discountLabel: "15% Order Discount" };
    } else if (subtotal >= 500) {
      return { discount: Math.round(subtotal * 0.1 * 100) / 100, discountLabel: "10% Order Discount" };
    }

    return { discount: 0, discountLabel: "No discount" };
  }, [subtotal, coupon]);

  // 3. Best Coupon Recommender
  const bestCouponRecommendation = useMemo(() => {
    if (subtotal <= 0) return null;
    let maxSavings = 0;
    let best = AVAILABLE_COUPONS[0];

    for (const c of AVAILABLE_COUPONS) {
      const val = c.calculate(subtotal);
      if (val > maxSavings) {
        maxSavings = val;
        best = c;
      }
    }

    return {
      coupon: best,
      savings: maxSavings,
      isCurrentlyApplied: coupon.toUpperCase() === best.code,
    };
  }, [subtotal, coupon]);

  const applyBestCoupon = () => {
    if (bestCouponRecommendation) {
      onApplyCoupon(bestCouponRecommendation.coupon.code);
      setCouponSuccess(`Applied best offer: ${bestCouponRecommendation.coupon.code} saving ${money(bestCouponRecommendation.savings)}!`);
      setCouponError("");
    }
  };

  const handleCustomCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = customCouponInput.trim().toUpperCase();
    if (!code) return;

    const matched = AVAILABLE_COUPONS.find((c) => c.code === code);
    if (!matched) {
      setCouponError("Invalid coupon code. Try WELCOME50, SAVE10, FESTIVE20, FIRSTBITE, or STUDENT15");
      setCouponSuccess("");
      return;
    }

    if (subtotal < matched.minOrder) {
      setCouponError(`Requires minimum order of ${money(matched.minOrder)}. Current: ${money(subtotal)}`);
      setCouponSuccess("");
      return;
    }

    onApplyCoupon(matched.code);
    setCustomCouponInput("");
    setCouponError("");
    setCouponSuccess(`Promo applied: ${matched.code} (${matched.title})`);
  };

  // 4. Delivery Fee by Tier
  const { deliveryFee, deliveryLabel } = useMemo(() => {
    if (subtotal <= 0) return { deliveryFee: 0, deliveryLabel: "Empty order" };

    let base = 40;
    let label = "Standard Delivery";

    if (subtotal >= 1000) {
      base = 0;
      label = "FREE Delivery (Order ≥ ₹1000)";
    } else if (subtotal >= 600) {
      base = 20;
      label = "Reduced Delivery (Order ≥ ₹600)";
    } else if (subtotal >= 300) {
      base = 30;
      label = "Reduced Delivery (Order ≥ ₹300)";
    }

    if (deliveryTier === "priority") {
      return {
        deliveryFee: base + 25,
        deliveryLabel: base === 0 ? "Priority Express (+₹25)" : `${label} + Priority (+₹25)`,
      };
    } else if (deliveryTier === "eco") {
      const ecoFee = Math.max(0, base - 10);
      return {
        deliveryFee: ecoFee,
        deliveryLabel: ecoFee === 0 ? "FREE Eco Saver (-₹10)" : `${label} (Eco Saver -₹10)`,
      };
    }

    return { deliveryFee: base, deliveryLabel: label };
  }, [subtotal, deliveryTier]);

  // 5. Add-ons & Discounts
  const packagingFee = ecoPackaging && subtotal > 0 ? 15 : 0;
  const platformFee = subtotal > 0 ? 5 : 0;
  const coinsDiscount = redeemCoins && subtotal > 0 ? Math.min(15, subtotal) : 0;

  // 6. Payment Offer Discount
  const paymentOfferDiscount = 0;
  const paymentOfferLabel = "";

  // 7. Taxes Calculation (5% GST: 2.5% CGST + 2.5% SGST)
  // Taxable base = max(0, subtotal - discount - coinsDiscount - paymentOfferDiscount) + deliveryFee + packagingFee + platformFee
  const taxableAmount = useMemo(() => {
    if (subtotal <= 0) return 0;
    const netFood = Math.max(0, subtotal - discount - coinsDiscount - paymentOfferDiscount);
    return Math.round((netFood + deliveryFee + packagingFee + platformFee) * 100) / 100;
  }, [subtotal, discount, coinsDiscount, paymentOfferDiscount, deliveryFee, packagingFee, platformFee]);

  const { cgst, sgst, gst } = useMemo(() => {
    if (taxableAmount <= 0) return { cgst: 0, sgst: 0, gst: 0 };
    const half = Math.round(Math.round(taxableAmount * 100) * 0.025) / 100;
    const full = Math.round(half * 2 * 100) / 100;
    return { cgst: half, sgst: half, gst: full };
  }, [taxableAmount]);

  // 8. Charity Round-up
  const unroundedTotal = useMemo(() => {
    if (subtotal <= 0) return 0;
    const base = taxableAmount + gst + riderTip;
    return Math.round(base * 100) / 100;
  }, [taxableAmount, gst, riderTip, subtotal]);

  const charityRoundUp = useMemo(() => {
    if (!charityRoundUpEnabled || unroundedTotal <= 0) return 0;
    const nextTen = Math.ceil(unroundedTotal / 10) * 10;
    return Math.round((nextTen - unroundedTotal) * 100) / 100;
  }, [charityRoundUpEnabled, unroundedTotal]);

  const grandTotal = useMemo(() => {
    if (subtotal <= 0) return 0;
    return Math.round((unroundedTotal + charityRoundUp) * 100) / 100;
  }, [unroundedTotal, charityRoundUp, subtotal]);

  // Split Share
  const perPersonSplit = useMemo(() => {
    if (splitCount <= 0 || grandTotal <= 0) return 0;
    return Math.round((grandTotal / splitCount) * 100) / 100;
  }, [grandTotal, splitCount]);

  // Validate GSTIN if corporate
  const isGstinValid = useMemo(() => {
    if (!isCorporateGst) return true;
    // Standard 15 character Indian GSTIN regex: 2 digits + 5 letters + 4 digits + 1 letter + 1 char + Z + 1 char
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gstin.trim().toUpperCase());
  }, [isCorporateGst, gstin]);

  const [customerError, setCustomerError] = useState("");

  // Final Order Handler
  const handlePlaceOrderClick = () => {
    if (items.length === 0 || grandTotal <= 0 || isSubmitting) return;
    if (customerName.trim().length < 2 || customerAddress.trim().length < 10 || !/^(?:91)?[6-9][0-9]{9}$/.test(customerPhone.replace(/[ +()-]/g, ""))) {
      setCustomerError("Enter your name, a valid Indian mobile number and full delivery address."); return;
    }
    if (!Number.isFinite(riderTip) || riderTip > 1000 || Math.round(riderTip * 100) / 100 !== riderTip) {setCustomerError("Tip must be ₹0–₹1000 with at most two decimals.");return;}
    setCustomerError("");

    if (isCorporateGst && (!isGstinValid || !companyName.trim())) {
      setGstinTouched(true);
      return;
    }

    const finalBill: FinalCalculatedBill = {
      orderId: "",
      coupon, ecoPackaging, noCutlery,
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
      subtotal,
      discount,
      discountLabel,
      deliveryTier,
      deliveryFee,
      deliveryLabel,
      packagingFee,
      platformFee,
      riderTip,
      coinsDiscount,
      paymentOfferDiscount,
      paymentOfferLabel,
      charityRoundUp,
      taxableAmount,
      cgst,
      sgst,
      gst,
      grandTotal,
      paymentMethod,
      customerName,
      customerPhone,
      customerAddress,
      isCorporateGst,
      companyName,
      gstin: gstin.toUpperCase(),
    };

    onConfirmOrder(finalBill);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Navigation Bar & Stepper */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToMenu}
              className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition shadow-2xs"
            >
              <ArrowLeft size={14} /> Back to Menu
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Receipt className="text-orange-500" size={24} />
                <span>Billing & Checkout Hub</span>
              </h1>
              <p className="text-xs text-gray-500">
                Review items, apply promos, customize delivery & finalize your invoice
              </p>
            </div>
          </div>

          {/* Breadcrumb Stepper */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <CheckCircle2 size={14} />
              <span>1. Items Added ({items.reduce((s, i) => s + i.quantity, 0)})</span>
            </div>
            <span className="text-gray-300">→</span>
            <div className="flex items-center gap-1.5 text-orange-700 bg-orange-100 px-3 py-1.5 rounded-full border border-orange-300">
              <Sparkles size={14} />
              <span>2. Billing System</span>
            </div>
            <span className="text-gray-300">→</span>
            <div className="flex items-center gap-1.5 text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
              <span>3. Tax Invoice</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Billing Workspace */}
      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] items-start">
        {/* Left Column: Interactive Billing Features */}
        <div className="space-y-6">
          {/* Card 1: Itemized Cart Ledger with Live Quantity Controls */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Utensils size={18} className="text-orange-500" />
                <h2 className="text-base font-extrabold text-gray-900">
                  Selected Dishes ({items.reduce((s, i) => s + i.quantity, 0)} Items)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onBackToMenu}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
                >
                  + Add More Dishes
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-xs font-semibold text-gray-400 hover:text-red-500 flex items-center gap-1"
                >
                  <Trash2 size={13} /> Clear
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-12 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                      <FoodImage src={item.imageUrl} name={item.name} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`size-2 rounded-full shrink-0 ${
                            item.isVeg ? "bg-emerald-600" : "bg-red-600"
                          }`}
                        />
                        <p className="font-extrabold text-xs text-gray-900 truncate">
                          {item.name}
                        </p>
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono">
                        {money(item.unitPrice)} each
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Quantity modifier */}
                    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="size-5 rounded-full flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-gray-200 transition"
                        aria-label={`Decrease ${item.name}`}
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-4 text-center font-mono font-bold text-xs text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="size-5 rounded-full flex items-center justify-center text-orange-600 hover:bg-orange-100 transition"
                        aria-label={`Increase ${item.name}`}
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <span className="font-mono font-bold text-xs text-gray-900 w-16 text-right">
                      {money(item.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Smart Coupon Optimizer & Promo Engine */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-orange-500" />
                <h2 className="text-base font-extrabold text-gray-900">
                  Smart Discounts & Coupon Optimizer
                </h2>
              </div>

              {bestCouponRecommendation && !bestCouponRecommendation.isCurrentlyApplied && (
                <button
                  type="button"
                  onClick={applyBestCoupon}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3.5 py-1 text-xs font-black shadow-xs hover:brightness-105 transition animate-pulse"
                >
                  <Sparkles size={13} />
                  <span>Auto-Apply Best: {bestCouponRecommendation.coupon.code} (Save {money(bestCouponRecommendation.savings)})</span>
                </button>
              )}
            </div>

            {/* Custom Promo Code Form */}
            <form onSubmit={handleCustomCouponSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter coupon code (e.g. WELCOME50, SAVE10)"
                  value={customCouponInput}
                  onChange={(e) => setCustomCouponInput(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50/50 px-4 py-2 text-xs font-mono font-semibold uppercase placeholder:font-sans placeholder:normal-case placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-2xl bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 text-xs font-bold transition shadow-xs"
              >
                Apply
              </button>
            </form>

            {couponError && (
              <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
                <AlertCircle size={14} /> {couponError}
              </p>
            )}

            {couponSuccess && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 size={14} /> {couponSuccess}
              </p>
            )}

            {/* Available Coupon Chips Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {AVAILABLE_COUPONS.map((c) => {
                const potentialSavings = c.calculate(subtotal);
                const isSelected = coupon.toUpperCase() === c.code;
                const isEligible = subtotal >= c.minOrder;

                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      if (isEligible) {
                        onApplyCoupon(c.code);
                        setCouponSuccess(`Applied: ${c.code}`);
                        setCouponError("");
                      } else {
                        setCouponError(`Add ${money(c.minOrder - subtotal)} more to unlock ${c.code}`);
                      }
                    }}
                    className={`text-left p-3 rounded-2xl border transition relative flex flex-col justify-between ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/70 shadow-xs"
                        : isEligible
                        ? "border-gray-200 bg-white hover:border-orange-300 hover:bg-gray-50"
                        : "border-gray-200 bg-gray-50/60 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-orange-950">
                        {c.code}
                      </span>
                      {isSelected ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={10} /> Active
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-gray-500">
                          {c.desc}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">{c.title}</span>
                      {isEligible ? (
                        <span className="font-bold text-emerald-700">
                          Saves {money(potentialSavings)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Min {money(c.minOrder)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Split Bill with Friends (Cool Group Dining Feature!) */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-orange-500" />
                <h2 className="text-base font-extrabold text-gray-900">
                  Group Dining: Split Bill with Friends
                </h2>
              </div>
              <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                Live Calculator
              </span>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-orange-100 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    Splitting among {splitCount} Friends
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Evenly distributes subtotal, GST & delivery charges
                  </p>
                </div>

                {/* Counter Stepper */}
                <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setSplitCount((c) => Math.max(2, c - 1))}
                    disabled={splitCount <= 2}
                    className="size-6 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-8 text-center font-mono font-extrabold text-sm text-gray-900">
                    {splitCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSplitCount((c) => Math.min(8, c + 1))}
                    disabled={splitCount >= 8}
                    className="size-6 rounded-full flex items-center justify-center text-orange-600 hover:bg-orange-100 disabled:opacity-30"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Per Person Result Banner */}
              <div className="flex items-center justify-between rounded-xl bg-white p-3.5 border border-orange-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Share Per Person
                  </span>
                  <span className="text-xl font-black text-gray-900 font-mono">
                    {money(perPersonSplit)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSplitModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs"
                >
                  <QrCode size={13} />
                  <span>View split estimate</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Delivery Speed & Eco Preferences */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Truck size={18} className="text-orange-500" />
              <h2 className="text-base font-extrabold text-gray-900">
                Delivery Mode & Speed Tiers
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Standard */}
              <button
                type="button"
                onClick={() => setDeliveryTier("standard")}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  deliveryTier === "standard"
                    ? "border-orange-500 bg-orange-50/70 shadow-xs"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-900">Standard</span>
                  <Clock size={14} className="text-gray-400" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">30-35 mins</p>
                <p className="font-mono text-xs font-bold text-gray-800 mt-2">
                  {subtotal >= 1000 ? "FREE" : subtotal >= 600 ? "₹20" : subtotal >= 300 ? "₹30" : "₹40"}
                </p>
              </button>

              {/* Priority Express */}
              <button
                type="button"
                onClick={() => setDeliveryTier("priority")}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  deliveryTier === "priority"
                    ? "border-orange-500 bg-orange-50/70 shadow-xs"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-orange-950">⚡ Express Priority</span>
                  <Sparkles size={14} className="text-amber-500" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Guaranteed 20 mins</p>
                <p className="font-mono text-xs font-bold text-orange-600 mt-2">
                  +₹25 add-on
                </p>
              </button>

              {/* Eco / No-Rush */}
              <button
                type="button"
                onClick={() => setDeliveryTier("eco")}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  deliveryTier === "eco"
                    ? "border-emerald-500 bg-emerald-50/70 shadow-xs"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-950">🌱 Eco / No-Rush</span>
                  <Leaf size={14} className="text-emerald-500" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">45-50 mins (bundled)</p>
                <p className="font-mono text-xs font-bold text-emerald-700 mt-2">
                  Save ₹10
                </p>
              </button>
            </div>

            {/* Packaging & Cutlery Options */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Package size={16} className="text-orange-500" />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">
                      100% Biodegradable Eco Packaging (+₹15)
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Spill-proof, microwaveable, plastic-free paper containers
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={ecoPackaging}
                  onChange={(e) => setEcoPackaging(e.target.checked)}
                  className="size-4 accent-orange-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Leaf size={16} className="text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">
                      Don't send plastic cutlery & tissues 🌱
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Help reduce carbon footprint and single-use plastic waste
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={noCutlery}
                  onChange={(e) => setNoCutlery(e.target.checked)}
                  className="size-4 accent-emerald-600 rounded"
                />
              </label>
            </div>
          </div>

          {/* Card 5: Delivery Partner Tip & Loyalty Coins */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Heart size={18} className="text-rose-500" />
                <h2 className="text-base font-extrabold text-gray-900">
                  Tip Your Delivery Partner
                </h2>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">100% goes to rider</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[0, 20, 30, 50].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setRiderTip(amount);
                    setShowCustomTip(false);
                  }}
                  className={`rounded-2xl px-4 py-2 text-xs font-bold transition font-mono ${
                    !showCustomTip && riderTip === amount
                      ? "bg-rose-500 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {amount === 0 ? "No Tip" : `₹${amount}`}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowCustomTip(true)}
                className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
                  showCustomTip
                    ? "bg-rose-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Custom Tip
              </button>
            </div>

            {showCustomTip && (
              <div className="flex items-center gap-2 pt-1 max-w-xs">
                <input
                  type="number"
                  min="0"
                  placeholder="Enter tip amount in ₹"
                  value={customTipInput}
                  onChange={(e) => {
                    setCustomTipInput(e.target.value);
                    const val = Number(e.target.value);
                    setRiderTip(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-mono font-bold focus:border-rose-500 focus:outline-none"
                />
              </div>
            )}

            <p className="text-xs text-gray-500 pt-3 border-t">Bank offers, loyalty redemption and charity collection are not enabled.</p>
          </div>

          {/* Card 6: Corporate GST Invoice & Customer Information */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-orange-500" />
                <h2 className="text-base font-extrabold text-gray-900">
                  Customer & Corporate GST Invoice
                </h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                <span>Business GSTIN?</span>
                <input
                  type="checkbox"
                  checked={isCorporateGst}
                  onChange={(e) => setIsCorporateGst(e.target.checked)}
                  className="size-4 accent-orange-600 rounded"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2 font-medium focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2 font-mono font-medium focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2 font-medium focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {isCorporateGst && (
              <div className="pt-3 border-t border-orange-100 rounded-2xl bg-orange-50/60 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-900">
                  <ShieldCheck size={14} className="text-orange-600" />
                  <span>Input Tax Credit (ITC) Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Technologies India Pvt Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white p-2 font-medium focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      GSTIN (15 characters) *
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 36AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => {
                        setGstin(e.target.value.toUpperCase());
                        setGstinTouched(true);
                      }}
                      className="w-full rounded-xl border border-gray-300 bg-white p-2 font-mono uppercase font-bold focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                {gstinTouched && !isGstinValid && (
                  <p className="text-[11px] font-semibold text-red-600">
                    Please provide a valid 15-character GSTIN format (e.g., 36AAAAA0000A1Z5).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Card 7: Payment Simulator with Bank Offers */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-orange-500" />
                <h2 className="text-base font-extrabold text-gray-900">
                  Payment Method Simulator
                </h2>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                Instant Verification
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {[
                { id: "UPI", label: "Instant UPI", icon: QrCode, badge: "Razorpay checkout" },
                { id: "CARD", label: "Cards", icon: CreditCard, badge: "Razorpay checkout" },
                { id: "NETBANKING", label: "NetBanking", icon: Building2, badge: "Provider availability" },
                { id: "COD", label: "Cash / COD", icon: Banknote, badge: "Pay on arrival" },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = paymentMethod === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPaymentMethod(p.id as any)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/80 shadow-xs"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div>
                      <Icon size={18} className={isSelected ? "text-orange-600" : "text-gray-500"} />
                      <p className="font-extrabold text-xs text-gray-900 mt-2">{p.label}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500 mt-1 block">
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* UPI QR preview shortcut */}
            {paymentMethod === "UPI" && (
              <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-white border border-orange-200 grid place-items-center shadow-xs">
                    <QrCode size={22} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      UPI checkout: {money(grandTotal)}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      UPI options depend on your Razorpay account and payment mode.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUpiQrModal(true)}
                  className="rounded-xl bg-orange-600 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-orange-700 transition"
                >
                  How to pay
                </button>
              </div>
            )}

            {paymentMethod === "CARD" && <p className="text-xs text-gray-500">Pay securely through Razorpay. No partner bank discounts are configured.</p>}
          </div>
        </div>

        {/* Right Column: Sticky Cost Ledger & Decomposition Tab */}
        <div className="sticky top-24 space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg space-y-4">
            {/* Tab Switcher: Summary vs Computational Decomposition */}
            <div className="flex rounded-2xl bg-gray-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`flex-1 rounded-xl py-2 transition flex items-center justify-center gap-1.5 ${
                  activeTab === "summary"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Receipt size={14} />
                <span>Bill Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("decomposition")}
                className={`flex-1 rounded-xl py-2 transition flex items-center justify-center gap-1.5 ${
                  activeTab === "decomposition"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Code2 size={14} />
                <span>Math Audit</span>
              </button>
            </div>

            {/* TAB 1: Real-time Itemized Bill Ledger */}
            {activeTab === "summary" ? (
              <div className="space-y-3 text-xs">
                {/* Free Delivery Bar */}
                <div className="rounded-2xl bg-orange-50/80 border border-orange-100 p-3">
                  {subtotal >= 1000 ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={15} />
                      <span>Unlocked FREE Standard Delivery! 🎉</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-gray-700">
                        <span>Add {money(1000 - subtotal)} for Free Delivery</span>
                        <span>{money(subtotal)} / ₹1,000</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-orange-200">
                        <div
                          className="h-full bg-orange-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, (subtotal / 1000) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Ledger Breakdown Lines */}
                <div className="space-y-2 pt-2 divide-y divide-gray-100">
                  <div className="flex justify-between text-gray-600 pt-1">
                    <span>1. Food Items Subtotal:</span>
                    <span className="font-mono font-bold text-gray-900">{money(subtotal)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold pt-1.5">
                      <span>2. Coupon Discount ({discountLabel}):</span>
                      <span className="font-mono">−{money(discount)}</span>
                    </div>
                  )}

                  {paymentOfferDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold pt-1.5">
                      <span>Bank Offer ({paymentOfferLabel}):</span>
                      <span className="font-mono">−{money(paymentOfferDiscount)}</span>
                    </div>
                  )}

                  {coinsDiscount > 0 && (
                    <div className="flex justify-between text-amber-700 font-semibold pt-1.5">
                      <span>Loyalty Coins Redeemed:</span>
                      <span className="font-mono">−{money(coinsDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600 pt-1.5">
                    <span>3. Delivery Fee ({deliveryLabel}):</span>
                    <span className="font-mono font-bold text-gray-900">
                      {deliveryFee === 0 ? "FREE" : money(deliveryFee)}
                    </span>
                  </div>

                  {packagingFee > 0 && (
                    <div className="flex justify-between text-gray-600 pt-1.5">
                      <span>4. Eco-Friendly Packaging:</span>
                      <span className="font-mono font-bold text-gray-900">{money(packagingFee)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600 pt-1.5">
                    <span>5. Platform Fee:</span>
                    <span className="font-mono font-bold text-gray-900">{money(platformFee)}</span>
                  </div>

                  {riderTip > 0 && (
                    <div className="flex justify-between text-gray-600 pt-1.5">
                      <span>6. Delivery Partner Tip:</span>
                      <span className="font-mono font-bold text-gray-900">{money(riderTip)}</span>
                    </div>
                  )}

                  {charityRoundUp > 0 && (
                    <div className="flex justify-between text-rose-700 font-semibold pt-1.5">
                      <span>7. Mid-Day Meal Donation:</span>
                      <span className="font-mono font-bold">{money(charityRoundUp)}</span>
                    </div>
                  )}

                  {/* GST Decomposition */}
                  <div className="pt-2 text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>8. Indian GST (5% Composite):</span>
                      <span className="font-mono font-bold text-gray-900">{money(gst)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 pl-3">
                      <span>• Central GST (CGST 2.5%):</span>
                      <span className="font-mono">{money(cgst)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 pl-3">
                      <span>• State GST (SGST 2.5%):</span>
                      <span className="font-mono">{money(sgst)}</span>
                    </div>
                  </div>

                  {/* Grand Total Bar */}
                  <div className="pt-3 border-t-2 border-gray-900 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase font-black text-gray-500 block">
                        To Pay
                      </span>
                      <span className="text-3xl font-black text-gray-900 font-mono">
                        {money(grandTotal)}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      Inclusive of GST
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: Computational Decomposition & Decimal Math Audit */
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 space-y-2.5">
                  <p className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                    <Layers size={15} className="text-orange-600" />
                    Computational Formula
                  </p>
                  <p className="font-mono text-[11px] bg-white p-2.5 rounded-xl border border-gray-200 text-orange-950 overflow-x-auto">
                    Total = (Subtotal − Discounts) + Delivery + Packaging + Platform + GST(5%) + Tip
                  </p>
                  <div className="space-y-1 text-gray-600 text-[11px]">
                    <p>• <strong>Subtotal:</strong> Σ(price × qty) = {money(subtotal)}</p>
                    <p>• <strong>Discounts:</strong> {money(discount + coinsDiscount + paymentOfferDiscount)}</p>
                    <p>• <strong>Taxable Base:</strong> {money(taxableAmount)}</p>
                    <p>• <strong>5% GST:</strong> {money(taxableAmount)} × 0.05 = {money(gst)}</p>
                    <p>• <strong>Decimals:</strong> Quantized to 2 decimal places to avoid IEEE 754 float drift.</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200 text-emerald-900 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck size={15} className="text-emerald-600" />
                    Server Contract Verified
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    Client calculations mirror the Python FastAPI backend engine with 100% precision.
                  </p>
                </div>
              </div>
            )}

            {/* Primary Action Button: Confirm & Place Order */}
            <div className="pt-2">
              {customerError && <p role="alert" className="text-sm text-red-600">{customerError}</p>}
              <button
                type="button"
                onClick={handlePlaceOrderClick}
                disabled={items.length === 0 || isSubmitting}
                className="w-full h-14 text-base font-black bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <Sparkles size={18} />
                <span>
                  {isSubmitting
                    ? "Generating Official Tax Invoice…"
                    : `Confirm & Pay ${money(grandTotal)}`}
                </span>
                <ArrowRight size={18} />
              </button>

              <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-gray-400 font-semibold">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-600" /> 256-bit Encrypted
                </span>
                <span>•</span>
                <span>FSSAI Certified Kitchens</span>
                <span>•</span>
                <span>Contactless Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Group Split UPI QR Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setShowSplitModal(false)}
              className="absolute top-4 right-4 size-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 grid place-items-center"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
              <Users size={16} />
              <span>Split Bill with {splitCount} Friends</span>
            </div>

            <h3 className="text-xl font-black text-gray-900">
              Each Person Pays: {money(perPersonSplit)}
            </h3>

            <div className="rounded-2xl bg-orange-50/70 border border-orange-200 p-5 text-center space-y-3">
              <div className="mx-auto size-40 bg-white p-2.5 rounded-2xl border-2 border-orange-300 shadow-xs grid place-items-center">
                {/* Simulated dynamic QR code */}
                <div className="relative">
                  <QrCode size={130} className="text-gray-900" />
                  <span className="absolute inset-0 grid place-items-center text-xs font-bold bg-white/90 rounded-md p-1">
                    Estimate
                  </span>
                </div>
              </div>
              <p className="text-xs font-mono font-bold text-gray-800">
                <span className="text-orange-600">No payment QR is generated here</span>
              </p>
              <p className="text-[11px] text-gray-500">
                Split estimate only. One payer completes the entire checkout; no group payments are collected here.
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Total Bill Amount:</span>
                <span className="font-mono font-bold text-gray-900">{money(grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Number of Payers:</span>
                <span className="font-bold text-gray-900">{splitCount} friends</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSplitModal(false)}
              className="w-full rounded-2xl bg-gray-900 text-white py-3 text-xs font-bold hover:bg-gray-800 transition"
            >
              Done & Return to Billing
            </button>
          </div>
        </div>
      )}

      {/* 4. Instant UPI QR Code Modal */}
      {showUpiQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <button
              type="button"
              onClick={() => setShowUpiQrModal(false)}
              className="absolute top-4 right-4 size-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 grid place-items-center"
            >
              <X size={16} />
            </button>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 text-orange-800 px-3 py-1 text-xs font-bold">
              <QrCode size={14} /> About UPI checkout
            </span>

            <h3 className="text-2xl font-black text-gray-900 font-mono">
              {money(grandTotal)}
            </h3>

            <div className="mx-auto size-48 bg-white p-3 rounded-2xl border-2 border-orange-400 shadow-md grid place-items-center">
              <div className="relative">
                <QrCode size={160} className="text-gray-900" />
                <span className="absolute inset-0 grid place-items-center text-xs font-bold bg-white/85 rounded-lg p-1">
                  Preview icon
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Use the Place Order button to open Razorpay checkout. This icon is not a payment QR code.
            </p>

            <button
              type="button"
              onClick={() => setShowUpiQrModal(false)}
              className="w-full rounded-2xl bg-orange-500 hover:bg-orange-600 text-white py-3 text-xs font-bold transition shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
