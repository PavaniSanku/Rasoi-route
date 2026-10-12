import menu from './menu.json';
export function demoBill(input: any, orderId: string, createdAt: string) {
  const cents = (value: number) => Math.round(value * 100);
  const rupees = (value: number) => value / 100;
  const items = input.items.map((line: any) => {
    const food = menu.find(food => food.id === line.itemId);
    if (!food || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new Error('Invalid menu item or quantity');
    return {id: food.id, itemId: food.id, name: food.name, quantity: line.quantity, unitPrice: Number(food.price), total: rupees(cents(Number(food.price)) * line.quantity)};
  });
  const subtotal = cents(items.reduce((sum: number, item: any) => sum + item.total, 0));
  const coupon = (input.coupon || '').trim().toUpperCase();
  const rules: Record<string, {min: number; discount: number; label: string}> = {
    WELCOME50: {min: 0, discount: 5000, label: 'Welcome First Order'},
    SAVE10: {min: 30000, discount: Math.round(subtotal * .1), label: 'Save Big 10%'},
    FESTIVE20: {min: 80000, discount: Math.round(subtotal * .2), label: 'Festive Feast 20%'},
    FIRSTBITE: {min: 40000, discount: 7500, label: 'First Bite Delights'},
    STUDENT15: {min: 35000, discount: Math.round(subtotal * .15), label: 'Campus Special 15%'},
  };
  if (coupon && !rules[coupon]) throw new Error('Invalid coupon');
  let discount = coupon && subtotal >= rules[coupon].min ? Math.min(rules[coupon].discount, subtotal) : 0;
  let discountLabel = discount ? `${coupon} (${rules[coupon].label})` : 'No discount';
  if (!discount) {
    const rate = subtotal >= 150000 ? .2 : subtotal >= 100000 ? .15 : subtotal >= 50000 ? .1 : 0;
    discount = Math.round(subtotal * rate);
    if (discount) discountLabel = `${Math.round(rate * 100)}% Order Discount`;
  }
  const deliveryTier = input.deliveryTier || 'standard';
  let delivery = subtotal >= 100000 ? 0 : subtotal >= 60000 ? 2000 : subtotal >= 30000 ? 3000 : 4000;
  if (deliveryTier === 'priority') delivery += 2500;
  if (deliveryTier === 'eco') delivery = Math.max(0, delivery - 1000);
  const packaging = input.ecoPackaging === false ? 0 : 1500;
  const platform = 500;
  const tip = cents(input.riderTip ?? 30);
  const taxable = subtotal - discount + delivery + packaging + platform;
  const halfTax = Math.round(taxable * .025);
  const total = taxable + 2 * halfTax + tip;
  const paymentMethod = input.paymentMethod || 'COD';
  return {...input, orderId, createdAt, invoiceNumber: `INV-${orderId.slice(4)}`, items,
    subtotal: rupees(subtotal), discount: rupees(discount), discountLabel,
    deliveryTier, deliveryFee: rupees(delivery), delivery: rupees(delivery), deliveryLabel: `${deliveryTier} delivery`,
    packagingFee: rupees(packaging), platformFee: rupees(platform), riderTip: rupees(tip),
    coinsDiscount: 0, paymentOfferDiscount: 0, paymentOfferLabel: '', charityRoundUp: 0,
    taxableAmount: rupees(taxable), cgst: rupees(halfTax), sgst: rupees(halfTax), gst: rupees(2 * halfTax),
    total: rupees(total), grandTotal: rupees(total), paymentMethod, paymentStatus: paymentMethod === 'COD' ? 'DUE' : 'PENDING'};
}
