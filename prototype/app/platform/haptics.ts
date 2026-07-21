export type HapticKind = "selection" | "impact" | "success";

export type HapticsAdapter = {
  trigger: (kind: HapticKind) => void;
};

const vibrationPatterns: Record<HapticKind, number | number[]> = {
  selection: 6,
  impact: 14,
  success: [12, 36, 18],
};

const browserHaptics: HapticsAdapter = {
  trigger(kind) {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    navigator.vibrate(vibrationPatterns[kind]);
  },
};

let activeAdapter = browserHaptics;

export function setHapticsAdapter(adapter: HapticsAdapter) {
  activeAdapter = adapter;
}

export function triggerHaptic(kind: HapticKind) {
  activeAdapter.trigger(kind);
}
