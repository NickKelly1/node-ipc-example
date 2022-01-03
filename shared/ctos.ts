import * as Comms from './comms';

export enum Type {
  PING = 'CLIENT::PING',
  PONG = 'CLIENT::PONG',
  HANDSHAKE = 'CLIENT::HANDSHAKE',
  MESSAGE = 'CLIENT::MESSAGE',
}

export type PingData = void;
export type Ping = Comms.Kind<Type.PING, PingData>;
export const ping = new Comms.Packet<Ping>(Type.PING);

export type PongData = void;
export type Pong = Comms.Kind<Type.PONG, PongData>;
export const pong = new Comms.Packet<Pong>(Type.PONG);

export type HandshakeData = { readonly id: string; };
export type Handshake = Comms.Kind<Type.HANDSHAKE, HandshakeData>;
export const handshake = new Comms.Packet<Handshake>(Type.HANDSHAKE);

export type MessageData = { message: string };
export type Message = Comms.Kind<Type.MESSAGE, MessageData>;
export const message = new Comms.Packet<Message>(Type.MESSAGE);
