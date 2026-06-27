import { auth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { FabButton } from "@/components/FabButton";
import { GuestPersistenceHandler } from "@/components/GuestPersistenceHandler";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { Footer } from "@/components/Footer";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";
  const isLoggedIn = !!session?.user;

  return (
    <>
      <Header />
      {children}
      <Footer />
      <FabButton isLoggedIn={isLoggedIn} />
      <BottomNav isAdmin={isAdmin} />
      <ServiceWorkerRegistrar />
      <GuestPersistenceHandler
        userId={session?.user?.id ?? null}
        isGuest={session?.user?.isGuest ?? false}
      />
    </>
  );
}
