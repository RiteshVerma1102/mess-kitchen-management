/** Money is computed in integer paise to avoid float drift, then returned as rupees. */
export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const fromPaise = (paise: number) => paise / 100;
/** Round a rupee amount to the nearest paisa (half away from zero). */
export const roundRupees = (rupees: number) =>
  (Math.sign(rupees) * Math.round(Math.abs(rupees) * 100 + Number.EPSILON)) / 100;
