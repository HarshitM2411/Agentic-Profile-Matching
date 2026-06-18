export function Footer() {
  return (
    <footer className="shrink-0 flex justify-between items-center px-gutter py-4 w-full border-t border-outline-variant bg-surface-container-lowest/50 backdrop-blur-sm z-20">
      <div className="font-label-md text-label-md text-on-surface opacity-60">
        © 2024 AirTribe AI • Systems Active
      </div>
      <div className="flex items-center gap-6">
        {['Privacy', 'Terms', 'Support'].map((link) => (
          <a
            key={link}
            href={`#${link.toLowerCase()}`}
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-opacity"
          >
            {link}
          </a>
        ))}
      </div>
    </footer>
  )
}
