import { firstValueFrom, race, timer } from "rxjs";
import { Bus } from "../shared/bus";
import { IPCClient } from "../shared/types";
import { Api } from "./api";
import * as Comms from '../shared/comms';
import * as Events from '../shared/events';
import * as StoC from '../shared/stoc';
import * as CtoS from '../shared/ctos';
import * as Result from '@nkp/result';

export async function handleApiHandshake(
  api: Api,
  clientId: string,
): Promise<Result.Result<Api, string>> {
  const handshakeRequestResponse = await firstValueFrom(race([
    api.messages.once(StoC.handshakeRequest),
    api.events.once(Api.Events.disconnect),
    // 5 seconds
    timer(5_000),
  ]))

  if (handshakeRequestResponse === 0){ 
    const reason = 'wait handshake request: client timed out'; 
    return Result.fail(reason);
  }
  if (Api.Events.disconnect.is(handshakeRequestResponse)) {
    const reason = 'wait handshake request: client closed';
    return Result.fail(reason);
  }
  if (!StoC.handshakeRequest.is(handshakeRequestResponse)) {
    const reason = 'wait handshake request: unknown message';
    return Result.fail(reason);
  }

  api.send(CtoS.handshake.create({ id: clientId }));

  const handshakeConfirmedResponse = await firstValueFrom(race([
    api.messages.once(StoC.handshakeConfirmed),
    api.events.once(Api.Events.disconnect),
    // 5 seconds
    timer(5_000),
  ]))

  if (handshakeConfirmedResponse === 0){ 
    const reason = 'wait handshake confirmed: client timed out';
    return Result.fail(reason);
  }
  if (Api.Events.disconnect.is(handshakeConfirmedResponse)) {
    const reason = 'wait handshake confirmed: client closed';
    return Result.fail(reason)
  }
  if (!StoC.handshakeConfirmed.is(handshakeConfirmedResponse)) {
    const reason = 'wait handshake confirmed: unknown message';
    return Result.fail(reason);
  }

  const id = handshakeConfirmedResponse.data.id;

  api.id = id;

  return Result.success(api);
}