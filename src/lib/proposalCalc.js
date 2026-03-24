/**
 * Shared calculation engine for Proposals.
 * All amounts are VAT-exclusive (KDV hariç).
 * Used by: ProposalItemsEditor, ProposalDetailPage, ProposalPdf, ProposalLivePreview.
 */

/**
 * Calculate a single line item total.
 * @param {number} quantity
 * @param {number} unitPrice
 * @returns {number}
 */
export function calcItemLineTotal(quantity, unitPrice) {
  return (Number(quantity) || 0) * (Number(unitPrice) || 0);
}

/**
 * Calculate proposal totals from items and discount.
 * @param {Array<{quantity: number, unit_price?: number, unit_price_usd?: number, line_total?: number, total_usd?: number, cost?: number, cost_usd?: number}>} items
 * @param {number} [discountPercent=0]
 * @returns {{ subtotal: number, discountAmount: number, grandTotal: number }}
 */
export function calcProposalTotals(items = [], discountPercent = 0) {
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = Number(item.line_total) ||
      Number(item.total_usd) ||
      calcItemLineTotal(item.quantity, item.unit_price ?? item.unit_price_usd);
    return sum + lineTotal;
  }, 0);

  const pct = Math.min(Math.max(Number(discountPercent) || 0, 0), 100);
  const discountAmount = Math.round((subtotal * pct / 100) * 100) / 100;
  const grandTotal = subtotal - discountAmount;

  return { subtotal, discountAmount, grandTotal };
}

/**
 * Calculate total internal costs from items.
 * @param {Array<{quantity: number, cost?: number, cost_usd?: number, product_cost?: number, labor_cost?: number, shipping_cost?: number, material_cost?: number, misc_cost?: number}>} items
 * @returns {number}
 */
export function calcTotalCosts(items = []) {
  return items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const cost = Number(item.cost ?? item.cost_usd);
    if (!isNaN(cost) && cost > 0) return sum + cost * qty;

    const breakdown =
      (Number(item.product_cost) || 0) +
      (Number(item.labor_cost) || 0) +
      (Number(item.shipping_cost) || 0) +
      (Number(item.material_cost) || 0) +
      (Number(item.misc_cost) || 0);
    return sum + breakdown * qty;
  }, 0);
}
