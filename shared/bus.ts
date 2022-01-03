import { filter, first, firstValueFrom, Observable, Subject, take } from "rxjs";
import { HasType, Isable } from "./type";

export class Bus<T extends HasType = HasType> {
  public $stream: Observable<T>;

  constructor(
    protected readonly _subject$: Subject<T>
  ) {
    this.$stream = this._subject$.asObservable();
  }

  readonly dispatch = (payload: T): void => {
    this._subject$.next(payload);
  }

  on<U extends T>(dataType: Isable<U>): Observable<U> {
    return this.$stream.pipe(filter(dataType.is));
  }

  once<U extends T>(dataType: Isable<U>): Observable<U> {
    return this.$stream.pipe(filter(dataType.is), take(1));
  }

  next<U extends T>(dataType: Isable<U>): Promise<U> {
    return firstValueFrom(this.once(dataType));
  }

  toReadonly(): ReadonlyBus<T> {
    return new ReadonlyBus(this);
  }

  dispose() {
    this._subject$.complete();
  }
}

export class ReadonlyBus<T extends HasType = HasType> {
  readonly stream$: Observable<T>;

  constructor(protected readonly _bus: Bus<T>) {
    this.stream$ = _bus.$stream;
  }

  on<U extends T>(dataType: Isable<U>): Observable<U> {
    return this._bus.on(dataType);
  }

  once<U extends T>(dataType: Isable<U>): Observable<U> {
    return this._bus.once(dataType);
  }

  next<U extends T>(dataType: Isable<U>): Promise<U> {
    return this._bus.next(dataType);
  }
}