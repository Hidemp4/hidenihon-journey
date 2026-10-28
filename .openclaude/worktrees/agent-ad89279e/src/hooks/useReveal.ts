import { useReducedMotion, type MotionProps } from "framer-motion";

export type Reveal = (duration?: number, delay?: number) => MotionProps;

export function useReveal(): Reveal {
  const reduce = useReducedMotion();

  return (duration = 0.6, delay = 0) => ({
    ...(reduce
      ? {}
      : {
          initial: { opacity: 0, y: 28 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
        }),
    transition: { duration, delay: reduce ? 0 : delay },
  });
}