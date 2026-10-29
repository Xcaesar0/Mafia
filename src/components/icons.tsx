import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 24): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
});
const mk = (d: ReactNode) => function Icon({ size, ...r }: P) { return <svg {...base(size)} {...r}>{d}</svg>; };

export const ArrowLeft = mk(<path d="M20 12H4m0 0 6-6m-6 6 6 6" />);
export const ArrowRight = mk(<path d="M4 12h16m0 0-6-6m6 6-6 6" />);
export const ChevronLeft = mk(<path d="m15 6-6 6 6 6" />);
export const Plus = mk(<path d="M12 5v14M5 12h14" />);
export const Close = mk(<path d="M6 6l12 12M18 6 6 18" />);
export const Help = mk(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17h.01" /></>);
export const Info = mk(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>);
export const Hash = mk(<path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" />);
export const QrCode = mk(<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2M14 20h2M20 14v2" /></>);
export const Trophy = mk(<path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4.5c0 3 1.2 4.5 3.5 5M16 6h3.5c0 3-1.2 4.5-3.5 5M12 13v4M8.5 20h7M10 17h4" />);
export const User = mk(<><circle cx="12" cy="8" r="4" /><path d="M4.5 20c.8-3.5 3.7-5.5 7.5-5.5s6.7 2 7.5 5.5" /></>);
export const Play = mk(<path d="M7 5v14l12-7z" fill="currentColor" />);
export const Fingerprint = mk(<><path d="M12 4a7 7 0 0 0-7 7v2M12 8a3 3 0 0 0-3 3c0 3-1 5-2 6.5M12 8a3 3 0 0 1 3 3c0 2.5.5 4.5 1.5 6M12 4a7 7 0 0 1 7 7c0 2-.3 3.5-.8 5M12 12v1c0 2.5-.7 4.5-1.7 6" /></>);
export const Phone = mk(<><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>);
export const EyeOff = mk(<><path d="M3 3l18 18M10.6 6.2A9 9 0 0 1 12 6c4.5 0 8 4 9 6-.4.8-1.3 2-2.6 3.1M6.6 7.6C4.5 9 3.3 11 3 12c1 2 4.5 6 9 6 1.3 0 2.5-.3 3.6-.8M9.9 10a3 3 0 0 0 4.1 4.1" /></>);
export const Eye = mk(<><path d="M3 12c1-2 4.5-6 9-6s8 4 9 6c-1 2-4.5 6-9 6s-8-4-9-6z" /><circle cx="12" cy="12" r="3" /></>);
export const Sun = mk(<><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>);
export const Moon = mk(<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />);
export const Lock = mk(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const Users = mk(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.2-5.2 6.5-5.2s5.9 1.8 6.5 5.2M16 5a3.5 3.5 0 0 1 0 6.5M18 15c1.8.6 3 2.2 3.5 5" /></>);
export const Gear = mk(<><circle cx="12" cy="12" r="3" /><path d="M12 2.8l1.6 2.2 2.7-.4.9 2.6 2.5 1.2-.6 2.7 1.7 2.1-1.7 2.1.6 2.7-2.5 1.2-.9 2.6-2.7-.4L12 21.2 10.4 19l-2.7.4-.9-2.6-2.5-1.2.6-2.7L3.2 10.8l1.7-2.1-.6-2.7 2.5-1.2.9-2.6 2.7.4z" /></>);
export const Crown = mk(<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" />);
export const Skull = mk(<><path d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3z" /><circle cx="9" cy="11.5" r="1.3" /><circle cx="15" cy="11.5" r="1.3" /></>);
export const Check = mk(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const Minus = mk(<path d="M5 12h14" />);
export const Pause = mk(<path d="M9 5v14M15 5v14" />);
export const Pencil = mk(<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />);
export const Fire = mk(<path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.5.6-2.5 1.5-3.5.3 1 .8 1.5 1.5 1.5C11 7.5 11 5 12 3z" />);
export const Volume = mk(<path d="M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7" />);
