import { NormalizedTicket } from '../../types/ticket';
import { getLocalStore, updateLocalStore, initDatabase } from '../database';
import { mergeTickets } from '../../parsers/merger';
import { getLegacyTrainDetails, formatHaltTime } from '../../services/railRadarService';

export class TicketRepository {
  private static instance: TicketRepository;

  private constructor() {
    initDatabase();
  }

  public static getInstance(): TicketRepository {
    if (!TicketRepository.instance) {
      TicketRepository.instance = new TicketRepository();
    }
    return TicketRepository.instance;
  }

  public async init(): Promise<void> {
    await initDatabase();
  }

  public async getTickets(): Promise<NormalizedTicket[]> {
    await initDatabase();
    return getLocalStore();
  }

  public async getTicket(id: string): Promise<NormalizedTicket | null> {
    await initDatabase();
    const list = getLocalStore();
    return list.find((t) => t.id === id) || null;
  }

  public async findTicketByPNR(pnr: string): Promise<NormalizedTicket | null> {
    await initDatabase();
    if (!pnr) return null;
    const cleanTarget = pnr.replace(/[\s-]+/g, '').trim().toUpperCase();
    const list = getLocalStore();
    return (
      list.find(
        (t) => (t.pnr || '').replace(/[\s-]+/g, '').trim().toUpperCase() === cleanTarget
      ) || null
    );
  }

  public async findDuplicateTicket(pnr: string): Promise<NormalizedTicket | null> {
    return this.findTicketByPNR(pnr);
  }

  public async isDuplicatePNR(pnr: string): Promise<boolean> {
    const existing = await this.findTicketByPNR(pnr);
    return existing !== null;
  }

  public async createTicket(ticket: NormalizedTicket): Promise<NormalizedTicket> {
    await initDatabase();
    const list = getLocalStore();
    const existing = await this.findTicketByPNR(ticket.pnr);

    if (existing) {
      // Reconcile and merge duplicate PNR! Never add a duplicate row.
      const merged = mergeTickets(existing, ticket);
      const updatedList = list.map((t) => (t.id === existing.id ? merged : t));
      updateLocalStore(updatedList);
      return merged;
    }

    const updatedList = [ticket, ...list];
    updateLocalStore(updatedList);
    return ticket;
  }

  public async updateTicket(ticket: NormalizedTicket): Promise<NormalizedTicket> {
    const list = getLocalStore();
    const exists = list.some((t) => t.id === ticket.id);
    if (!exists) {
      return this.createTicket(ticket);
    }
    const updatedList = list.map((t) => (t.id === ticket.id ? ticket : t));
    updateLocalStore(updatedList);
    return ticket;
  }

  public async deleteTicket(id: string): Promise<boolean> {
    const list = getLocalStore();
    const updatedList = list.filter((t) => t.id !== id);
    updateLocalStore(updatedList);
    return true;
  }

  public async clearAllTickets(): Promise<void> {
    updateLocalStore([]);
  }

  public async saveOrMergeTicket(
    incoming: Partial<NormalizedTicket>
  ): Promise<{ ticket: NormalizedTicket; isDuplicate: boolean }> {
    if (!incoming.pnr) {
      throw new Error('PNR is required to save ticket');
    }

    // Fetch official train details & route from RailRadar legacy API when adding to wallet
    if (incoming.train?.number) {
      try {
        const legacy = await getLegacyTrainDetails(incoming.train.number);
        if (legacy) {
          if (!incoming.train.name || incoming.train.name === 'Ajni Vandebharat' || incoming.train.name === 'Train' || incoming.train.name.trim().length === 0) {
            incoming.train.name = legacy.trainName;
          }
          if (legacy.type && !incoming.train.type) {
            incoming.train.type = legacy.type;
          }
          if (incoming.journey) {
            if (incoming.journey.from) {
              const fromHalt = legacy.route.find(
                (r) => r.stationCode.toUpperCase() === incoming.journey?.from?.toUpperCase()
              );
              if (fromHalt) {
                if (!incoming.journey.fromName) incoming.journey.fromName = fromHalt.stationName;
                if (!incoming.journey.departure && fromHalt.scheduledDeparture) {
                  incoming.journey.departure = formatHaltTime(fromHalt.scheduledDeparture);
                }
              }
            }
            if (incoming.journey.to) {
              const toHalt = legacy.route.find(
                (r) => r.stationCode.toUpperCase() === incoming.journey?.to?.toUpperCase()
              );
              if (toHalt) {
                if (!incoming.journey.toName) incoming.journey.toName = toHalt.stationName;
                if (!incoming.journey.arrival && toHalt.scheduledArrival) {
                  incoming.journey.arrival = formatHaltTime(toHalt.scheduledArrival);
                }
              }
            }
          }
        }
      } catch (err) {
        console.log('[TicketRepository] Legacy train enrichment error:', err);
      }
    }

    const existing = await this.findTicketByPNR(incoming.pnr);
    if (existing) {
      const merged = mergeTickets(existing, incoming);
      const updated = await this.updateTicket(merged);
      return { ticket: updated, isDuplicate: true };
    }
    const created = await this.createTicket(incoming as NormalizedTicket);
    return { ticket: created, isDuplicate: false };
  }

  public async hasCompletedOnboarding(): Promise<boolean> {
    const { getOnboardingStatus } = require('../database');
    return getOnboardingStatus();
  }

  public async setOnboardingStatus(completed: boolean): Promise<void> {
    const { setOnboardingStatus } = require('../database');
    setOnboardingStatus(completed);
  }

  public async setOnboardingCompleted(completed: boolean): Promise<void> {
    return this.setOnboardingStatus(completed);
  }
}

export const ticketRepository = TicketRepository.getInstance();
