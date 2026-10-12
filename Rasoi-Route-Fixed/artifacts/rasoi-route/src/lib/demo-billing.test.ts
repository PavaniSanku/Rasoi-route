import {describe, expect, it} from 'vitest';
import {demoBill} from './demo-billing';
describe('checkout accounting', () => {
  it('includes fees, taxes and tip with exact payment total', () => {
    const bill=demoBill({items:[{itemId:'chicken-biryani',quantity:2}],coupon:'WELCOME50',deliveryTier:'priority',ecoPackaging:true,riderTip:30,paymentMethod:'COD'},'ORD-TEST','2026-10-12T00:00:00Z');
    expect(bill).toMatchObject({subtotal:498,discount:50,deliveryFee:55,packagingFee:15,platformFee:5,cgst:13.08,sgst:13.08,gst:26.16,grandTotal:579.16,paymentStatus:'DUE',invoiceNumber:'INV-TEST'});
  });
  it('handles every advertised coupon, threshold and eco delivery', () => {
    const input={items:[{itemId:'chicken-biryani',quantity:4}],deliveryTier:'eco',ecoPackaging:false,riderTip:0,paymentMethod:'CARD'};
    for(const [coupon,discount] of [['WELCOME50',50],['SAVE10',99.6],['FESTIVE20',199.2],['FIRSTBITE',75],['STUDENT15',149.4]] as const) {
      const bill=demoBill({...input,coupon},'ORD-TEST','2026-10-12');expect(bill.discount).toBe(discount);expect(bill.deliveryFee).toBe(10);expect(bill.coinsDiscount).toBe(0);expect(bill.paymentOfferDiscount).toBe(0);expect(bill.paymentStatus).toBe('PENDING');
    }
  });
  it('caps welcome discount and rejects fractional quantities', () => {
    const bill=demoBill({items:[{itemId:'butter-naan',quantity:1}],coupon:'WELCOME50'},'ORD-TEST','2026-10-12');expect(bill.discount).toBeLessThanOrEqual(bill.subtotal);
    expect(()=>demoBill({items:[{itemId:'butter-naan',quantity:1.5}]},'ORD-TEST','2026-10-12')).toThrow();
  });
});
