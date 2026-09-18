export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fields?: Record<string, string> };

export const okResult = <T,>(data?: T, message?: string): ActionResult<T> => ({ ok: true, data, message });
export const failResult = (error: string, fields?: Record<string, string>): ActionResult<never> => ({ ok: false, error, fields });
