import Pino from 'pino';
import { logger, ObservableLogger } from '../shared/logger';
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
import { connect } from './connect';
import { isErrConnRefused } from './utils';

process.on('uncaughtException', handleUncaughtException);

// initialise ipc
const ipc = new NodeIPC.IPC();
ipc.config.silent = true;
const ipcId = 'nick';
const ipcPath = path.join(process.cwd(), 'server.ipc');

logger.info('connecting...')
run();

async function run() {
  // connect socket
  logger.info('connecting...');
  await new Promise<void>((res) => ipc.connectTo(ipcId, ipcPath, res));
  const client: IPCClient = ipc.of[ipcId];
  const message$ = new Subject<Comms.Kind>();
  const messages = new Bus<Comms.Kind>(message$);
  const event$ = new Subject<Events.Kind>();
  const events = new Bus<Events.Kind>(event$);
  const state$ = new BehaviorSubject<Api.State.Kind>(Api.State.idle.create());
  const state = new Bus<Api.State.Kind>(state$);
  const api = new Api(events, messages, state, client);
  await connect(api);

  // panic on unexpected errors
  api.events.on(Api.Events.err).subscribe((evt) => {
    const err = evt.data.err;
    if (!isErrConnRefused(err)) {
      logger.info('unhandled Api error: ', err);
      logger.info('exiting');
      process.exit(1);
    }
    // wait for reconnect attempt...
  });

  // wait for idle before reconnecting
  let reconnecting = false;
  api.events.on(Api.Events.connect).subscribe(async () => {
    if (reconnecting) return;
    reconnecting = true;
    logger.info('waiting to reconnect...');
    await firstValueFrom(api.state.on(Api.State.idle));
    api.id = undefined;
    logger.info('reconnecting...');
    reconnecting = false;
    commenceHandshake(api);
  });

  commenceHandshake(api);
}

async function commenceHandshake(api: Api) {
  logger.info('=======================');
  logger.info('commencing handshake...');
  logger.info('=======================');
  api.setState(Api.State.handshaking.create());

  const handshake = await handleApiHandshake(api, 'nick');
  if (Result.isFail(handshake)) {
    logger.warn(`failed handshake: ${handshake.value}`);
    api.setState(Api.State.idle.create());
    return;
  }

  return handleConfirmed(handshake.value);
}

async function handleConfirmed(api: Api) {
  logger.info('connected');
  api.setState(Api.State.active.create());

  const aborter = new AbortController();
  const subscriptions: Subscription[] = [
    api.events.once(Api.Events.disconnect).subscribe(handleDisconnect),
    api.messages.stream$.subscribe(handleComms),
  ];

  const pingterval = setInterval(() => {
    api.send(CtoS.ping.create());
  }, 12_500);

  // const rl = readline.createInterface(process.stdin, process.stdout);

  // askQuestion();

  // function askQuestion() {
  //   rl.question('>> message: ', handleSendMessage);
  // }

  // function handleAnswer(answer: string) {
  //   handleSendMessage(answer.trim());
  // }

  // function handleSendMessage(message: string) {
  //   logger.info('sending message: ', message);
  //   api.send(CtoS.message.create({ message }));
  //   askQuestion();
  // }

  function handleComms(comm: Comms.Kind) {
     if (StoC.ping.is(comm)) {
      api.send(CtoS.pong.create());
    }
    else if (StoC.pong.is(comm)) {
      // nothing
    }
    else {
      logger.warn('unhandled server comm', comm);
    }   
  }

  function handleDisconnect(evt: Api.Events.Disconnect) {
    logger.info('disconnected');
    aborter.abort();
    clearInterval(pingterval);
    subscriptions.forEach(sub => sub.unsubscribe());
    api.setState(Api.State.idle.create());
  }
}


// process.stdin.on('keypress', () => {
//   logger.info('whata?');
// });
// setInterval(() => process.stdout.clearLine(-1), 500);

// const prompt = inquierer.prompt(['hello', 'world']);
// const prompt = inquierer.createPromptModule();

// setInterval(() => logger.info('burp'), 1000);

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
//     logger.info('answer:', answers);
//   })
// ;


function handleUncaughtException(err: Error, origin: 'uncaughtException' | 'unhandledRejection') {
  logger.error('uncaughtException', origin, err);
  process.exit();
}
