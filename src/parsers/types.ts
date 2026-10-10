import { NormalizedTicket, TicketSource } from '../types/ticket';

export interface NotificationParser {
  name: TicketSource;
  canParse: (text: string, packageName?: string) => boolean;
  parse: (text: string) => Partial<NormalizedTicket> | null;
}
