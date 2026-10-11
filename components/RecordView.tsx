"use client";

import { useEffect } from "react";
import { recordProductView, type RecentProduct } from "./RecentlyViewed";

/** Records this product page view into localStorage for "Recently viewed". */
export default function RecordView({ product }: { product: RecentProduct }) {
  useEffect(() => {
    recordProductView(product);
  }, [product]);
  return null;
}
