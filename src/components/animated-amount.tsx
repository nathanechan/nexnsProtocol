"use client";
import { useEffect, useRef, useState } from "react";
import { compactMarketNumber, marketPrice } from "../product/market-format";
export function AnimatedAmount({
  value,
  currency = false,
  price = false,
}: {
  value: number;
  currency?: boolean;
  price?: boolean;
}) {
  const [display, setDisplay] = useState(value);
  const [direction, setDirection] = useState("");
  const previous = useRef(value);
  useEffect(() => {
    const startValue = previous.current;
    previous.current = value;
    if (startValue === value) return;
    setDirection(value > startValue ? "tick-up" : "tick-down");
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 240);
      setDisplay(startValue + (value - startValue) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  const format = (n: number) =>
    price ? marketPrice(n) : compactMarketNumber(n, currency);
  return (
    <span
      key={value}
      className={`amount-tick ${direction}`}
      aria-label={format(value)}
      data-value={value}
    >
      <span aria-hidden>{format(display)}</span>
    </span>
  );
}
