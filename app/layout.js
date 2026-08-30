import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Pitch Hive — AI Adversarial Pitch Simulation',
  description: 'Put your startup through an AI investment committee. Pitch live, get challenged, find exactly where your startup breaks, fix it, pitch again.',
  icons: { icon: '/pitchhive-mark.png' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
