import * as Comms from './comms';

export enum Type {
  PING = 'SERVER::PING',
  PONG = 'SERVER::PONG',
  HANDSHAKE_REQUEST = 'SERVER::HANDSHAKE_REQUEST',
  HANDSHAKE_CONFIRMED = 'SERVER::HANDSHAKE_CONFIRMED',
}

export type PingData = void;
export type Ping = Comms.Kind<Type.PING, PingData>;
export const ping = new Comms.Packet<Ping>(Type.PING);

export type PongData = void;
export type Pong = Comms.Kind<Type.PONG, PongData>;
export const pong = new Comms.Packet<Pong>(Type.PONG);

export type HandshakeRequestData = void;
export type HandshakeRequest = Comms.Kind<Type.HANDSHAKE_REQUEST, HandshakeRequestData>;
export const handshakeRequest = new Comms.Packet<HandshakeRequest>(Type.HANDSHAKE_REQUEST);

export type HandshakeConfirmedData = { id: string; };
export type HandshakeConfirmed = Comms.Kind<Type.HANDSHAKE_CONFIRMED, HandshakeConfirmedData>;
export const handshakeConfirmed = new Comms.Packet<HandshakeConfirmed>(Type.HANDSHAKE_CONFIRMED);
