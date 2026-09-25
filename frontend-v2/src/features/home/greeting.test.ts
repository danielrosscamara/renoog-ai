import { describe, expect, it } from 'vitest'
import { greeting } from './greeting'

const at = (hour: number, minute = 0) => new Date(2026, 9, 14, hour, minute)

describe('greeting', () => {
  it('says good morning from 5:00 to 11:59', () => {
    expect(greeting(at(5))).toBe('Good morning')
    expect(greeting(at(11, 59))).toBe('Good morning')
  })

  it('says good afternoon from 12:00 to 17:59', () => {
    expect(greeting(at(12))).toBe('Good afternoon')
    expect(greeting(at(17, 59))).toBe('Good afternoon')
  })

  it('says good evening from 18:00 through the night to 4:59', () => {
    expect(greeting(at(18))).toBe('Good evening')
    expect(greeting(at(23, 30))).toBe('Good evening')
    expect(greeting(at(0))).toBe('Good evening')
    expect(greeting(at(4, 59))).toBe('Good evening')
  })
})
