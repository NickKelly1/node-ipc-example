import * as Comms from '../shared/comms';
import * as _Events from '../shared/events';
import * as Result from '@nkp/result';
import { Bus, ReadonlyBus } from "../shared/bus";
import { IPCClient } from '../shared/types';
import { Socket } from 'node:net';
import { DataType, HasData, HasType, TypeKey } from '../shared/type';

export class Api {
  readonly messages: ReadonlyBus<Comms.Kind>;
  readonly events: ReadonlyBus<_Events.Kind>;
  readonly state: ReadonlyBus<Api.State.Kind>;

  constructor(
    protected readonly _events: Bus<_Events.Kind>,
    protected readonly _messages: Bus<Comms.Kind>,
    protected readonly _state: Bus<Api.State.Kind>,
    protected readonly _client: IPCClient,
  ) {
    this.messages = _messages.toReadonly();
    this.events = _events.toReadonly();
    this.state = _state.toReadonly();
    this._client.on('message', this._handleMessage);
    this._client.on('connect', this._handleConnect);
    this._client.on('error', this._handleError);
    this._client.on('disconnect', this._handleDisconnect);
    this._client.on('destroy', this._handleDestroy);
    this._client.on('socket.disconnected', this._handleSocketDisconnect);
    this._client.on('data', this._handleData);
  }

  setState(state: Api.State.Kind): void {
    this._state.dispatch(state);
  }

  send(message: Comms.Kind) {
    console.log('sending:', message.type);
    this._client.emit('message', JSON.stringify(message));
  }

  dispose() {
    this._client.off('message', this._handleMessage);
    this._client.off('connect', this._handleConnect);
    this._client.off('error', this._handleError);
    this._client.off('disconnect', this._handleDisconnect);
    this._client.off('destroy', this._handleDestroy);
    this._client.off('socket.disconnected', this._handleSocketDisconnect);
    this._client.off('data', this._handleData);
    this._messages.dispose();
  }

  protected readonly _handleMessage = (raw: unknown) => {
    const parse = Comms.parse(raw);
    if (Result.isFail(parse)) {
      console.warn('failed to parse server comm: ', parse.value, raw);
      return;
    };
    const message = parse.value;
    console.log('api::on::message', message.type);
    this._messages.dispatch(message);
  }

  protected readonly _handleConnect = () => {
    console.log('api::on::connect');
    this._events.dispatch(Api.Events.connect.create());
  }

  protected readonly _handleError = (err: unknown) => {
    console.log('api::on::error', (err as any)?.name, (err as any)?.message);
    this._events.dispatch(Api.Events.err.create({ err }));
  }

  protected readonly _handleDisconnect = () => {
    console.log('api::on::disconnect');
    this._events.dispatch(Api.Events.disconnect.create());
  }

  protected readonly _handleDestroy = () => {
    console.log('api::on::destroy');
    this._events.dispatch(Api.Events.destroy.create());
  }

  protected readonly _handleSocketDisconnect = (
    socket: Socket,
    destroyedSocketID: string,
  ) => {
    console.log('api::on::socket_disconnect');
    this._events.dispatch(Api.Events.socketDisconnect.create({
      socket,
      destroyedSocketID,
    }));
  }

  protected readonly _handleData = (buffer: Buffer) => {
    console.log('api::on::data');
    this._events.dispatch(Api.Events.data.create({ buffer }));
  }

}

export namespace Api {
  export namespace State {
    export interface Kind<T extends TypeKey = TypeKey, D = unknown>
      extends HasType<T>, HasData<D> {}

    export enum Type {
      IDLE = 'API::STATE::IDLE',
      HANDSHAKING = 'API::STATE::HANDSHAKING',
      ACTIVE = 'API::STATE::ACTIVE',
    }

    export class Defn<S extends Kind> extends DataType<S> {
      constructor(type: S['type']) {
        super(type);
        this.create = this.create.bind(this);
      }

      create(data: S['data']): S {
        const packet: S = { type: this.type, data } as S;
        return packet;
      }
    }

    export type IdleData = void;
    export type Idle = _Events.Kind<Type.IDLE, IdleData>
    export const idle = new Defn<Idle>(Type.IDLE);

    export type HandshakingData = void;
    export type Handshaking = _Events.Kind<Type.HANDSHAKING, HandshakingData>
    export const handshaking = new Defn<Handshaking>(Type.HANDSHAKING);

    export type ActiveData = void;
    export type Active = _Events.Kind<Type.ACTIVE, ActiveData>
    export const active = new Defn<Active>(Type.ACTIVE);
  }

  export namespace Events {
    export enum Type {
      CONNECT = 'API::EVENT::CONNECT',
      ERR = 'API::EVENT::ERR',
      DISCONNECT = 'API::EVENT::DISCONNECT',
      DESTROY = 'API::EVENT::DESTROY',
      SOCKET_DISCONNECT = 'API::EVENT::SOCKET_DISCONNECT',
      DATA = 'API::EVENT::DATA',
    }

    export type ConnectPayload = void;
    export type Connect = _Events.Kind<Type.CONNECT, ConnectPayload>
    export const connect = new _Events.Event<Connect>(Type.CONNECT);

    export type ErrPayload = { err: unknown };
    export type Err = _Events.Kind<Type.ERR, ErrPayload>
    export const err = new _Events.Event<Err>(Type.ERR);

    export type DisconnectPayload = void;
    export type Disconnect = _Events.Kind<Type.DISCONNECT, DisconnectPayload>
    export const disconnect = new _Events.Event<Disconnect>(Type.DISCONNECT);

    export type DestroyPayload = void;
    export type Destroy = _Events.Kind<Type.DESTROY, DestroyPayload>
    export const destroy = new _Events.Event<Destroy>(Type.DESTROY);

    export type SocketDisconnectPayload = {
      socket: Socket,
      destroyedSocketID: string
    };
    export type SocketDisconnect = _Events.Kind<Type.SOCKET_DISCONNECT, SocketDisconnectPayload>
    export const socketDisconnect = new _Events.Event<SocketDisconnect>(Type.SOCKET_DISCONNECT);

  export type DataPayload = { buffer: Buffer };
    export type Data = _Events.Kind<Type.DATA, DataPayload>
    export const data = new _Events.Event<Data>(Type.DATA);
  }
}