"use client";

import { useSyncExternalStore } from "react";

// The pre-paint script in layout.tsx sets data-motion="off" from storage; this switch keeps it in sync.
const EVENT = "motionchange";
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const motionOn = () => document.documentElement.dataset.motion !== "off";

/** True unless the visitor switched decorative motion off. For use in client components. */
export function useMotionOn() {
  return useSyncExternalStore(subscribe, motionOn, () => true);
}

export function MotionSwitch() {
  const on = useMotionOn();

  function toggle() {
    const next = on ? "off" : "on";
    if (next === "off") document.documentElement.dataset.motion = "off";
    else delete document.documentElement.dataset.motion;
    try {
      localStorage.setItem("motion", next);
    } catch {
      // Storage can be unavailable (private mode); the switch still works for this page view.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-full px-1.5 pl-2.5 text-sm"
    >
      {/* Visually hidden on very narrow screens so the site name fits; still the switch's accessible name. */}
      <span className="max-[374px]:sr-only">Motion</span>
      <span
        aria-hidden="true"
        className={`relative h-[31px] w-[51px] rounded-full transition-colors duration-250 ${on ? "bg-ok" : "bg-border-strong"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow-md transition-transform duration-300 ease-(--spring) ${
            on ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}
