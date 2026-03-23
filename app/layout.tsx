import type { Metadata } from "next";
import '../styles/globals.css'


export const metadata: Metadata = {
    title: "BaliBites AI — Your Personal Culinary Concierge",
    description: "Hyper-personal dining recommendations powered by local expertise, real-time context & AI that actually understands your cravings.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=Playfair+Display:ital,wght@1,400&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
