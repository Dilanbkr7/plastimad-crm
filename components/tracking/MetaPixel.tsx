"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackWhatsAppClick } from "@/lib/tracking";

export default function MetaPixel() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/") return;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (target?.href.startsWith("https://wa.me/")) trackWhatsAppClick();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);
  if (pathname !== "/") return null;
  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
    >
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){
        n.callMethod?
        n.callMethod.apply(n,arguments):
        n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];
        t=b.createElement(e);
        t.async=!0;
        t.src=v;
        s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}
        (window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');

        fbq('init', '3262996433911183');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
