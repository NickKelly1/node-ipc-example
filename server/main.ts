import fs from 'node:fs';
import { LinkedList } from '@nkp/linked-list';
import Ipc from 'node-ipc';
import path from 'node:path';
import { Socket } from 'node:net';
import * as CtoS from '../shared/ctos';
import * as StoC from '../shared/stoc';
import * as Comms from '../shared/comms';
import * as Events from '../shared/events';
import * as Result from '@nkp/result';
import { IPCServer } from '../shared/types';
import { User } from './user';
import { Client } from './client';
import { Bus } from '../shared/bus';
import { handleClientHandshake } from './handshake';
import { Subject, Subscriber, Subscription } from 'rxjs';

const ipc = new Ipc.IPC();
ipc.config.silent = true;
const ipcPath = path.join(process.cwd(), 'server.ipc');
ipc.serve(ipcPath, handleServerStarted);
const server: IPCServer = ipc.server;

server.on('connect', handleConnect);
process.on('exit', handleProcessExit);

console.log('starting server...');
server.start();

const users = new Map<string, User>();

let connections = 0;

async function handleConnect(socket: Socket) {
  connections += 1;
  console.log('===========================');
  console.log(`connection ${connections}`);
  console.log('===========================');
  socket.once('close', () => {
    connections -= 1;
    console.log(`disconnection ${connections}`);
  });
  // request & confirm handshake
  const event$ = new Subject<Events.Kind>();
  const events = new Bus<Events.Kind>(event$);
  const message$ = new Subject<Comms.Kind>();
  const messages = new Bus<Comms.Kind>(message$);
  const client = new Client(events, messages, server, socket);

  const result = await handleClientHandshake(client, users);
  if (Result.isFail(result)) {
    console.warn(`failed handshake: ${result.value}`);
    client.dispose();
    return;
  }

  const user: User = result.value;

  handleHandshakeConfirmed(user, client);
}

function handleHandshakeConfirmed(user: User, client: Client) {
  const pingterval = setInterval(() => {
    client.send(StoC.ping.create());
  }, 20_000);

  const subscriptions: Subscription[] = [
    client.messages$.subscribe(handleComm),
    client.events.once(Client.Events.close).subscribe(handleClose),
  ];

  function handleClose() {
    clearInterval(pingterval);
    subscriptions.forEach(sub => sub.unsubscribe());
    user.removeClient(client);
  }

  function handleComm(comm: Comms.Kind) {
    if (CtoS.ping.is(comm)) {
      client.send(StoC.pong.create());
    }

    else if (CtoS.pong.is(comm)) {
      //
    }

    else if (CtoS.message.is(comm)) {
      console.log(`message: ${comm.data.message}`);
    }

    else {
      console.warn('unhandled client message', comm);
    }
  }
}

function handleServerStarted () {
  console.log('serving');
}

function handleProcessExit() {
  console.log('exiting');
}
