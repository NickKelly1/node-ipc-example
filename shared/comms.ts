import * as Result from '@nkp/result';
import { filter, first, firstValueFrom, Observable, Subject } from 'rxjs';
import { DataType, HasData, HasType, Isable, TypeKey } from './type';

export interface Kind<T extends TypeKey = TypeKey, D = unknown>
  extends HasType<T>,
  HasData<D>
{
  date: string;
}

export function is(unknown: unknown): unknown is Kind {
  // must be truthy
  if (!unknown) return false;
  // must be object
  if (typeof unknown !== 'object') return false;
  // must have `type`
  if (!['string', 'number'].includes(typeof (unknown as any).type))
    return false;
  // must have date
  if (typeof (unknown as any).date !== 'string') return false;
  // success
  return true;
}

export class Packet<M extends Kind> extends DataType<M> {
  constructor(type: M['type']) {
    super(type);
    this.create = this.create.bind(this);
  }

  create(data: M['data']) {
    const now = new Date();
    const date = now.toISOString();
    const packet: M = { type: this.type, data, date, } as M;
    return packet;
  }
}

export function parse(packet: unknown): Result.Result<Kind, string> {
  const packetResult = parsePacket(packet);
  return Result.isSuccess(packetResult)
    ? parseBase(packetResult.value.data)
    : parseBase(packet);
}

interface MessagePacket {
  type: 'message' | string;
  data: unknown;
}

function isMessagePacket(json: any): json is MessagePacket {
  if (json.type !== 'message') return false;
  if (!json.data) return false;
  return true;
}

function parsePacket(raw: unknown): Result.Result<MessagePacket, string> {
  let parseType = 'none';
  try {
    if (Buffer.isBuffer(raw)) {
      parseType = 'buffer';
      const string = raw.toString('utf8');
      const json = JSON.parse(string);
      if (!isMessagePacket(json)) {
        const fail = `failed to parse packet of type ${parseType}`;
        return Result.fail(fail);
      }
      return Result.success(json);
    } else if (raw && typeof raw === 'object') {
      parseType = 'object';
      const json = raw;
      if (!isMessagePacket(json)) {
        const fail = `failed to parse packet of type ${parseType}`;
        return Result.fail(fail);
      }
      return Result.success(json as MessagePacket);
    } else if (typeof raw === 'string') {
      parseType = 'string';
      const json = JSON.parse(raw.trim());
      if (!isMessagePacket(json)) {
        const fail = `failed to parse packet of type ${parseType}`;
        return Result.fail(fail);
      }
      return Result.success(json);
    }
  } catch (err: any) {
    const fail = `errored parsing packet of type ${parseType}: ${err?.name}, ${err?.message}`;
    return Result.fail(fail);
  }
  const fail = 'failed to parse packet: unexpected data type';
  return Result.fail(fail);
}

function parseBase(raw: unknown): Result.Result<Kind, string> {
  let parseType = 'none';
  try {
    if (Buffer.isBuffer(raw)) {
      parseType = 'buffer'; const string = raw.toString('utf8');
      const json = JSON.parse(string);
      if (!is(json)) {
        const fail = `failed to parse comm of type ${parseType}`;
        return Result.fail(fail);
      }
      return Result.success(json);
    } else if (raw && typeof raw === 'object') {
      parseType = 'object';
      const json = raw;
      if (!is(json)) {
        const fail = `failed to parse comm of type ${parseType}`;
        return Result.fail(fail);
      }
      return Result.success(json);
    } else if (typeof raw === 'string') {
      parseType = 'string';
      const json = JSON.parse(raw.trim());
      if (!is(json)) {
        const fail = `failed to parse comm of type ${parseType}`;
        return Result.fail(fail);
      }
      return Result.success(json);
    }
  } catch (err: any) {
    const fail = `errored parsing comm of type ${parseType}: ${err?.name}, ${err?.message}`;
    return Result.fail(fail);
  }
  const fail = `failed to parse comm of type ${typeof raw}: unexpected data type`;
  return Result.fail(fail);
}
