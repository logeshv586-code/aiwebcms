import { useEffect } from 'react';
import Lenis from 'lenis';

const REVEAL_SELECTOR = [
  '[data-reveal]',
  '.dynamic-home-section',
  '.page-title',
  '.shop-toolbar',
  '.product-card',
  '.category-card',
  '.collection-card',
  '.trust-card',
  '.blog-card',
  '.content-banner',
  '.detail-layout',
  '.cart-layout',
  '.checkout-layout',
  '.account-shell',
  '.form-card',
  '.faq-list > details'
].join(',');

export default function usePremiumMotion(rootRef, options = {}) {
  const { enabled = true, smoothScroll = true } = options;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!enabled || reducedMotion) {
      root.classList.add('premium-motion-off');
      root.querySelectorAll(REVEAL_SELECTOR).forEach((node) => node.classList.add('is-visible'));
      return () => root.classList.remove('premium-motion-off');
    }

    root.classList.remove('premium-motion-off');
    let lenis = null;
    let frame = 0;

    if (smoothScroll) {
      lenis = new Lenis({
        duration: 1.05,
        lerp: 0.095,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.92,
        touchMultiplier: 1.05,
        anchors: true
      });
      const raf = (time) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    }

    const seen = new WeakSet();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    const register = (scope) => {
      if (!(scope instanceof Element)) return;
      const nodes = scope.matches?.(REVEAL_SELECTOR)
        ? [scope, ...scope.querySelectorAll(REVEAL_SELECTOR)]
        : [...scope.querySelectorAll(REVEAL_SELECTOR)];
      nodes.forEach((node, index) => {
        if (seen.has(node)) return;
        seen.add(node);
        node.classList.add('premium-reveal');
        node.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 45}ms`);
        observer.observe(node);
      });
    };

    register(root);
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => register(node)));
    });
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, [rootRef, enabled, smoothScroll]);
}
