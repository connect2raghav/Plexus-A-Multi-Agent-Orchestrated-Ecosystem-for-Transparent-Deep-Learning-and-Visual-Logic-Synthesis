import { Navbar } from "@/components/navbar";
import { Head } from "@/layouts/head";

interface DefaultLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function DefaultLayout({
  children,
  title,
  description,
}: DefaultLayoutProps) {
  return (
    <div className="relative flex flex-col h-screen">
      <Head title={title} description={description} />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}
