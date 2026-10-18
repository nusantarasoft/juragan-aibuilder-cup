export const ORANGE = "#fb923c";
export const SKY = "#38bdf8";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const SCROLL_Y =
    "overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:hover:bg-white/25";

export const MIN_PILL_W = 284;
export const MIN_PILL_H = 34;
export const SNAP_EDGE_PX = 56;
export const OUTER_COLLAPSED_WIDTH = 64;
export const INNER_COLLAPSED_WIDTH = 68;
