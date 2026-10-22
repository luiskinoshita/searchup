// Ícones das abas (traço simples, cor herdada do texto)
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, viewBox: '0 0 24 24' };

export const IconSearch = () => (<svg {...P}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const IconTag = () => (<svg {...P}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>);
export const IconPin = () => (<svg {...P}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>);
export const IconUsers = () => (<svg {...P}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 4.6a3 3 0 0 1 0 5.8M21 20c0-2.6-1.5-4.5-3.8-5.2" /></svg>);
export const IconChat = () => (<svg {...P}><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 9.5h8M8 12.5h5" /></svg>);
export const IconUser = () => (<svg {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>);
export const IconShield = () => (<svg {...P}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>);

export const TAB_ICONS = {
  buscar: IconSearch, ofertas: IconTag, achados: IconPin, comunidade: IconUsers,
  mensagens: IconChat, perfil: IconUser, admin: IconShield,
};

export const IconCamera = () => (<svg {...P}><path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" /><circle cx="12" cy="13" r="3.5" /></svg>);
export const IconImage = () => (<svg {...P}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.8" /><path d="m21 16-5-5-8 9" /></svg>);
