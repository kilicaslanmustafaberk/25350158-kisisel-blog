"use client";

import { useEffect } from "react";
import { animate, createScope, onScroll, stagger } from "animejs";

export function PageMotion({ landing = false }: { landing?: boolean }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("#main-content");
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      root.dataset.motion = "reduced";
      return () => delete root.dataset.motion;
    }

    root.dataset.motion = "ready";
    const scope = createScope({ root }).add(() => {
      if (landing) {
        animate("[data-hero-reveal]", {
          opacity: [0, 1],
          y: [18, 0],
          duration: 620,
          delay: stagger(75),
          ease: "out(3)",
        });

        const timelineLine = root.querySelector<HTMLElement>("[data-timeline-line]");
        if (timelineLine) {
          animate(timelineLine, {
            scaleY: [0, 1],
            ease: "linear",
            autoplay: onScroll({ target: timelineLine.parentElement ?? timelineLine, enter: "top bottom-=15%", leave: "bottom top+=20%", sync: true }),
          });
        }
      }

      const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          observer.unobserve(target);
          animate(target, { opacity: [0, 1], y: [20, 0], duration: 540, ease: "out(3)" });
        }
      }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
      targets.forEach((target) => observer.observe(target));
      return () => observer.disconnect();
    });

    return () => {
      scope.revert();
      delete root.dataset.motion;
    };
  }, [landing]);

  return null;
}
