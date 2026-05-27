import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Kanit } from "next/font/google";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Mini Stock",
  description: "ระบบจัดการสต๊อกสินค้า LINE OA"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={kanit.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
