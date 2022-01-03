import { Socket } from "node:net";
import * as Comms from '../shared/comms';
import { IPCServer } from "../shared/types";
import * as Result from '@nkp/result';
import { Observable } from "rxjs";
import { Bus, ReadonlyBus } from "../shared/bus";
import * as _Events from '../shared/events'

export class Client {
  readonly events: ReadonlyBus<_Events.Kind>;
  readonly messages: ReadonlyBus<Comms.Kind>;

  constructor(
    protected readonly _events: Bus<_Events.Kind>,
    protected readonly _messages: Bus<Comms.Kind>,
    protected readonly _server: IPCServer,
    protected readonly _socket: Socket,
  ) {
    this.events = _events.toReadonly();
    this.messages = _messages.toReadonly();
    // _socket.on('message', this._handleMessagePacket);
    _socket.on('close', this._handleClose);
    _socket.on('data', this._handleData);
    _socket.on('drain', this._handleDrain);
    _socket.on('end', this._handleEnd);
    _socket.on('error', this._handleError);
    _socket.on('lookup', this._handleLookup);
    _socket.on('ready', this._handleReady);
    _socket.on('timeout', this._handleTimeout);
  }

  get messages$(): Observable<Comms.Kind> {
    return this.messages.stream$;
  }

  get event$(): Observable<_Events.Kind> {
    return this.events.stream$;
  }

  send(message: Comms.Kind): void {
    console.log('sending:', message.type);
    this._server.emit(this._socket, 'message', JSON.stringify(message));
  }

  dispose() {
    // this._socket.off('message', this._handleMessagePacket);
    this._socket.off('close', this._handleClose);
    this._socket.off('data', this._handleData);
    this._socket.off('drain', this._handleDrain);
    this._socket.off('end', this._handleEnd);
    this._socket.off('error', this._handleError);
    this._socket.off('lookup', this._handleLookup);
    this._socket.off('ready', this._handleReady);
    this._socket.off('timeout', this._handleTimeout);
    this._socket.destroy();
    this._messages.dispose();
    this._events.dispose();
  }

  protected readonly _handleMessagePacket = (packet: unknown) => {
    const parse = Comms.parse(packet);
    if (Result.isFail(parse)) {
      const fail = 'failed to parse client message: ';
      console.warn(fail, parse.value, packet);
      return;
    };
    const message = parse.value;
    console.log('client::on::message', message.type);
    this._messages.dispatch(message);
  }

  protected readonly _handleClose = (hadError: boolean) => {
    console.log(`client::on::close`, hadError);
    this._events.dispatch(Client.Events.close.create({ hadError }));
  }

  protected readonly _handleData = (buffer: Buffer) => {
    console.log('client::on::data');
    this._events.dispatch(Client.Events.data.create({ buffer }));
    this._handleMessagePacket(buffer);
  }

  protected readonly _handleDrain = () => {
    console.log('client::on::drain');
    this._events.dispatch(Client.Events.drain.create());
  }

  protected readonly _handleEnd = () => {
    console.log('client::on::drain');
    this._events.dispatch(Client.Events.end.create());
  }

  protected readonly _handleError = (err: Error) => {
    console.log('client::on::error');
    this._events.dispatch(Client.Events.err.create({ err }));
  }

  protected readonly _handleLookup = (err: Error, address: string, family: string | number, host: string) => {
    console.log('client::on::lookup');
    this._events.dispatch(Client.Events.lookup.create({
      err,
      address,
      family,
      host,
    }));
  }

  protected readonly _handleReady = () => {
    console.log('client::on::ready');
    this._events.dispatch(Client.Events.ready.create());
  }

  protected readonly _handleTimeout = () => {
    console.log('client::on::timeout');
    this._events.dispatch(Client.Events.timeout.create());
  }
}

export namespace Client {
  export namespace Events {
    export enum Type {
      CLOSE = 'CLIENT::EVENT::CLOSE',
      DATA = 'CLIENT::EVENT::DATA',
      DRAIN = 'CLIENT::EVENT::DRAIN',
      END = 'CLIENT::EVENT::END',
      ERR = 'CLIENT::EVENT::ERROR',
      LOOKUP = 'CLIENT::EVENT::LOOKUP',
      READY = 'CLIENT::EVENT::READY',
      TIMEOUT = 'CLIENT::EVENT::TIMEOUT',
    }

    export type ClosePayload = { hadError: boolean };
    export type Close = _Events.Kind<Type.CLOSE, ClosePayload>
    export const close = new _Events.Event<Close>(Type.CLOSE);

    export type DataPayload = { buffer: Buffer };
    export type Data = _Events.Kind<Type.DATA, DataPayload>
    export const data = new _Events.Event<Data>(Type.DATA);

    export type DrainPayload = void;
    export type Drain = _Events.Kind<Type.DRAIN, DrainPayload>
    export const drain = new _Events.Event<Drain>(Type.DRAIN);

    export type EndPayload = void;
    export type End = _Events.Kind<Type.END, EndPayload>
    export const end = new _Events.Event<End>(Type.END);

    export type ErrPayload = { err: Error };
    export type Err = _Events.Kind<Type.ERR, ErrPayload>
    export const err = new _Events.Event<Err>(Type.ERR);


    export type LookupPayload = {
      err: Error,
      address: string,
      family: string | number,
      host: string,
    };
    export type Lookup = _Events.Kind<Type.LOOKUP, LookupPayload>
    export const lookup = new _Events.Event<Lookup>(Type.LOOKUP);

    export type ReadyPayload = void;
    export type Ready = _Events.Kind<Type.READY, ReadyPayload>
    export const ready = new _Events.Event<Ready>(Type.READY);

    export type TimeoutPayload = void;
    export type Timeout = _Events.Kind<Type.TIMEOUT, TimeoutPayload>
    export const timeout = new _Events.Event<Timeout>(Type.TIMEOUT);
  }
}