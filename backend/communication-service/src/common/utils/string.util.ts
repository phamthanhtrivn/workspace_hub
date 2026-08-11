export const decodeHeaderUtf8 = (val: string): string => {
  if (!val) return val;
  return Buffer.from(val, 'latin1').toString('utf8');
};
