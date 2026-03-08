import type { ReactNode } from "react";
import "./globals.css";
import { Provider } from "./provider";

export const metadata = {
  title: "ts-ctx",
  description: "Go's context pattern for TypeScript, built on AbortSignal",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
