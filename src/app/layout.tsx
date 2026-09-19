import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { HeaderAuth } from "@/components/HeaderAuth";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/config/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"] });
// Waldenburg is licensed; Newsreader Light is the free stand-in.
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], weight: ["300"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — R&A jobs and internships`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_NAME, type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable} antialiased`}>
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-hairline bg-canvas">
          <nav className="container-page flex h-16 items-center justify-between">
            <Link href="/" className="display flex items-center gap-2 text-2xl">
              <Image src="/logo-mark.png" alt="" width={45} height={32} priority />
              <span className="hidden min-[400px]:inline">{SITE_NAME}</span>
            </Link>
            <div className="flex items-center gap-3 text-[15px] font-medium text-ink sm:gap-5">
              <Link href="/?type=internship" className="hidden md:inline">Internships</Link>
              <Link href="/my-jobs">My jobs</Link>
              <Link href="/about" className="hidden sm:inline">About</Link>
              <HeaderAuth />
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-hairline">
          <div className="container-page flex flex-col gap-2 py-10 text-[15px] sm:flex-row sm:justify-between">
            <p>{SITE_NAME} is free · Engineering careers in South India · Apply links go to the company or job portal.</p>
            <div className="flex gap-4">
              <Link href="/about" className="text-ink underline-offset-4 hover:underline sm:hidden">About</Link>
              <Link href="/privacy" className="text-ink underline-offset-4 hover:underline">Privacy</Link>
              <Link href="/about" className="text-ink underline-offset-4 hover:underline">Built by a student — contact</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
