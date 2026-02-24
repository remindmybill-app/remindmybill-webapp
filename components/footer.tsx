import { Bell, Twitter, Github, Linkedin } from "lucide-react"

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/40 bg-card/50">
      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">Product</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Security
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Roadmap
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Careers
                </a>
              </li>
              <li>
                <a href="/contact-us" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  GDPR
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">Social</h3>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="GitHub">
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 md:flex-row">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Remind My Bill. All rights reserved.
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Built with security and privacy in mind • developed by{" "}
            <a
              href="https://foryoudigitalsolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              For You Digital Solutions
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
