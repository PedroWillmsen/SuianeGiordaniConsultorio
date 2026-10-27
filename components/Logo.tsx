export function Dente({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M7.5 3C5 3 3.5 5 3.5 7.5c0 2 .8 3.4 1.4 5 .6 1.7.8 4 1.3 6 .4 1.6 1 2.5 1.9 2.5 1.6 0 1.6-3.3 2.2-5.2.3-1 .9-1.3 1.7-1.3s1.4.3 1.7 1.3c.6 1.9.6 5.2 2.2 5.2.9 0 1.5-.9 1.9-2.5.5-2 .7-4.3 1.3-6 .6-1.6 1.4-3 1.4-5C20.5 5 19 3 16.5 3c-1.9 0-2.9 1-4.5 1S9.4 3 7.5 3Z" />
    </svg>
  )
}

export function Marca({ logo, tamanho = 'h-10 w-10' }: { logo?: string | null; tamanho?: string }) {
  if (logo) return <img src={logo} alt="" className={`${tamanho} rounded-xl object-cover`} />
  return (
    <div className={`${tamanho} flex items-center justify-center rounded-xl bg-[var(--marca)] text-white shadow-sm`}>
      <Dente className="h-1/2 w-1/2" />
    </div>
  )
}
