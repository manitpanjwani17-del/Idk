import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Space_Grotesk, Space_Mono, Unbounded } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], display: "swap" });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], display: "swap" });
const spaceMono = Space_Mono({ variable: "--font-spacemono", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Validly · Find out if your idea will sell",
    template: "%s · Validly",
  },
  description:
    "Make a pre-launch page in 2 minutes, share it, and let real people decide. Get a verdict: SHIP IT, CHANGE IT or KILL IT.",
  applicationName: "Validly",
  openGraph: {
    title: "Validly · Find out if your idea will sell",
    description: "Test your side hustle with real people before you build it.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f2e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${grotesk.variable} ${spaceMono.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
