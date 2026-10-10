import { NormalizedTicket } from '../types/ticket';

export function mergeTickets(
  existing: NormalizedTicket,
  incoming: Partial<NormalizedTicket>
): NormalizedTicket {
  const incTrainName = (incoming.train?.name || '').trim();
  const incFrom = incoming.journey?.from;
  const incTo = incoming.journey?.to;
  const incPassengerName = incoming.passenger?.name;

  return {
    ...existing,
    ...incoming,
    // Preserve booking ID if either has it
    bookingId: incoming.bookingId || existing.bookingId,
    // Prefer source if new, or combine
    source: incoming.source || existing.source,

    train: {
      number: incoming.train?.number || existing.train.number,
      name: incTrainName || existing.train.name,
      type: incoming.train?.type || existing.train.type,
    },

    journey: {
      from: (incFrom && incFrom !== 'UNKNOWN') ? incFrom : existing.journey.from,
      fromName: (incoming.journey?.fromName && !incoming.journey.fromName.includes('UNKNOWN'))
        ? incoming.journey.fromName
        : existing.journey.fromName,
      to: (incTo && incTo !== 'UNKNOWN') ? incTo : existing.journey.to,
      toName: (incoming.journey?.toName && !incoming.journey.toName.includes('UNKNOWN'))
        ? incoming.journey.toName
        : existing.journey.toName,
      date: incoming.journey?.date || existing.journey.date,
      departure: incoming.journey?.departure || existing.journey.departure,
      arrival: incoming.journey?.arrival || existing.journey.arrival,
      duration: incoming.journey?.duration || existing.journey.duration,
      boardingStation: incoming.journey?.boardingStation || existing.journey.boardingStation,
    },

    passenger: {
      name: (incPassengerName && incPassengerName !== '-' && incPassengerName !== 'Confirmed Passenger')
        ? incPassengerName
        : (existing.passenger.name && existing.passenger.name !== 'Confirmed Passenger' ? existing.passenger.name : '-'),
      coach: incoming.passenger?.coach || existing.passenger.coach,
      seat: incoming.passenger?.seat || existing.passenger.seat,
      class: incoming.passenger?.class || existing.passenger.class,
      className: incoming.passenger?.className || existing.passenger.className,
      bookingStatus: incoming.passenger?.bookingStatus || existing.passenger.bookingStatus,
    },

    fare: {
      base: incoming.fare?.base ?? existing.fare?.base,
      convenienceFee: incoming.fare?.convenienceFee ?? existing.fare?.convenienceFee,
      otherCharges: incoming.fare?.otherCharges ?? existing.fare?.otherCharges,
      total: incoming.fare?.total ?? existing.fare?.total,
    },

    status: incoming.status || existing.status,
    updatedAt: new Date().toISOString(),
  };
}
