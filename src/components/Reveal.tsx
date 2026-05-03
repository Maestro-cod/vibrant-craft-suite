import {
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
  type ElementType,
  type Ref,
} from "react";

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && el.classList.add("in"), {
      threshold: 0.12,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const style: CSSProperties = { transitionDelay: `${delay}ms` };
  return (
    <As ref={ref as Ref<HTMLElement>} className={`reveal ${className}`} style={style}>
      {children}
    </As>
  );
}
