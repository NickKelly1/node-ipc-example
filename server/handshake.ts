import { server } from "node-ipc";
import { firstValueFrom, race, Subject, timer } from "rxjs";
import { Bus } from "../shared/bus";
import { Client } from "./client";
import { User } from "./user";
import * as CtoS from '../shared/ctos';
import * as StoC from '../shared/stoc';
import * as Comms from '../shared/comms';
import * as Result from '@nkp/result';
import { logger } from "../shared/logger";

export async function handleClientHandshake(
  client: Client,
  users: Map<string, User>
): Promise<Result.Result<User, string>> {
  client.send(StoC.handshakeRequest.create());

  const handshakeResponse = await firstValueFrom(race([
    client.messages.once(CtoS.handshake),
    client.events.once(Client.Events.close),
    // 5 seconds
    timer(5_000),
  ]));

  if (handshakeResponse === 0){ 
    const reason = 'handshake: client timed out';
    return Result.fail(reason);
  }
  if (Client.Events.close.is(handshakeResponse)) {
    const reason = 'handshake: client closed';
    return Result.fail(reason);
  }
  if (!CtoS.handshake.is(handshakeResponse)) {
    const reason = 'handshake: unexpected response';
    return Result.fail(reason);
  }

  const id = handshakeResponse.data.id;
  let user = users.get(id);
  if (!user) {
    const userMessage$ = new Subject<Comms.Kind>();
    const userMessages = new Bus<Comms.Kind>(userMessage$);
    user = new User(userMessages, users, server, id, client);
    logger.info(`new user connected: ${id}`);
    users.set(id, user);
  } else {
    user.addClient(client);
    logger.info(`user ${id} added a new connection ${user.connections}`);
  }
  client.send(StoC.handshakeConfirmed.create({ id: id }));

  return Result.success(user);
} 