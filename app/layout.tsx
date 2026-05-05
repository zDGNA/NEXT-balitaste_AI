import type { Metadata } from "next";
// Path CSS yang benar untuk Next.js App Router
// Jika file ada di /styles/globals.css, gunakan path relatif dari app/
import '@/styles/globals.css'

export const metadata: Metadata = {
    title: "BaliBites AI — Your Personal Culinary Concierge",
    description: "Hyper-personal dining recommendations powered by local expertise, real-time context & AI that actually understands your cravings.",
    // Open Graph untuk share preview
    openGraph: {
        title: "BaliBites AI",
        description: "Discover your next perfect Bali meal",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id">
            <head>
                {/* Google Fonts — Cormorant Garamond + DM Sans + Playfair Display */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=Playfair+Display:ital,wght@1,400&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
