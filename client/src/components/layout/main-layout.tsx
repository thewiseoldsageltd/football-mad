import { useMemo } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { absoluteSeoUrl, getSeoBaseUrl, useJsonLd } from "@/lib/seo";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const globalJsonLd = useMemo(() => {
    const baseUrl = getSeoBaseUrl();
    const logoUrl = absoluteSeoUrl("/assets/football-mad-fm-logo.webp");
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "Football Mad",
          url: baseUrl,
          logo: {
            "@type": "ImageObject",
            url: logoUrl,
          },
        },
        {
          "@type": "WebSite",
          name: "Football Mad",
          url: baseUrl,
          publisher: {
            "@type": "Organization",
            name: "Football Mad",
            logo: {
              "@type": "ImageObject",
              url: logoUrl,
            },
          },
        },
      ],
    };
  }, []);

  useJsonLd("global-structured-data", globalJsonLd);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
