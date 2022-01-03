import { DataType, HasData, HasType, TypeKey } from "./type";

export interface Kind<T extends TypeKey = TypeKey, D = unknown>
  extends HasType<T>, HasData<D> {
  date: Date;
}

export class Event<E extends Kind> extends DataType<E> {
  constructor(type: E['type']) {
    super(type);
    this.create = this.create.bind(this);
  }

  create(data: E['data']) {
    const now = new Date();
    const packet = { type: this.type, data, date: now, } as E;
    return packet;
  }
}
