import { useState } from "react";
const API = import.meta.env.VITE_API_URL || "";
export async function commerceRequest(path: string, body: object, token?: string, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(`${API}/api${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...extraHeaders, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({detail: "The API is unavailable. Check the backend connection."}));
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Request failed");
  return data;
}
export function CommerceAccess({ token, onAuth }: { token: string; onAuth: (token: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (token) return <div className="flex gap-3 items-center text-sm">✓ {import.meta.env.VITE_DEMO_MODE === "true" ? "Signed in to preview" : "Signed in"} <button className="underline" onClick={() => onAuth("")}>Sign out</button></div>;
  return <form className="flex flex-wrap items-center gap-2 p-3 border rounded-lg bg-white" onSubmit={async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { const result = await commerceRequest(`/auth/${mode}`, { name, email, password }); onAuth(result.access_token); }
    catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
    finally { setBusy(false); }
  }}>
    <strong className="text-sm">{mode === "login" ? "Sign in to order" : "Create account"}</strong>
    {mode === "register" && <input className="border rounded p-2" aria-label="Name" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />}
    <input className="border rounded p-2" aria-label="Email" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
    <input className="border rounded p-2" aria-label="Password" type="password" minLength={8} maxLength={72} placeholder="Password (8+ chars)" value={password} onChange={e => setPassword(e.target.value)} required />
    <button disabled={busy} className="bg-orange-600 text-white rounded p-2" type="submit">{busy ? "Please wait" : mode === "login" ? "Sign in" : "Register"}</button>
    <button type="button" className="underline text-sm" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create account" : "Already registered?"}</button>
    {error && <p role="alert" className="text-red-600 w-full">{error}</p>}
  </form>;
}
export async function payRazorpay(orderId: string, token: string): Promise<void> {
  if (import.meta.env.VITE_DEMO_MODE === "true") { await commerceRequest("/demo/pay", {order_id: orderId}, token); return; }
  const order = await commerceRequest("/payments/create", { order_id: orderId }, token);
  if (!(window as any).Razorpay) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js";
      const timeout = window.setTimeout(() => {script.remove(); reject(new Error("Razorpay checkout timed out. Check your connection and retry."));}, 15000);
      script.onload = () => {window.clearTimeout(timeout); resolve();}; script.onerror = () => {window.clearTimeout(timeout); script.remove(); reject(new Error("Razorpay checkout failed to load"));}; document.body.appendChild(script);
    });
  }
  await new Promise<void>((resolve, reject) => {
    const checkout = new (window as any).Razorpay({
      key: order.key_id, amount: order.amount, currency: "INR", order_id: order.razorpay_order_id, name: "Rasoi Route",
      handler: async (response: any) => { try { await commerceRequest("/payments/verify", response, token); resolve(); } catch (err) { reject(err); } },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    checkout.on("payment.failed", (r: any) => reject(new Error(r.error?.description || "Payment failed")));
    checkout.open();
  });
}
