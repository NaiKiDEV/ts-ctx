import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      nav={{ title: "ts-ctx" }}
      links={[
        {
          text: "GitHub",
          url: "https://github.com/NaiKiDEV/ts-ctx",
          external: true,
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
