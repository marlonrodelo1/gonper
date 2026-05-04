import { Icon } from "@/components/landing/icons";

const cols: Array<[string, string[]]> = [
  ["Producto", ["Cómo funciona", "Juanita", "Planes", "Panel demo"]],
  ["Recursos", ["Guía setup", "API docs", "Soporte", "Blog"]],
  ["Empresa", ["Sobre Gonper", "Privacidad", "Términos", "Contacto"]],
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2 text-ink mb-4">
              <Icon.Logo width="22" height="22" />
              <span className="text-[18px] tight font-medium">Gonper</span>
            </div>
            <p className="text-stone text-[14px] max-w-[280px] leading-relaxed">
              Una recepcionista que no descansa nunca. Para barberías, peluquerías y centros de estética en España.
            </p>
          </div>
          {cols.map(([title, links]) => (
            <div key={title}>
              <div className="text-[11px] uppercase tracking-[0.18em] text-stone mb-4">
                {title}
              </div>
              <ul className="flex flex-col gap-2.5">
                {links.map((i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="text-[14px] text-ink hover:text-terracotta transition"
                    >
                      {i}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="rule my-12"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] text-stone">
          <p>© 2026 Gonper · Tenerife, España · Hecho con cariño en Canarias 🌊</p>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sage"></span>Sistemas operativos
            </span>
            <a href="#" className="hover:text-ink">
              Status
            </a>
            <a href="#" className="hover:text-ink">
              Login
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
