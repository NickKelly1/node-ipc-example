export type TypeKey = string | number;
export interface HasType<T extends TypeKey = TypeKey> {
  readonly type: T;
}

export interface HasData<D = unknown> {
  readonly data: D;
}

export interface Isable<T extends HasType> {
  is(has: HasType): has is T;
}

export abstract class DataType<T extends HasType> implements Isable<T> {
  constructor(public readonly type: T['type']) {
    this.is = this.is.bind(this);
  }
  is(has: HasType): has is T {
    return has.type === this.type;
  }
}
