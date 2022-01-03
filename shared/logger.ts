import Pino from 'pino';
import { map, merge, mergeAll, Observable, Subject } from 'rxjs';
import util from 'node:util';

// over-the-top logging

export interface ILogger{
  silent: boolean;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

export enum Level {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class ConsoleLogger implements ILogger {
  silent: boolean = false;
  debug(...args: any[]): void {
    if (!this.silent) console.debug(...args);
  }
  info(...args: any[]): void {
    if (!this.silent) console.info(...args);
  }
  warn(...args: any[]): void {
    if (!this.silent) console.warn(...args);
  }
  error(...args: any[]): void {
    if (!this.silent) console.error(...args);
  }
}

export class ObservableLogger implements ILogger {
  silent: boolean = false;
  public log$: Observable<{ level: Level, args: any[] }>
  public debug$: Observable<any[]>;
  public info$: Observable<any[]>;
  public warn$: Observable<any[]>;
  public error$: Observable<any[]>;

  constructor(
    protected readonly _debug$ = new Subject<any[]>(),
    protected readonly _info$ = new Subject<any[]>(),
    protected readonly _warn$ = new Subject<any[]>(),
    protected readonly _error$ = new Subject<any[]>(),
  ) {
    this.debug$ = this._debug$.asObservable();
    this.info$ = this._info$.asObservable();
    this.warn$ = this._warn$.asObservable();
    this.error$ = this._error$.asObservable();
    this.log$ = merge(
      this.debug$.pipe(map((args) => ({ level: Level.DEBUG, args }))),
      this.info$.pipe(map((args) => ({ level: Level.INFO, args }))),
      this.warn$.pipe(map((args) => ({ level: Level.WARN, args }))),
      this.error$.pipe(map((args) => ({ level: Level.ERROR, args }))),
    );
  }

  debug(...args: any[]): void {
    if (!this.silent) this._debug$.next(args);
  }

  info(...args: any[]): void {
    if (!this.silent) this._info$.next(args);
  }

  warn(...args: any[]): void {
    if (!this.silent) this._warn$.next(args);
  }

  error(...args: any[]): void {
    if (!this.silent) this._error$.next(args);
  }
}

const pino = Pino();
export const logger = new ObservableLogger();
logger.debug$.subscribe(args => pino.debug(args[0], ...args.slice(1, -1)));
logger.info$.subscribe(args => pino.info(args[0], ...args.slice(1, -1)));
logger.warn$.subscribe(args => pino.warn(args[0], ...args.slice(1, -1)));
logger.error$.subscribe(args => pino.error(args[0], ...args.slice(1, -1)));


// const logger = pino({
//   mixin

// });

// logger.child()
