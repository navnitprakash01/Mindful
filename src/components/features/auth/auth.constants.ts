export const WELLNESS_QUOTES = [
  "Healing begins with noticing.",
  "Small reflections become lasting change.",
  "Your mind is a sanctuary, treat it with care.",
  "Breathe in calm, exhale doubt.",
  "The present moment is your safest space."
];

export const TRANSITIONS = {
  FADE: { duration: 0.35, ease: "easeOut" },
  SLIDE: { duration: 0.40, ease: [0.16, 1, 0.3, 1] }, // Apple-like custom ease
  SPRING: { type: "spring", stiffness: 400, damping: 30 }, // Snappy interactions
  STAGGER: 0.05,
};

export const COMMON_STYLES = {
  FOCUS_RING: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111114] focus-visible:ring-[#8B5CF6]",
  INPUT_FOCUS_RING: "focus-visible:outline-none focus:border-[#8B5CF6]/50 focus:bg-[#FAFAFA]/[0.05] focus-visible:ring-4 focus-visible:ring-[#8B5CF6]/15",
};
