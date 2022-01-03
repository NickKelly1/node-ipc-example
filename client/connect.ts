import { firstValueFrom, race, timer } from "rxjs";
import { logger } from "../shared/logger";
import { Api } from "./api";
import { isErrConnRefused } from "./utils";

export async function connect(api: Api) {
  // wait for connection
  let connected = false;
  while (!connected) {
    const out = await firstValueFrom(await race([
      api.events.once(Api.Events.err),
      api.events.once(Api.Events.connect),
      timer(5_000),
    ]));

    if (out === 0) {
      logger.warn('timed out waiting for connection');
      const wait = 2_500; 
      logger.info(`waiting ${wait}ms...`)
      await new Promise((res) => setTimeout(res, wait));
    }

    else if (Api.Events.err.is(out)) {
      const err = out.data.err as any;
      if (!isErrConnRefused(err)) {
        logger.warn('unhandled error', err);
        process.exit(1);
      }
      logger.warn('connection refused, maybe connected to early');
      const wait = 2_500; 
      logger.info(`waiting ${wait}ms`);
      await new Promise((res) => setTimeout(res, wait));
    }

    else if (Api.Events.connect.is(out)) {
      connected = true;
    }

    else {
      logger.info('unexpected result: something went wrong', { out });
      process.exit(1);
    }
  }
}