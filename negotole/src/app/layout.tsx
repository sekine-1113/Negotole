import type { Metadata } from "next";
import { M_PLUS_Rounded_1c, Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { FabButton } from "@/components/FabButton";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Footer } from "@/components/Footer";
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

export const metadata: Metadata = {
  title: "negotole",
  description: "儚く消える、夜のつぶやき",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";
  const isLoggedIn = !!session?.user;

  return (
    <html
      lang="ja"
      className={`${mPlusRounded.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-20 md:pb-0">
        <Header />
        {children}
        <Footer />
        <FabButton isLoggedIn={isLoggedIn} />
        <BottomNav isAdmin={isAdmin} />
        <ServiceWorkerRegistrar />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
