import { LiffLayout } from "@/components/layout/LiffLayout";
import { LiffProvider } from "@/lib/liff/provider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LiffProvider><LiffLayout>{children}</LiffLayout></LiffProvider>;
}
