import { createFileRoute } from "@tanstack/react-router";
import { useGetMenu } from "@workspace/api-client-react";
import type { FoodItem } from "@workspace/api-client-react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  FileCheck2,
  FileText,
  Filter,
  Heart,
  HelpCircle,
  Layers,
  MapPin,
  Minus,
  PartyPopper,
  Percent,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Users,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useMemo, useState, useRef } from "react";
import { CommerceAccess, commerceRequest, payRazorpay } from "../components/CommerceAccess";
import { BillingStation, type FinalCalculatedBill } from "../components/BillingStation";
import { Button } from "../components/Button";
import { FoodImage } from "../components/FoodImage";
import { TaxInvoiceModal, type InvoiceData } from "../components/TaxInvoiceModal";
import { formatCurrency as money } from "../lib/formatCurrency";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rasoi Route — Authentic Indian Food Delivery & Billing" },
      {
        name: "description",
        content:
          "An Indian food-delivery application needs to process an order containing multiple food items, calculate the subtotal, apply discounts, calculate delivery charges and taxes, and finally generate the bill. Apply decomposition and abstraction to this problem.",
      },
    ],
  }),
  component: ModernFoodApp,
});

interface ExtendedFoodItem extends FoodItem {
  isVeg: boolean;
  rating: number;
}

// Complete verified catalog of 16 authentic Indian dishes with accurate photos (Gulab Jamun removed)
const STATIC_MENU: ExtendedFoodItem[] = [
  // Biryani & Rice
  {
    id: "chicken-biryani",
    name: "Hyderabadi Chicken Biryani",
    category: "Biryani",
    price: 249,
    description: "Slow-cooked fragrant basmati rice layered with succulent marinated chicken, saffron & caramelised onions.",
    imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=85",
    isVeg: false,
    rating: 4.9,
  },
  {
    id: "butter-chicken",
    name: "Butter Chicken (Murgh Makhani)",
    category: "North Indian",
    price: 269,
    description: "Tandoori chicken pieces simmered in a rich, buttery tomato cream gravy with aromatic kasuri methi.",
    imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=85",
    isVeg: false,
    rating: 4.9,
  },
  {
    id: "paneer-butter-masala",
    name: "Paneer Butter Masala",
    category: "North Indian",
    price: 229,
    description: "Melt-in-mouth cottage cheese cubes simmered in a velvety cashew, tomato and butter gravy.",
    imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=85",
    isVeg: true,
    rating: 4.8,
  },
  {
    id: "dal-makhani",
    name: "Dal Makhani",
    category: "North Indian",
    price: 179,
    description: "Slow-cooked black lentils and kidney beans simmered overnight with butter and fresh cream.",
    imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=85",
    isVeg: true,
    rating: 4.8,
  },
  {
    id: "chole-bhature",
    name: "Amritsari Chole Bhature",
    category: "North Indian",
    price: 159,
    description: "Two puffed golden bhaturas served with spicy Punjabi chickpea curry, green chillies and pickled onions.",
    imageUrl: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=900&q=85",
    isVeg: true,
    rating: 4.8,
  },
  {
    id: "butter-naan",
    name: "Garlic Butter Naan",
    category: "North Indian",
    price: 59,
    description: "Fluffy tandoor-baked leavened flatbread brushed with fresh cultured butter, garlic and coriander.",
    imageUrl: "https://images.unsplash.com/photo-1606471191009-63994c53433b?auto=format&fit=crop&w=900&q=85",
    isVeg: true,
    rating: 4.7,
  },
  {
    id: "chicken-65",
    name: "Crispy Chicken 65",
    category: "Starters",
    price: 199,
    description: "Crunchy golden spiced chicken bites tossed with tempered curry leaves, garlic and green chillies.",
    imageUrl: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=900&q=85",
    isVeg: false,
    rating: 4.8,
  },
  {
    id: "paneer-tikka",
    name: "Tandoori Paneer Tikka",
    category: "Starters",
    price: 189,
    description: "Marinated cottage cheese and bell peppers char-grilled in a clay tandoor with spicy mint chutney.",
    imageUrl: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=85",
    isVeg: true,
    rating: 4.8,
  },
  {
    id: "samosa",
    name: "Punjabi Samosa (2 pcs)",
    category: "Starters",
    price: 49,
    description: "Crisp flaky pastry pockets filled with spiced potatoes and peas, served with sweet tamarind dip.",
    imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=85",
    isVeg: true,
    rating: 4.7,
  },
  {
    id: "masala-dosa",
    name: "Mysore Masala Dosa",
    category: "South Indian",
    price: 149,
    description: "Golden crispy crepe smeared with red chutney, filled with potato bhaji, served with hot sambar.",
    imageUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=85",
    isVeg: true,
    rating: 4.9,
  },
  {
    id: "idli",
    name: "Steamed Idli Sambar (4 pcs)",
    category: "South Indian",
    price: 99,
    description: "Four cloud-soft steamed fermented rice cakes accompanied by aromatic drumstick sambar and chutney.",
    imageUrl: "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=85",
    isVeg: true,
    rating: 4.6,
  },
  {
    id: "vada",
    name: "Crispy Medu Vada (2 pcs)",
    category: "South Indian",
    price: 79,
    description: "Crisp golden spiced lentil doughnuts with a fluffy centre, served with coconut chutney & sambar.",
    imageUrl: "https://th.bing.com/th/id/OIP.qtKdrkiaOc_W9AqqygVyaAHaHa?w=198&h=198&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3",
    isVeg: true,
    rating: 4.7,
  },
  {
    id: "veg-fried-rice",
    name: "Wok Veg Fried Rice",
    category: "Chinese",
    price: 179,
    description: "Wok-tossed basmati rice with crunchy fresh vegetables, spring onion and aromatic sauces.",
    imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=85",
    isVeg: true,
    rating: 4.6,
  },
  {
    id: "chicken-fried-rice",
    name: "Chicken Fried Rice",
    category: "Chinese",
    price: 219,
    description: "Smoky wok-fried rice with tender chicken chunks, scrambled egg, and scallions.",
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85",
    isVeg: false,
    rating: 4.7,
  },
  {
    id: "mango-lassi",
    name: "Alphonso Mango Lassi",
    category: "Beverages",
    price: 99,
    description: "Thick chilled curd churned with authentic Alphonso mango pulp and saffron essence.",
    imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=85",
    isVeg: true,
    rating: 4.8,
  },
  {
    id: "kullad-masala-chai",
    name: "Kullad Masala Chai",
    category: "Beverages",
    price: 49,
    description: "Aromatic Assam tea simmered with fresh crushed ginger, cardamom pods, cloves and whole milk.",
    imageUrl: "https://tse1.mm.bing.net/th/id/OIP.N2fDmxiehVkah77jbVx7egHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    isVeg: true,
    rating: 4.8,
  },
];

function ModernFoodApp() {
  const { data: remoteMenu } = useGetMenu();
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem("rasoi_jwt") || "");
  const [checkoutError, setCheckoutError] = useState("");
  const pendingOrder = useRef<{payload: string; key: string} | null>(null);
  const onAuth = (token: string) => { setAuthToken(token); if (token) sessionStorage.setItem("rasoi_jwt", token); else sessionStorage.removeItem("rasoi_jwt"); };

  const menu = useMemo(() => {
    if (Array.isArray(remoteMenu) && remoteMenu.length > 0) {
      return remoteMenu
        .filter((item) => item.id !== "gulab-jamun" && !item.name.toLowerCase().includes("gulab"))
        .map((item) => {
          const staticMatch = STATIC_MENU.find((s) => s.id === item.id);
          return {
            ...item,
            isVeg: staticMatch
              ? staticMatch.isVeg
              : item.category !== "Biryani" && item.id !== "chicken-65" && item.id !== "butter-chicken",
            rating: staticMatch ? staticMatch.rating : 4.8,
            imageUrl: staticMatch ? staticMatch.imageUrl : item.imageUrl,
          };
        });
    }
    return STATIC_MENU;
  }, [remoteMenu]);

  // Stage: 'menu' (item selection) -> 'billing' (dedicated rich billing hub) -> 'confirmed' (order confirmation & invoice)
  const [stage, setStage] = useState<"menu" | "billing" | "confirmed">("menu");

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [vegOnlyFilter, setVegOnlyFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Cart state: item ID -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [coupon, setCoupon] = useState("WELCOME50");

  // Modals & Final Placed Order State
  const [showDefenceModal, setShowDefenceModal] = useState(false);
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrderBill, setPlacedOrderBill] = useState<FinalCalculatedBill | null>(null);

  const categories = useMemo(() => ["All", ...Array.from(new Set(menu.map((m) => m.category)))], [menu]);

  const filteredDishes = useMemo(() => {
    return menu.filter((item) => {
      const matchCat = selectedCategory === "All" || item.category === selectedCategory;
      const matchVeg = !vegOnlyFilter || item.isVeg;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchVeg && matchSearch;
    });
  }, [menu, selectedCategory, vegOnlyFilter, searchQuery]);

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] ?? 0;
      const next = Math.min(99, Math.max(0, current + delta));
      const updated = { ...prev };
      if (next > 0) updated[id] = next;
      else delete updated[id];
      return updated;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  // Quick helper to load a sample feast
  const loadQuickFeast = () => {
    setCart({
      "chicken-biryani": 2,
      "paneer-butter-masala": 1,
      "butter-naan": 3,
      "mango-lassi": 2,
    });
  };

  const totalItemCount = useMemo(() => {
    return Object.values(cart).reduce((sum, q) => sum + q, 0);
  }, [cart]);

  // Running preview subtotal for the floating cart banner
  const runningSubtotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const dish = menu.find((item) => item.id === id);
      return sum + (dish ? Number(dish.price) * qty : 0);
    }, 0);
  }, [cart, menu]);

  // Transition to Billing Station
  const handleProceedToBilling = () => {
    if (totalItemCount === 0) return;
    setStage("billing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Return to Menu
  const handleBackToMenu = () => {
    setStage("menu");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle final order confirmation from BillingStation
  const handleConfirmOrder = async (finalBill: FinalCalculatedBill) => {
    if (!authToken) { setCheckoutError("Sign in or register before checkout."); return; }
    setIsPlacingOrder(true);
    setCheckoutError("");
    try {
      const payload = {
        items: Object.entries(cart).map(([itemId, quantity]) => ({ itemId, quantity })),
        coupon: finalBill.coupon || "", deliveryTier: finalBill.deliveryTier,
        ecoPackaging: finalBill.ecoPackaging, noCutlery: finalBill.noCutlery,
        riderTip: finalBill.riderTip, paymentMethod: finalBill.paymentMethod,
        customerName: finalBill.customerName, customerPhone: finalBill.customerPhone,
        customerAddress: finalBill.customerAddress, isCorporateGst: finalBill.isCorporateGst,
        companyName: finalBill.companyName, gstin: finalBill.gstin, expectedTotal: finalBill.grandTotal,
      };
      const serialized = JSON.stringify(payload);
      if (pendingOrder.current?.payload !== serialized) pendingOrder.current = {payload: serialized, key: crypto.randomUUID()};
      let saved = await commerceRequest("/orders", payload, authToken, {"Idempotency-Key": pendingOrder.current.key});
      if (saved.paymentMethod !== "COD" && saved.paymentStatus !== "PAID") {
        await payRazorpay(saved.orderId, authToken);
        saved = await commerceRequest(`/orders/${saved.orderId}/bill`, {}, authToken);
      }
      setPlacedOrderBill(saved);
      pendingOrder.current = null;
      setStage("confirmed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to complete checkout");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleResetApp = () => {
    setCart({});
    setCoupon("WELCOME50");
    setPlacedOrderBill(null);
    setStage("menu");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Convert placedOrderBill to saved demonstration receipt data
  const invoiceData: InvoiceData | null = useMemo(() => {
    if (!placedOrderBill) return null;
    const now = new Date(placedOrderBill.createdAt || Date.now());
    return {
      orderId: placedOrderBill.orderId,
      invoiceNumber: placedOrderBill.invoiceNumber || `INV-${placedOrderBill.orderId}`,
      paymentStatus: placedOrderBill.paymentStatus || "PENDING",
      invoiceDate: now.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      items: placedOrderBill.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
        hsnCode: "996331",
      })),
      subtotal: placedOrderBill.subtotal,
      discount: placedOrderBill.discount,
      discountLabel: placedOrderBill.discountLabel,
      deliveryFee: placedOrderBill.deliveryFee,
      deliveryLabel: placedOrderBill.deliveryLabel,
      packagingFee: placedOrderBill.packagingFee,
      platformFee: placedOrderBill.platformFee,
      riderTip: placedOrderBill.riderTip,
      charityRoundUp: placedOrderBill.charityRoundUp,
      coinsDiscount: placedOrderBill.coinsDiscount,
      paymentOfferDiscount: placedOrderBill.paymentOfferDiscount,
      paymentOfferLabel: placedOrderBill.paymentOfferLabel,
      taxableValue: placedOrderBill.taxableAmount,
      cgst: placedOrderBill.cgst,
      sgst: placedOrderBill.sgst,
      totalGst: placedOrderBill.gst,
      grandTotal: placedOrderBill.grandTotal,
      paymentMethod: placedOrderBill.paymentMethod,
      customerName: placedOrderBill.customerName,
      customerPhone: placedOrderBill.customerPhone,
      customerAddress: placedOrderBill.customerAddress,
      isCorporateGst: placedOrderBill.isCorporateGst,
      companyName: placedOrderBill.companyName,
      gstin: placedOrderBill.gstin,
    };
  }, [placedOrderBill]);

  return (
    <>
      {import.meta.env.VITE_DEMO_MODE === "true" && <div className="bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">Interactive preview — orders stay in this browser; online payments are simulated and no email is sent.</div>}
      <div className="sticky top-0 z-50 bg-white border-b px-4 py-2"><CommerceAccess token={authToken} onAuth={onAuth} />{checkoutError && <p role="alert" className="text-red-600">{checkoutError}</p>}</div>
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E2022] font-sans antialiased selection:bg-orange-100 pb-28">
      {/* 1. Global Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-8">
          {/* Brand Logo & Location */}
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => {
                if (stage !== "menu") setStage("menu");
              }}
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-md shadow-orange-500/20 text-xl font-bold">
                🍲
              </span>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-gray-900 block leading-tight">
                  Rasoi Route
                </span>
                <span className="text-[11px] font-semibold text-orange-600 block">
                  Authentic Indian Flavours
                </span>
              </div>
            </div>

            {/* Delivery Location Pill */}
            <div className="hidden md:flex items-center gap-2 rounded-full bg-gray-100/80 px-3.5 py-1.5 text-xs text-gray-700 font-medium">
              <MapPin size={14} className="text-orange-500" />
              <span>College demo • <strong>Enter your address at checkout</strong></span>
            </div>
          </div>

          {/* Right Controls: Stage navigation & cart summary */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDefenceModal(true)}
              className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/80 px-3.5 py-1.5 text-xs font-bold text-orange-800 hover:bg-orange-100 transition shadow-xs"
            >
              <Code2 size={14} className="text-orange-600" />
              <span className="hidden sm:inline">Project Defence &</span> Decomposition
            </button>

            {/* Cart Button */}
            {stage === "menu" ? (
              <button
                type="button"
                onClick={handleProceedToBilling}
                disabled={totalItemCount === 0}
                className="flex items-center gap-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-bold shadow-md shadow-orange-500/25 transition disabled:opacity-50"
              >
                <ShoppingBag size={14} />
                <span>{totalItemCount} Items</span>
                {totalItemCount > 0 && (
                  <>
                    <span className="opacity-80">|</span>
                    <span>{money(runningSubtotal)}</span>
                  </>
                )}
              </button>
            ) : stage === "billing" ? (
              <button
                type="button"
                onClick={handleBackToMenu}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-100 px-3.5 py-1.5 text-xs font-bold text-gray-700 transition"
              >
                <ArrowLeft size={13} />
                <span>Back to Menu</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetApp}
                className="flex items-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs"
              >
                <RotateCcw size={13} />
                <span>New Order</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 2. Top Banner Header (Decomposition & Abstraction Context) */}
      <header className="mx-auto max-w-7xl px-4 sm:px-8 pt-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-6 sm:p-7 text-white shadow-lg">
          <div className="relative z-10 max-w-3xl space-y-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <ShieldCheck size={14} /> Computational Thinking & Dedicated Billing Engine
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Indian Food-Delivery Order & Billing System
            </h1>

            <p className="text-xs sm:text-sm text-orange-50/95 leading-relaxed font-normal bg-black/15 p-3.5 rounded-2xl border border-white/10 backdrop-blur-xs">
              &ldquo;An Indian food-delivery application needs to process an order containing multiple food items,
              calculate the subtotal, apply discounts, calculate delivery charges and taxes, and finally generate the bill.
              Apply decomposition and abstraction to this problem.&rdquo;
            </p>

            {/* Stepper Progress Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-orange-100">
              <span className={`rounded-lg px-2.5 py-1 font-mono ${stage === "menu" ? "bg-white/30 text-white font-bold" : "bg-white/15"}`}>
                1. Select Items
              </span>
              <span>&rarr;</span>
              <span className={`rounded-lg px-2.5 py-1 font-mono ${stage === "billing" ? "bg-white/30 text-white font-bold" : "bg-white/15"}`}>
                2. Dedicated Billing Station
              </span>
              <span>&rarr;</span>
              <span className={`rounded-lg px-2.5 py-1 font-mono ${stage === "confirmed" ? "bg-white/30 text-white font-bold" : "bg-white/15"}`}>
                3. Order & GST Tax Invoice
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Main Stage Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-8">
        {/* STAGE 1: MENU & CART SELECTION */}
        {stage === "menu" && (
          <div className="space-y-6">
            {/* Filter Bar & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition shadow-xs ${
                      selectedCategory === cat
                        ? "bg-gray-900 text-white"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Veg Toggle & Search */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVegOnlyFilter((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold border transition ${
                    vegOnlyFilter
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-gray-700 border-gray-300 hover:border-emerald-500"
                  }`}
                >
                  <span className={`size-2 rounded-full ${vegOnlyFilter ? "bg-white" : "bg-emerald-600"}`} />
                  <span>Veg Only</span>
                </button>

                {totalItemCount === 0 && (
                  <button
                    type="button"
                    onClick={loadQuickFeast}
                    className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3.5 py-2 rounded-full border border-orange-200 transition shadow-xs shrink-0"
                  >
                    <Sparkles size={13} /> Load Sample Feast
                  </button>
                )}
              </div>
            </div>

            {/* Menu Grid (Full Width, 3-Columns on Large screens) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDishes.map((dish) => {
                const qty = cart[dish.id] ?? 0;
                return (
                  <div
                    key={dish.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-xs transition hover:shadow-md hover:border-orange-300"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gray-100">
                        <FoodImage src={dish.imageUrl} name={dish.name} />
                        {/* Veg/Non-Veg Badge */}
                        <div className="absolute top-2.5 left-2.5 rounded-md bg-white/95 px-1.5 py-0.5 shadow-xs flex items-center gap-1">
                          <span
                            className={`size-2.5 rounded-full ${
                              dish.isVeg ? "bg-emerald-600" : "bg-red-600"
                            }`}
                          />
                          <span className="text-[10px] font-bold text-gray-700">
                            {dish.isVeg ? "VEG" : "NON-VEG"}
                          </span>
                        </div>

                        <div className="absolute top-2.5 right-2.5 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-bold text-gray-800 shadow-xs">
                          ★ {dish.rating}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-extrabold text-base text-gray-900 group-hover:text-orange-600 transition">
                            {dish.name}
                          </h3>
                          <span className="font-mono font-bold text-base text-gray-900 shrink-0">
                            {money(Number(dish.price))}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {dish.description}
                        </p>
                      </div>
                    </div>

                    {/* Add/Quantity Button Bar */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        {dish.category}
                      </span>

                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateQuantity(dish.id, 1)}
                          className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-extrabold text-orange-600 hover:bg-orange-500 hover:text-white transition shadow-xs"
                        >
                          <Plus size={14} /> ADD
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 rounded-full border border-orange-500 bg-white px-2 py-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(dish.id, -1)}
                            className="size-6 rounded-full flex items-center justify-center text-orange-600 hover:bg-orange-100 transition"
                            aria-label={`Decrease ${dish.name}`}
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-5 text-center font-mono font-bold text-xs text-orange-950">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(dish.id, 1)}
                            className="size-6 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition"
                            aria-label={`Increase ${dish.name}`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty Menu State */}
            {filteredDishes.length === 0 && (
              <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center space-y-3">
                <span className="grid size-14 place-items-center rounded-2xl bg-orange-50 text-orange-500 text-2xl mx-auto">
                  🔍
                </span>
                <h3 className="font-extrabold text-lg text-gray-900">No dishes match your filter</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Try switching categories or disabling the vegetarian filter to see our full authentic selection.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("All");
                    setVegOnlyFilter(false);
                  }}
                  className="rounded-full bg-gray-900 text-white px-4 py-2 text-xs font-bold hover:bg-gray-800 transition"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* STAGE 2: DEDICATED BILLING STATION & HUB */}
        {stage === "billing" && (
          <BillingStation
            cart={cart}
            menu={menu}
            coupon={coupon}
            onUpdateQuantity={updateQuantity}
            onClearCart={clearCart}
            onApplyCoupon={(c) => setCoupon(c)}
            onBackToMenu={handleBackToMenu}
            onConfirmOrder={handleConfirmOrder}
            isSubmitting={isPlacingOrder}
          />
        )}

        {/* STAGE 3: ORDER CONFIRMED & TAX INVOICE */}
        {stage === "confirmed" && placedOrderBill && (
          <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-6 sm:p-10 shadow-xl text-center space-y-6">
            <div className="inline-grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 text-4xl shadow-inner mx-auto animate-bounce">
              🎉
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <CheckCircle2 size={15} /> Order Confirmed — {placedOrderBill.paymentStatus === "PAID" ? "Paid" : "Payment due at delivery"}
              </span>
              <h2 className="mt-3 text-3xl font-black text-gray-900 tracking-tight">
                Your order has been recorded!
              </h2>
              <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                Thank you{placedOrderBill.customerName ? `, ${placedOrderBill.customerName}` : ""}! This college demonstration records orders; it does not dispatch meals or riders.
              </p>
            </div>

            {/* Live Status Tracker Bar */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-5 text-left">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Demonstration Order Flow
                </p>
                <span className="text-xs font-mono font-bold text-orange-600">
                  No live dispatch connected
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="space-y-1">
                  <div className="size-8 mx-auto rounded-full bg-emerald-600 text-white grid place-items-center font-bold">
                    ✓
                  </div>
                  <p className="font-bold text-gray-900">Order Placed</p>
                  <p className="text-[11px] text-gray-500 font-mono">{placedOrderBill.orderId}</p>
                </div>
                <div className="space-y-1">
                  <div className="size-8 mx-auto rounded-full bg-orange-500 text-white grid place-items-center font-bold animate-pulse">
                    🍳
                  </div>
                  <p className="font-bold text-gray-900">In Kitchen</p>
                  <p className="text-[11px] text-gray-500">Demo step</p>
                </div>
                <div className="space-y-1">
                  <div className="size-8 mx-auto rounded-full bg-gray-200 text-gray-400 grid place-items-center font-bold">
                    🛵
                  </div>
                  <p className="font-medium text-gray-500">Rider Dispatched</p>
                  <p className="text-[11px] text-gray-400">Not connected</p>
                </div>
              </div>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-2xl border border-gray-200 p-5 text-left space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-gray-100">
                <span className="font-bold uppercase tracking-wider text-gray-500 text-[10px]">Order ID</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{placedOrderBill.orderId}</span>
              </div>

              <div className="space-y-1.5 divide-y divide-gray-100">
                {placedOrderBill.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between pt-1.5 first:pt-0">
                    <span className="text-gray-700">{item.name} &times; {item.quantity}</span>
                    <span className="font-mono font-semibold">{money(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-200 space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{money(placedOrderBill.subtotal)}</span>
                </div>
                {placedOrderBill.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount ({placedOrderBill.discountLabel}):</span>
                    <span className="font-mono">−{money(placedOrderBill.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Delivery ({placedOrderBill.deliveryLabel}):</span>
                  <span className="font-mono">{placedOrderBill.deliveryFee ? money(placedOrderBill.deliveryFee) : "FREE"}</span>
                </div>
                {placedOrderBill.packagingFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Eco Packaging:</span>
                    <span className="font-mono">{money(placedOrderBill.packagingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600"><span>Platform Fee:</span><span className="font-mono">{money(placedOrderBill.platformFee)}</span></div>
                {placedOrderBill.riderTip > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Rider Tip:</span>
                    <span className="font-mono">{money(placedOrderBill.riderTip)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>GST (5% Composite):</span>
                  <span className="font-mono">{money(placedOrderBill.gst)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-900 text-sm font-extrabold text-gray-900">
                  <span>Total {placedOrderBill.paymentStatus === "PAID" ? "Paid" : "Due"} ({placedOrderBill.paymentMethod}):</span>
                  <span className="font-mono text-base text-orange-600">{money(placedOrderBill.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowTaxInvoiceModal(true)}
                className="rounded-2xl px-6 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-900 font-bold"
              >
                <FileText size={15} /> View Official GST Tax Invoice
              </Button>
              <Button
                onClick={handleResetApp}
                className="rounded-2xl bg-gray-900 hover:bg-gray-800 text-white px-6 font-bold"
              >
                <RotateCcw size={15} /> Order Again
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* 4. Sticky Floating Cart Drawer Bar (Active on Menu Stage when items > 0) */}
      {stage === "menu" && totalItemCount > 0 && (
        <aside aria-label="Order summary bar" className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl p-3 sm:p-4 animate-slide-up">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 px-2 sm:px-6">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20">
                  <ShoppingBag size={18} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-gray-900">
                      {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"} in Cart
                    </span>
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      Ready for Billing
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-orange-600">
                    Subtotal: {money(runningSubtotal)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-gray-400 hover:text-red-500 font-semibold sm:hidden"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={clearCart}
                className="hidden sm:inline-flex text-xs text-gray-400 hover:text-red-500 font-semibold items-center gap-1"
              >
                <Trash2 size={13} /> Clear
              </button>

              <button
                type="button"
                onClick={handleProceedToBilling}
                className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Proceed to Billing System</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 5. Official GST Tax Invoice Modal */}
      {showTaxInvoiceModal && invoiceData && (
        <TaxInvoiceModal
          isOpen={showTaxInvoiceModal}
          onClose={() => setShowTaxInvoiceModal(false)}
          invoice={invoiceData}
        />
      )}

      {/* 6. Computational Thinking & Decomposition Modal */}
      {showDefenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowDefenceModal(false)}
              className="absolute top-5 right-5 size-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
              <Code2 size={16} />
              <span>Project Defence Framework</span>
            </div>

            <h3 className="mt-1 text-2xl font-black text-gray-900">
              Decomposition & Abstraction Applied
            </h3>

            <div className="mt-4 space-y-4 text-xs text-gray-700 max-h-[70vh] overflow-y-auto pr-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                <p className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                  <Layers size={15} className="text-orange-600" />
                  1. Problem Decomposition (6 Sub-Problems)
                </p>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed font-medium">
                  <li><strong>Multiple Food Items Resolution:</strong> Resolves dish IDs from menu dictionary in O(1) time.</li>
                  <li><strong>Subtotal Calculation:</strong> Evaluates &Sigma;(price &times; quantity) in linear O(n) time using Decimal arithmetic.</li>
                  <li><strong>Apply Discounts:</strong> Strategy pattern compares Tiered rules (10-20%) vs Coupons (`WELCOME50`, `SAVE10`, `FESTIVE20`, `FIRSTBITE`, `STUDENT15`).</li>
                  <li><strong>Delivery Charges:</strong> Order value bands + speed tiers (Standard, Priority +₹25, Eco -₹10).</li>
                  <li><strong>Calculate Taxes:</strong> Pure function applying 5% Indian composite GST (2.5% CGST + 2.5% SGST).</li>
                  <li><strong>Generate Final Bill & Invoice:</strong> Uses the saved server Bill object and saved demonstration receipt.</li>
                </ol>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                <p className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-orange-600" />
                  2. Abstraction Applied
                </p>
                <ul className="list-disc list-inside space-y-1.5 leading-relaxed font-medium">
                  <li><strong>Data Abstraction:</strong> Domain models `FoodItem`, `OrderInput`, `BillLine`, and `Bill` encapsulate data representation.</li>
                  <li><strong>Algorithmic Abstraction:</strong> The backend `BillingService` abstract distinct mathematical algorithms behind uniform interfaces.</li>
                  <li><strong>Boundary Abstraction:</strong> Client only selects food items; authoritative financial arithmetic is completely abstracted inside the backend.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Run the included test suite to verify billing behavior.</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
              <Button onClick={() => setShowDefenceModal(false)} className="rounded-xl px-5 bg-gray-900 text-white text-xs">
                Close & Return to App
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}