import ms, { StringValue } from 'ms'

export function sec(text: StringValue): number {
  return ms(text) / 1000
}
