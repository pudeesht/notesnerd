import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { logout } from "@/app/actions";
import { getUser } from "@/lib/supabase";
import "highlight.js/styles/github-dark.css";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "notesnerd", template: "%s · notesnerd" },
  description: "Notes, searchable from anywhere.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser().catch(() => null);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="mx-auto max-w-3xl px-4 pb-24">
          <header className="flex flex-wrap items-center gap-x-5 gap-y-2 py-6 text-sm">
            <Link href="/" className="mr-auto text-lg font-bold tracking-tight">
              notesnerd
            </Link>
            <Link href="/random" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
              Random
            </Link>
            {user ? (
              <>
                <form action={logout}>
                  <button className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">Log out</button>
                </form>
                <Link
                  href="/new"
                  className="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
                >
                  + New
                </Link>
              </>
            ) : (
              <Link href="/login" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                Log in
              </Link>
            )}
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
