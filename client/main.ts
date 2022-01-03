import NodeIPC, { IPC } from 'node-ipc';
import yargs from 'yargs';
import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import { Socket } from 'node:net';
import * as CtoS from '../shared/ctos';
import * as StoC from '../shared/stoc';
import * as Result from '@nkp/result';
import * as Comms from '../shared/comms';
import * as Events from '../shared/events';
import { IPCClient } from '../shared/types';
import { Bus } from '../shared/bus';
import { Api } from './api';
import { handleApiHandshake } from './handshake';
// import repl from 'node:repl';
import inquierer from 'inquirer';
import { BehaviorSubject, filter, firstValueFrom, race, Subject, Subscription, timeout, timer } from 'rxjs';


const ipc = new NodeIPC.IPC();
ipc.config.silent = true;
const ipcId = 'nick';
const ipcPath = path.join(process.cwd(), 'server.ipc');
// rl.on('line')

console.log('connecting...')
run();

function isErrConnRefused(unk: unknown): unk is Error {
  if (!unk) return false;
  if (typeof unk !== 'object') return false;
  if ((unk as any).code !== 'ECONNREFUSED') return false;
  return true;
}

async function awaitConnection(api: Api) {
  // wait for connection
  let connected = false;
  while (!connected) {
    const out = await firstValueFrom(await race([
      api.events.once(Api.Events.err),
      api.events.once(Api.Events.connect),
      timer(5_000),
    ]));

    if (out === 0) {
      console.warn('timed out waiting for connection');
      const wait = 2_500; 
      console.log(`waiting ${wait}ms...`)
      await new Promise((res) => setTimeout(res, wait));
    }

    else if (Api.Events.err.is(out)) {
      const err = out.data.err as any;
      if (!isErrConnRefused(err)) {
        console.warn('unhandled error', err);
        process.exit(1);
      }
      console.warn('connection refused, maybe connected to early');
      const wait = 2_500; 
      console.log(`waiting ${wait}ms`);
      await new Promise((res) => setTimeout(res, wait));
    }

    else if (Api.Events.connect.is(out)) {
      connected = true;
    }

    else {
      console.log('unexpected result: something went wrong', out);
      process.exit(1);
    }
  }
}

async function run() {
  console.log('connecting...');
  await new Promise<void>((res) => ipc.connectTo(ipcId, ipcPath, res));

  const client: IPCClient = ipc.of[ipcId];

  const message$ = new Subject<Comms.Kind>();
  const messages = new Bus<Comms.Kind>(message$);

  const event$ = new Subject<Events.Kind>();
  const events = new Bus<Events.Kind>(event$);

  const state$ = new BehaviorSubject<Api.State.Kind>(Api.State.idle.create());
  const state = new Bus<Api.State.Kind>(state$);

  const api = new Api(events, messages, state, client);

  await awaitConnection(api);

  // if we receive an error after we've got a connection
  // then hard panic
  api.events.on(Api.Events.err).subscribe((evt) => {
    const err = evt.data.err;
    if (!isErrConnRefused(err)) {
      console.log('unhandled Api error: ', err);
      console.log('exiting');
      process.exit(1);
    }
    // wait for reconnect attempt...
  });

  api.events.on(Api.Events.disconnect).subscribe(async () => {
    //
  });

  // if we reconnect wait for idle and then
  // attempt to handshake again
  let reconnecting = false;
  api.events.on(Api.Events.connect).subscribe(async () => {
    if (reconnecting) return;
    reconnecting = true;
    console.log('waiting to reconnect...');
    await firstValueFrom(api.state.on(Api.State.idle));
    console.log('reconnecting...');
    reconnecting = false;
    commenceHandshake(api);
  });

  commenceHandshake(api);
}

async function commenceHandshake(api: Api) {
  console.log('=======================');
  console.log('commencing handshake...');
  console.log('=======================');
  api.setState(Api.State.handshaking.create());

  const handshake = await handleApiHandshake(api, 'nick');
  if (Result.isFail(handshake)) {
    console.warn(`failed handshake: ${handshake.value}`);
    api.setState(Api.State.idle.create());
    return;
  }

  return handleConfirmed(handshake.value);
}

async function handleConfirmed(api: Api) {
  console.log('connected');
  api.setState(Api.State.active.create());

  const aborter = new AbortController();
  const subscriptions: Subscription[] = [
    api.events.once(Api.Events.disconnect).subscribe(handleDisconnect),
    api.messages.stream$.subscribe(handleComms),
  ];

  const rl = readline.createInterface(process.stdin, process.stdout);

  const pingterval = setInterval(() => {
    api.send(CtoS.ping.create());
  }, 12_500);

  function handleSendMessage(message: string) {
    console.log('sending message: ', message);
    api.send(CtoS.message.create({ message }));
  }

  function handleComms(comm: Comms.Kind) {
     if (StoC.ping.is(comm)) {
      api.send(CtoS.pong.create());
    }
    else if (StoC.pong.is(comm)) {
      // nothing
    }
    else {
      console.warn('unhandled server comm', comm);
    }   
  }

  function handleDisconnect(evt: Api.Events.Disconnect) {
    console.log('disconnected');
    aborter.abort();
    clearInterval(pingterval);
    subscriptions.forEach(sub => sub.unsubscribe());
    api.setState(Api.State.idle.create());
  }
}

// const prompt = inquierer.prompt(['hello', 'world']);
// const prompt = inquierer.createPromptModule();

// setInterval(() => console.log('burp'), 1000);

// prompt([
//   {
//     type: 'list',
//     name: 'theme',
//     message: 'what do you want to do?',
//     choices: [
//       'Order a pizza',
//       'Make a reservation',
//       new inquierer.Separator(),
//       'Ask for opening hours',
//       {
//         name: 'Contact support',
//         disabled: 'Unavailable at this time',
//       },
//       'Talk to the receptionist',
//     ]
//   },
// ])
//   .then((answers) => {
//     console.log('answer:', answers);
//   })
// ;
