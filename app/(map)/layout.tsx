import { Navbar } from "@/components/Navbar";

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24">{children}</div>
    </div>
  );
}
