const SHORTENERS = /(^|\.)(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rb\.gy|shorturl\.at|ow\.ly|t\.ly|buff\.ly|tiny\.cc)$/;
const BAD_TLD = /\.(tk|ml|ga|cf|gq|xyz|top|click|zip|mov|work|rest|loan|date|review|country|kim|men)$/;

export function checkLinks(rawText: string): string | null {
  const text = rawText || '';
  if (/\b(?:javascript|data|vbscript|file|ftp|blob|about|intent):/i.test(text)) {
    return 'Ese tipo de link no está permitido. Usá solo links que empiecen con https://';
  }
  if (/\bhttp:\/\//i.test(text)) {
    return 'Los links con http:// no son seguros. Usá solo links que empiecen con https://';
  }
  if (/(^|[\s(])www\./i.test(text)) {
    return 'Agregá https:// al comienzo del link (ej.: https://sitio.com).';
  }

  const re = /https:\/\/[^\s]*/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
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
  return null;
}

export function moderateText(rawText: string): string | null {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return null;

  const linkError = checkLinks(trimmed);
  if (linkError) return linkError;

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

export function formatAlertCopy(params: {
  subcategory: string;
  zone: string;
  referenceText?: string;
  rawDescription: string;
}): { title: string; description: string } {
  const cleanDesc = params.rawDescription.replace(/\s+/g, ' ').trim();
  const cleanRef = (params.referenceText || '').replace(/\s+/g, ' ').trim();
  const title = `${params.subcategory} en ${params.zone}`;
  const description = cleanRef ? `${cleanDesc} (${cleanRef})` : cleanDesc;
  return { title, description };
}
