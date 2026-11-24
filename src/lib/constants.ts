import type { AlertCategory, AlertStatus, VoteOption } from '../shared/types';

export const CATEGORY_ICONS: Record<AlertCategory, string> = {
  Movilidad:
    'data:image/png;base64,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',
  Servicios:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAACXBIWXMAAAAAAAAAAQCEeRdzAAAAAXNSR0IB2cksfwAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABGdBTUEAALGPC/xhBQAADRZJREFUeJzdnAdYVFcWgGnSwUSRoiiQIoYiM9TBHtmY6FoiakyMaBCDumtYyZpEMQrJJkoTFYlRcS2JSiLEkkhEjGCJX4qJZWCG3qWoFOlt4Ow99znUoci8N7PmfN+xPN7Me/fn3NPufU9FRYGioTtc38DKyclkytvvWC0JCp+wJvqM/cazv/MCLopcw1IeuIanVhKtcgsTPuAFJIjsN5757aW1h85aLQ4MM52ybKWBFZ+voWuop8h75ly0R1mOM5m63Nv63QOn+EHXCtwi0sF9by5VwZ5scNudCW67MoCA6aZ4DH+G50jPd4tIa3cMupZvvfrLb0wmv7VSe5TFWGWPb0iipqWnZeS8wHPCuiPnXELu1LjvzWNgEDiu4aJeMAatO0X0OwSROYDf6RJyu3qC78E4I8e5C9Q1dTSVPe4BRUP3Gf3RHr7reR//JBJEMhbiulM8dCADAhMTWMTCCDDelospo2d4r9XQMdBVNodeoqo+TNV0xjvv8gOvZuNvVtaU4Vrxmnht/takdLOpb7+jqqambCyMGLzg6mr379PXGTDpCgfTFyg7/1PJhs85OSsNjKq6hsrYeR9sI46zWbAnS+lgeir1eTvFTRZz39+qqqauWDhaI8eOsfGLueQelc+tj5FXyb25RxFr8jt5SWek+WiFwDEc7+7u+OmNfIwkSgcwWGsiAcPpk+t5z7zoJuAUzkin+QtJQlcrIPmJsgf9pErzrTBhrZHDrLmcwBnlumgpyUFa/h8c8ZAhkXt32ylqHMWfPZ9VOJj0UTgRaUofJCuQwlMbRvFeZceSDF8UuOO0epotRyYkMt2eecHZVS44WkbjRhOHXOimIJ/jGJoCvOAUxUAiY3IKupKr/ayZ6ZDgYJ5DQvllRUUrJwJnYXQGeJ/IBZcwxVgSRje79V8lDinrHjf/w09onsOyhTjLGLwLUWfyM+G9WmgHgPnRmeAYItuSZH1eHsU8yWLOewFPBMfwBTc3zJDZTAJxYPMOZMDU3eJeg0SLEexMhYKKBkBZdowUnzIAoZVN2SViFxIZI3HajcMtHfiDnlqktvqFzfKBTwa79HAmtEokkJhRTf/v0gOeQ7AQrmZVQUV9K8zal94LkP0OIWw+lw9VDa3gf6aQns/W/WFZYr/hm2uqqqoDAzKdtmI1FntsmjFOrTlfpkFNYwu1kPfJAO22C2HiDkYnRYhg9pfpsPpkDmz4Lp9a2vQ9YgoJz3MgjvuVKDHcr26in998/h79HKtTbW8umE16Y2W/cLCfww+8msdFSEcLCE68Rwe46fsiYjUp8NG5AvhRVAl5FY1Q1yyBZkkbNLW2QWOrBEqrm+FGbg2EXi6Bv0Wlwxv/zaCf/b2wnloc244cuwCOWy9laWjr6fQJaLSHrx/b1tNVMYSjdewgoAorG6G3tHfRTqltksDJP8th49kCmEYsCy2Si/vDsY+ZsXKdTDjqWnpavI8vZ7LR7EJn2vM3jFNi3oF0+CWvug8g/SkjhVXNsD62gFqji5z32KcVBSSkaWhqDesFyMhpnifmBfJeBMG8RpwsTgP0IW6Pp5fXV1lQXtf8hGBkgwr5qZR+p/R6E4nDxmuxYVnukdkwijdrXi9AE9Yd+YH2kOX4cnSmG77Lg7b2NrieUwNLDmdRJ7uY+I+q+hY54XQH9VliCdiS70ZAgfGFcKuoDtadKpCZHjyJCvbkgO2ag+e6wdE2trJ0Cb1TL2/egzfnfTwbqhtb6SBEpQ3gHpEK6WX1LMJhAEna22m+dOzXsg7LCk+632FZQ1ZkEPxnra6ReeeSkulUL9ZCO+Y4GLKP33wIH31fCIdulLEMpxPSneIGOPxLGRRUNkHQheKOKSf3NCMhf8yUN707AFm/eyAOl0/YAISKvmDCZ3dh9r40aGyRcASIgRSUUEJ9EAYBtkI/1p82q7+IfZz7DNfjB10tYBb12LkAKvoe/O1yB4cBJCprZD0vwjzQKTApf5iOvq6KviWPj0u6uGrJ1gXwZt1JbZVb3sAxIAbS8q9z2W2TEBaCCHH7cAt7noqx+xvLcc6xaT209jqSCW1tbRzDYQCFJ9+nFsvmGNxJymMm8FymYum5NYQNQBjBpIr+B8sI7q2HAXQu9RG9JkJCZSMfEhAmLy4KCCEOen+svPkPQgmML6K5COoHZwtpOaEoQFdzasHzUAaE/VRMksgSeP1QFs3m5QJE8iE7332xKnb+sT/Lu4yDESQxrQqkckZYSW9WUYBu5NXBb11KmIT0GrnzIbfdWWDvd+KqisPmBJG89RdGEY+oNFj7bS7RPNq+CFagBSVn1cKamBz47k4FxN6uAJ+TeX12JAcNCOuyzfGpKi6hd8vk2rPTBRKWGqjoB/xJyaEoQN/eroLx/+n0QXw54TCASKjfdjlfhcApl/fLeio6yQUH0x8nidwD2hJfLH+JIQOQI1eAsBWBTvJWUS3nVlTb3Aaz92ey3iPqBMTSFOup+Bv9LKFoEICgn3MG/my8uJoECfYbaB1TzGHzhVQudoShT5q+RwTFj5r6HWhJdTPklTf2Ogeb82m0C9A3IPzT6zhm0exOLwYQOunzKayE+b4UHWb/+RDT/PKMTu91PIJkx/MPpNHeUr/Ww9FK7OMwf4WVRLE/K8KOoqi0rg9IAGGXS2H8p3fgoriyY7Ldr22F6ZFpFJykTbajr2tpgwXRWaxELFmKFf1LqyJjVCwXbwtluxbrqphE+pIcpS8rCE8qA5vPhTB5VyqcvVsBv+XXwtKj2eTYXVh6OKMPQACR1x6wXn91VWTy/Osffq5iPOlNLy4BoaLDPnXroQwrAth+qRSWH8uCXcml4B7BrJr6xeXB54klsPCgLAsCSH/QRKptEV064gyQtFjVt+Tx2G539FQMwR57xVBW3dNhAwXhcyKb/vthXQsUVTHnHP+jAubtT5MJaO2pAtYXDrsp0+5oG25h76CirmOgyw+8ks92w6yn4nQIii+UCcj7eBb0lCO/l8sABHBeVE0sktstMsjCOSi5QFPXgHkuZLzPvm+53uaCTTScEsLirsljT0CdII7KANRAHDNW6lw5Zqk+ruTjOnrS+GAI134IFX3R+6fzulnKDuKDVsmwoK9uVtAwD9DWcSzmViWnjlmqtGk/ucs6vbbROHOX4Fs1bhzveZZuc/k5pxruEV9TWtNM1+mXHc2kvie/opGu0+PxiCtltOmf/bABCiubIKe8CRYfzubceuh2mOA/a/SMzM27LxyuOXSOq3xIFiSMWPh312OdygQM57DO/0sjHNf3h67G1nf/aRlLz/MXsrH0PJBKK/3bpJAVFtd36N3ium5Kj5cwx9PvN8DGs0Ws7gnqS/HJIRP+a723Catp6gxzCLgo5vpJHafQVBrym1slvfxOf7I+roCuf3F5b8zmhQtiDU3t3psXUMxeXrWOy+0vqNLpdPTX+3BBXAXnUyv71XhRJfyQWgV/P5Apd595QOshYzefsWKNTDgoJCfS4W1LzuHairBfNG23GGbuTYOXiTX1pzOJzojk/oEZHDN/y8UMDS0drT4B0ZA/5W1vrq0II1FyZhW0SNqgtqm1X21okUBxdQvM2pfBqQVhaB89aYlXv3AYZ6SmYusfe53LiIbO9ufsR4P2P1WNEroNjytAdBOn34mkwezhpKJvxeeReqSRq7yI2dEqBTRwz7miXgIeXAGi24BTGgwt7CcOEg8j5nP8t7C9kVyqGI2SMqpk2IpsqWiQwEyOAOEYLWav3/REcKRTzea9E4lc5EaY8C04mAF+cfmwPjavX8VzVnzNTZ2IY7P9x5Ef1QY9t3qI1ogxJvyga7lctGQxYaT7egah8m6rk6XYUmUeZjE1Hhqdx2LwvKuLS6iw+q/1OFQGbrOrMLR04MkFRyojHF6dQ5x2w18BEoUTJqwdYTt9JitwOiDx58x92iFJ4Yy093iVVTgdkBxem+MSJqx+Gh/qxYdzXHb88WCEzbSXOYEjFfRJ/MArmYqo/NlSzJIdtyVlGFjY23MKRyqaz5oZkxQgAXMIrptsck2piDRagL60Jvq01nBjI4XAkQq+7sF89oZN6JcU0Wh74imFPXbib8xfWeuvUDA9Rd+S72C74VSSst760stqiH/ENS2bfx6L1x9rY6NUOFJBazKZsswL3xuktNfjIBhybV5AgtDYdeESZTORKfhIlem0FT4OAReFaOK4e59LH4U+hl6HTPGJH/5wE99z9lS8iQrbtyNJ3mTtGx3nEnL7EX1fGRkIzaHkWcHFV3Ttkr6iKxect98st14VdWKEnccraurDhlhQKVlwSclk8lte1j77TvK3JWW57hRL0EdIoQlITURf6BaRzrwRQaq7M+jPpDDcmbSilb/1cuZ478hjxoLFb2o9a2ai7PGxKura+tp6Y+1sjQVL3rLy3LLd2ueLGNt/fXPFYdOPd3H5m78tWap5ZMrctvWLSbL2iYp5btGW7cZui5bqmdvY4DRW5D3/D5vj4adYfwAHAAAAAElFTkSuQmCC',
  'Alertas vecinales':
    'data:image/png;base64,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',
  'Pilar en tiempo real':
    'data:image/png;base64,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',
};

export const STATUS_META: Record<
  AlertStatus,
  { bg: string; text: string; dot: string; headline: string; summary: string }
> = {
  'En verificación': {
    bg: '#CF8838',
    text: '#FFFFFF',
    dot: '🟠',
    headline: 'En verificación',
    summary: 'Todavía faltan votos de vecinos para confirmarlo.',
  },
  Confirmado: {
    bg: '#22A559',
    text: '#FFFFFF',
    dot: '🟢',
    headline: 'Confirmado',
    summary: 'La mayoría de los vecinos votó “Sí es cierto”.',
  },
  'En proceso': {
    bg: '#F2C94C',
    text: '#1C2A3D',
    dot: '🟡',
    headline: 'En proceso',
    summary: 'La mayoría de los vecinos votó “Está en proceso”.',
  },
  Terminado: {
    bg: '#A66BE0',
    text: '#FFFFFF',
    dot: '🟣',
    headline: 'Terminado',
    summary: 'La mayoría de los vecinos votó “Ya terminó”.',
  },
};

export const STATUSES: AlertStatus[] = [
  'En verificación',
  'Confirmado',
  'En proceso',
  'Terminado',
];

export const VOTE_OPTIONS: Array<{
  key: VoteOption;
  label: string;
  activeBg: string;
  activeText: string;
}> = [
  { key: 'si', label: 'Sí es cierto', activeBg: '#22A559', activeText: '#FFFFFF' },
  { key: 'no', label: 'No es cierto', activeBg: '#ED1C37', activeText: '#FFFFFF' },
  { key: 'proc', label: 'Está en proceso', activeBg: '#F2C94C', activeText: '#1C2A3D' },
  { key: 'fin', label: 'Ya terminó', activeBg: '#A66BE0', activeText: '#FFFFFF' },
];

export const CATEGORIES: AlertCategory[] = [
  'Movilidad',
  'Servicios',
  'Alertas vecinales',
  'Pilar en tiempo real',
];

export const CATEGORY_DESCRIPTIONS: Record<AlertCategory, string> = {
  Movilidad: 'Cortes, obras y accidentes',
  Servicios: 'Luz, agua e internet',
  'Alertas vecinales': 'Seguridad y convivencia',
  'Pilar en tiempo real': 'Lo que está pasando ahora',
};

export const SUBCATEGORIES: Record<AlertCategory, string[]> = {
  Movilidad: [
    'Corte de calle',
    'Obra en la vía pública',
    'Accidente',
    'Tránsito lento',
    'Semáforo fuera de servicio',
  ],
  Servicios: [
    'Corte de luz',
    'Corte de agua',
    'Pérdida de internet',
    'Problema de gas',
    'Alumbrado público',
  ],
  'Alertas vecinales': [
    'Seguridad',
    'Convivencia',
    'Mascota perdida',
    'Auto sospechoso',
    'Pedido de ayuda',
  ],
  'Pilar en tiempo real': [
    'Evento o festejo',
    'Ruido o disturbio',
    'Clima y tormenta',
    'Otro suceso',
  ],
};

export const DATE_FILTERS = [
  { hours: 24, label: 'Últimas 24 horas' },
  { hours: 72, label: 'Últimos 3 días' },
  { hours: 168, label: 'Últimos 7 días' },
  { hours: 336, label: 'Últimos 14 días' },
  { hours: 720, label: 'Últimos 30 días' },
];

export function formatAlertDate(ts: number): string {
  const d = new Date(ts);
  const datePart = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const timePart = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} · ${timePart} hs`;
}

// Client-side contextual moderation preview (mirrors server moderation)
const SHORTENERS = /(^|\.)(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rb\.gy|shorturl\.at|ow\.ly|t\.ly|buff\.ly|tiny\.cc)$/;
const BAD_TLD = /\.(tk|ml|ga|cf|gq|xyz|top|click|zip|mov|work|rest|loan|date|review|country|kim|men)$/;

export function moderateClientText(rawText: string): string | null {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return null;

  if (/\b(?:javascript|data|vbscript|file|ftp|blob|about|intent):/i.test(trimmed)) {
    return 'Ese tipo de link no está permitido. Usá solo links que empiecen con https://';
  }
  if (/\bhttp:\/\//i.test(trimmed)) {
    return 'Los links con http:// no son seguros. Usá solo links que empiecen con https://';
  }
  if (/(^|[\s(])www\./i.test(trimmed)) {
    return 'Agregá https:// al comienzo del link (ej.: https://sitio.com).';
  }

  const re = /https:\/\/[^\s]*/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(trimmed)) !== null) {
    let parsed: URL;
    try {
      parsed = new URL(match[0].replace(/[.,;:!?)\]]+$/, ''));
    } catch {
      return 'Uno de los links no es válido. Revisalo o sacalo.';
    }
    const host = parsed.hostname.toLowerCase();
    if (
      parsed.username ||
      parsed.password ||
      parsed.port ||
      /^[\d.]+$/.test(host) ||
      host.includes('[') ||
      host.includes('xn--') ||
      host.length > 60 ||
      (host.match(/-/g) || []).length >= 4 ||
      !host.includes('.') ||
      SHORTENERS.test(host) ||
      BAD_TLD.test(host)
    ) {
      return 'Bloqueamos un link porque parece de un sitio peligroso o sospechoso. Cambialo o sacalo para continuar.';
    }
  }

  const cleaned = trimmed.replace(/https:\/\/\S+/gi, ' ');
  const lowered = ` ${cleaned.toLowerCase()} `;
  const civicContext =
    /(accident|choque|robo|robar|asalt|denunci|alerta|aviso|cuidado|ayuda|auxilio|precauci|polic|urgente|emergencia|acoso|acosan|bullying|maltrato|violencia|abuso|peligro|sospechos|prevenir|ojo)/.test(
      lowered
    );

  if (
    /(te voy a|los voy a|lo voy a|la voy a|vas a ver)\s*(matar|reventar|romper|cagar a|prender|quemar|violar|buscar)/.test(
      lowered
    ) ||
    /(te|los|lo) (mato|reviento|quemo)/.test(lowered)
  ) {
    return 'Detectamos una amenaza directa. Cambiá el mensaje para continuar.';
  }

  if (
    /(dni|documento|pasaporte|licencia)\D{0,14}\d{1,2}\.?\d{3}\.?\d{3}/.test(lowered) ||
    /pasaporte\s*(n|nro|numero|número)?\W*[a-z]{2,3}\d{5,}/.test(lowered)
  ) {
    return 'No se pueden publicar números de DNI ni de pasaporte. Sacalos para continuar.';
  }

  const withoutCbu = lowered.replace(/\b\d{22}\b/g, ' ');
  if (/\b(?:\d{4}[ -]?){3}\d{4}\b/.test(withoutCbu) || /\b\d{15,16}\b/.test(withoutCbu)) {
    return 'No se pueden publicar datos de tarjetas. Sacalos para continuar.';
  }

  if (/(clave|contraseña|password|cvv|pin)\s*(es|:|=|\bde\b)?\s*\S*\d/.test(lowered)) {
    return 'No se pueden publicar claves ni credenciales. Sacalas para continuar.';
  }

  const insult =
    /(idiota|imb[eé]cil|est[uú]pid|pelotud|boludo|hijo de puta|hdp|forr[oa]|put[oa]\b|mierda|basura|in[uú]til|ladri|sorete|cag[oó]n|mogólic|retrasad|trol[oa])/.test(
      lowered
    );
  const directed =
    /(\bvos\b|\bsos\b|\beres\b|\bson unos\b|\bsos un|tu (madre|vieja)|\bte\b|\bandate\b|callate)/.test(
      lowered
    );

  if (insult && (directed || !civicContext)) {
    return 'Tu mensaje parece un insulto o una agresión. Reescribilo para avisar o contar lo que pasa, sin ofender a nadie.';
  }

  if (
    cleaned.length >= 6 &&
    (/([a-zñáéíóú])\1{4,}/i.test(cleaned) ||
      /\b[^aeiouáéíóúü\s\d\W]{6,}\b/i.test(cleaned) ||
      /(asdf|qwer|zxcv|hjkl|jkjk|ñlkj)/i.test(lowered) ||
      (new Set(cleaned.replace(/\s/g, '').toLowerCase()).size <= 3 && cleaned.length >= 8))
  ) {
    return 'Parece que el texto no tiene sentido. Escribí qué está pasando con palabras claras.';
  }

  return null;
}
