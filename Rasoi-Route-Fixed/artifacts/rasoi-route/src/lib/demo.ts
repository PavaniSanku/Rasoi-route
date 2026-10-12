import menu from './menu.json';
import { demoBill } from './demo-billing';
/** Explicit preview-only API. The production bundle never enables this interceptor. */
export function installDemo() {
  sessionStorage.removeItem("rasoi_jwt");
  const original = window.fetch.bind(window);
  const orders = new Map<string, any>();
  const retryKeys = new Map<string, string>();
  const accounts = new Map<string, {name: string; password: string; id: string}>();
  const sessions = new Map<string, string>();
  window.fetch = async (request, init) => {
    const url = new URL(typeof request === 'string' ? request : request instanceof URL ? request.href : request.url, window.location.origin);
    if (!url.pathname.startsWith('/api/')) return original(request, init);
    const path = url.pathname.slice(4);
    const headers = new Headers(init?.headers);
    const token = (headers.get('Authorization') || '').replace(/^Bearer /, '');
    const user = sessions.get(token);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const response = (value: any, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}});
    try {
      if (path === '/menu') return response(menu);
      if (path === '/health') return response({status: 'ok', mode: 'preview'});
      if (path === '/auth/register') {
        if (!body.email?.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/) || !body.name?.trim() || body.password?.length < 8) return response({detail: 'Enter name, email and an 8-character password'}, 422);
        if (accounts.has(body.email.toLowerCase())) return response({detail: 'Email already registered'}, 409);
        accounts.set(body.email.toLowerCase(), {name: body.name, password: body.password, id: crypto.randomUUID()});
      }
      if (path === '/auth/register' || path === '/auth/login') {
        const account = accounts.get(body.email?.toLowerCase());
        if (!account || account.password !== body.password) return response({detail: 'Invalid preview account. Create an account first; accounts reset on page reload.'}, 401);
        const token = crypto.randomUUID(); sessions.set(token, account.id);
        return response({access_token: token, user: {id: account.id, name: account.name, email: body.email}});
      }
      if (path === '/orders/calculate') return response(demoBill(body, 'ORD-PREVIEW', new Date().toISOString()));
      if (!user) return response({detail: 'Preview session expired. Sign out and create a preview account.'}, 401);
      if (path === '/orders') {
        const key = headers.get('Idempotency-Key') || crypto.randomUUID();
        const prior = retryKeys.get(`${user}:${key}`);
        if (prior) return response(orders.get(prior).bill);
        const id = `ORD-${crypto.randomUUID().toUpperCase()}`;
        const bill = demoBill(body, id, new Date().toISOString());
        if (Math.abs(bill.grandTotal - body.expectedTotal) > .001) return response({detail: 'Bill mismatch. Review the checkout total.'}, 409);
        orders.set(id, {user, bill}); retryKeys.set(`${user}:${key}`, id);
        return response(bill, 201);
      }
      if (path === '/demo/pay') {
        const order = orders.get(body.order_id);
        if (!order || order.user !== user) return response({detail: 'Order not found'}, 404);
        order.bill.paymentStatus = 'PAID'; return response({status: 'PAID'});
      }
      const match = path.match(/^\/orders\/([^/]+)\/bill$/);
      if (match) {
        const order = orders.get(match[1]);
        return order?.user === user ? response(order.bill) : response({detail: 'Order not found'}, 404);
      }
      return response({detail: 'This endpoint is unavailable in the preview'}, 404);
    } catch (error) { return response({detail: error instanceof Error ? error.message : 'Preview request failed'}, 422); }
  };
}
