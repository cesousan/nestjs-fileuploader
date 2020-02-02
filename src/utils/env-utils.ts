export const envStrToArray = (str: string) =>
  !!str && typeof str === 'string' ? str.split(',') : [];
