export type Result<T, E> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E> {
  readonly ok: false;
  readonly error: E;
}

export const success = <T>(value: T): Success<T> => ({ ok: true, value });

export const failure = <E>(error: E): Failure<E> => ({ ok: false, error });

export async function fromPromise<T, E = unknown>(
  operation: () => Promise<T>,
): Promise<Result<T, E>> {
  try {
    return success(await operation());
  } catch (error) {
    return failure(error as E);
  }
}
