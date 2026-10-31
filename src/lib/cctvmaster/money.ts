// Catalogue prices are stored ex-VAT, as the source does; the shop shows them with 20% UK VAT.
export const VAT_RATE = 0.2;
// Fallbacks only, for when the "delivery" setting is missing (see src/lib/orders/pricing.ts and src/lib/settings).
// Delivery messages on the shop read the owner's values from Settings.
export const DELIVERY_FEE = 5.99;
export const FREE_DELIVERY_FROM = 100;

export const withVat = (exVat: number) => Math.round(exVat * (1 + VAT_RATE) * 100) / 100;

export const splitPrice = (amount: number) => {
  const [pounds, pence] = amount.toFixed(2).split(".");
  return { pounds: Number(pounds).toLocaleString("en-GB"), pence };
};

export const formatGBP = (amount: number) =>
  `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
