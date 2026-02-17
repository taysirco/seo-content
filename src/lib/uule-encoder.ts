export function encodeUULE(lat: number, lng: number): string {
  const coordString = `${lat.toFixed(7)},${lng.toFixed(7)}`;
  const lengthChar = String.fromCharCode(32 + coordString.length);
  const encoded = Buffer.from(`${lengthChar}${coordString}`).toString('base64');
  return `w+CAIQICI${encoded}`;
}
