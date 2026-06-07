import type { Metadata } from "next";
import { M_PLUS_Rounded_1c, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const mPlusRounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://negotole.vercel.app";

export const metadata: Metadata = {
  title: "negotole",
  description: "儚く消える、夜のつぶやき",
  openGraph: {
    title: "negotole",
    description: "儚く消える、夜のつぶやき",
    url: APP_URL,
    siteName: "negotole",
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630 }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "negotole",
    description: "儚く消える、夜のつぶやき",
    images: [`${APP_URL}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${mPlusRounded.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-20 md:pb-0">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
