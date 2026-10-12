import type { SVGProps } from "react";

const paths = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  incidents: "M12 3 2 21h20L12 3Z M12 9v5 M12 17v.01",
  alerts: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  events: "M3 12h4l3-8 4 16 3-8h4",
  scenarios: "m9 3 0 6-6 10a1 1 0 0 0 1 2h16a1 1 0 0 0 1-2L15 9V3 M8 3h8 M7 15h10",
  topology: "M9 3h6v6H9z M3 16h6v5H3z M15 16h6v5h-6z M12 9v4 M6 16v-3h12v3",
  admin: "M12 3 3 7v6c0 4 9 8 9 8s9-4 9-8V7L12 3Z m-4 9 3 3 5-5",
  arrow: "M5 12h14 m-5-5 5 5-5 5",
};
export default function NavIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
