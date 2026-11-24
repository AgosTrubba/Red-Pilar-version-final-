export type AlertCategory =
  | 'Movilidad'
  | 'Servicios'
  | 'Alertas vecinales'
  | 'Pilar en tiempo real';

export type AlertStatus =
  | 'En verificación'
  | 'Confirmado'
  | 'En proceso'
  | 'Terminado';

export type VoteOption = 'si' | 'no' | 'proc' | 'fin';

export interface Locality {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  previousLat: number | null;
  previousLng: number | null;
  coordsVerified: boolean;
  verificationNote: string;
  abiertos: string[];
  cerrados: string[];
  activeAlertsCount?: number;
  updatedAt: number;
}

export interface AlertMediaItem {
  id: string;
  url: string;
  mimeType: string;
  mediaType: 'image' | 'video';
}

export interface VoteCounts {
  si: number;
  no: number;
  proc: number;
  fin: number;
}

export interface AlertComment {
  id: string;
  text: string;
  authorAlias: string;
  createdAt: number;
}

export interface AlertItem {
  id: string;
  category: AlertCategory;
  subcategory: string;
  title: string;
  zone: string;
  locality: string;
  referenceText: string;
  description: string;
  status: AlertStatus;
  ownerId: string;
  ownerAlias: string;
  lat: number | null;
  lng: number | null;
  hasExactCoords: boolean;
  effectiveLat: number;
  effectiveLng: number;
  votes: VoteCounts;
  totalVotes: number;
  myVote: { option: VoteOption; comment: string } | null;
  media: AlertMediaItem[];
  comments: AlertComment[];
  createdAt: number;
  terminatedAt: number | null;
}

export interface NeighborNotification {
  id: string;
  message: string;
  alertTitle: string | null;
  isRead: boolean;
  createdAt: number;
}

export interface NeighborUser {
  id: string;
  alias: string;
  homeLocality: string | null;
  homeBarrio: string | null;
  isAnonymous: boolean;
  createdAt: number;
  lastSeenAt: number;
  stats: {
    alertsCount: number;
    votesCount: number;
  };
  notifications: NeighborNotification[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  detail: string;
  href: string;
  channel: 'tel' | 'whatsapp';
  group: 'Emergencias' | 'Municipio y Servicios';
}
