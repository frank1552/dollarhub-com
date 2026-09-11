'use client';

import { MessageCircle, Phone, Send, Youtube } from 'lucide-react';

const phoneNumber = '+254115852475';
const telegramUrl = 'https://t.me/Frankdollarsign';
const youtubeUrl = 'https://youtube.com/@francisndungu-l1o?si=-aAb-3zAfwtajLtQ';
const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}`;

export function ContactFloat() {
  return (
    <aside className="contact-float fixed bottom-4 right-4 z-[80] w-[min(310px,calc(100vw-2rem))] rounded-2xl border border-white/15 bg-slate-950/90 p-3 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
        <div>
          <p className="text-sm font-semibold">Trade responsibly</p>
          <a className="mt-0.5 block text-xs text-slate-300 hover:text-white" href={`tel:${phoneNumber}`}>
            {phoneNumber}
          </a>
        </div>
        <span className="rounded-full bg-amber-300/15 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-200">
          Support
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <ContactLink href={whatsappUrl} label="WhatsApp" className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30">
          <MessageCircle className="h-4 w-4" />
        </ContactLink>
        <ContactLink href={telegramUrl} label="Telegram" className="bg-sky-500/20 text-sky-200 hover:bg-sky-500/30">
          <Send className="h-4 w-4" />
        </ContactLink>
        <ContactLink href={youtubeUrl} label="YouTube" className="bg-red-500/20 text-red-200 hover:bg-red-500/30">
          <Youtube className="h-4 w-4" />
        </ContactLink>
        <ContactLink href={`tel:${phoneNumber}`} label="Call" className="bg-white/10 text-white hover:bg-white/20">
          <Phone className="h-4 w-4" />
        </ContactLink>
      </div>
    </aside>
  );
}

function ContactLink({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      aria-label={label}
      title={label}
      className={`flex h-9 items-center justify-center rounded-lg transition-colors ${className}`}
    >
      {children}
    </a>
  );
}