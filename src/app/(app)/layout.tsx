import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Navigation } from "@/components/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="md:pl-64 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
