import { IPCServer } from "../shared/types";
import * as Comms from '../shared/comms';
import { Client } from "./client";
import { Observable, Subscription } from "rxjs";
import assert from 'node:assert'
import { Bus, ReadonlyBus } from "../shared/bus";

export class User {
  public messages: ReadonlyBus<Comms.Kind>;
  get name(): string { return this._name ?? 'anonymous'; }
  set name(name: string) { this._name = name; }
  protected _name: undefined | string;
  protected readonly _clients: Map<Client, Subscription>;
  protected _timeoutTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    protected readonly _messages: Bus<Comms.Kind>,
    protected readonly _users: Map<string, User>,
    protected readonly _server: IPCServer,
    protected readonly _id: string,
    client: Client,
  ) {
    this.messages = _messages.toReadonly();
    const subscription = client.messages$.subscribe(this._messages.dispatch);
    this._clients = new Map([[client, subscription]]);
  }

  send(comm: Comms.Kind): void {
    for (const client of this._clients.keys()) {
      client.send(comm);
    }
  }

  on<M extends Comms.Kind>(comm: Comms.Packet<M>): Observable<M> {
    return this._messages.on(comm);
  }

  once<M extends Comms.Kind>(comm: Comms.Packet<M>): Observable<M> {
    return this._messages.once(comm);
  }

  next<M extends Comms.Kind>(comm: Comms.Packet<M>): Promise<M> {
    return this._messages.next(comm);
  }

  get connections(): number {
    return this._clients.size;
  }

  addClient(client: Client) {
    if (this._timeoutTimer != null) {
      clearTimeout(this._timeoutTimer!);
    }
    if (this._clients.has(client)) return;
    const subscription = client.messages$.subscribe(this._messages.dispatch);
    this._clients.set(client, subscription);
  }

  removeClient(client: Client) {
    if (!this._clients.has(client)) return;
    const subscription = this._clients.get(client)!;
    subscription.unsubscribe();
    this._clients.delete(client);
    client.dispose();
    if (this._clients.size === 0) this._timebomb();
  }

  dispose() {
    const clients = Array.from(this._clients.keys());
    for (const client of clients) {
      this.removeClient(client);
    }
    assert(this._clients.size === 0);
    this._users.delete(this._id);
    this._messages.dispose();
  }

  protected _timebomb() {
    if (this._timeoutTimer != null) return;
    this._timeoutTimer = setTimeout(() => { this._timeout(); }, 5_000);
  }

  protected _timeout() {
    console.warn(`session timed out: ${this._id}`);
    this.dispose();
  }
}