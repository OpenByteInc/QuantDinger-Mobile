import assert from 'node:assert/strict'
import test from 'node:test'
import { formatFuturesPrice, futuresPriceDecimals } from '../../src/utils/futuresPricePrecision.js'
import { accountNumber, accountPrice } from '../../src/utils/accountDetail.js'

test('AUD futures hide float tails without losing the fifth decimal', () => {
  for (const symbol of ['6AZ26', '6AZ6', '6AZ2026', '6AZ26.CME', '6A=F', '6A', ' 6az26 ']) {
    for (const value of [0.66549999, Math.fround(0.6655), '0.66549999']) {
      assert.equal(formatFuturesPrice(value, 'Futures', symbol, 'en-US'), '0.66550')
    }
  }
  assert.equal(formatFuturesPrice(Math.fround(0.66555), 'Futures', '6AZ26', 'en-US'), '0.66555')
})

test('FX and micro index futures use contract precision rather than price magnitude', () => {
  for (const [symbol, value, expected, digits] of [
    ['6BZ26', 1.26789999, '1.2679', 4],
    ['6CZ26', Math.fround(0.71525), '0.71525', 5],
    ['6EZ26', Math.fround(1.05355), '1.05355', 5],
    ['6JZ26', Math.fround(0.0066555), '0.0066555', 7],
    ['6NZ26', Math.fround(0.58555), '0.58555', 5],
    ['6SZ26', Math.fround(1.13255), '1.13255', 5],
    ['MESZ26', 7314, '7,314.00', 2],
    ['MESZ26', 7314.5, '7,314.50', 2],
    ['MNQZ26', 26711.25, '26,711.25', 2]
  ]) {
    assert.equal(formatFuturesPrice(value, 'Futures', symbol, 'en-US'), expected)
    assert.equal(futuresPriceDecimals('futures', symbol), digits)
  }
})

test('unrecognized contracts, spreads and other markets keep their existing formatters', () => {
  for (const [market, symbol] of [
    ['Futures', 'UNKNOWNZ26'], ['Futures', '6AZ26-6AH27'], ['Futures', '6AZ26.OTHER'],
    ['Crypto', '6A/USDT'], ['USStock', 'MES'], ['HKStock', '03690'], ['', '6AZ26']
  ]) {
    assert.equal(formatFuturesPrice(0.12345678, market, symbol, 'en-US'), null)
    assert.equal(futuresPriceDecimals(market, symbol), null)
  }
})

test('display formatting is localized and never quantizes an order to a tick', () => {
  assert.equal(formatFuturesPrice(0.66549999, 'Futures', '6AZ26', 'de-DE'), '0,66550')
  assert.equal(formatFuturesPrice(7314.13, 'Futures', 'MESZ26', 'en-US'), '7,314.13')
  for (const value of [null, undefined, '', 'bad', NaN, Infinity]) {
    assert.equal(formatFuturesPrice(value, 'Futures', '6AZ26'), null)
  }
})

test('account quote precision does not change balances, quantities or missing values', () => {
  assert.equal(accountPrice(0.0066555, 'en-US', 'Futures', '6JZ26'), '0.0066555')
  assert.equal(accountPrice(1.05355, 'en-US', 'Futures', '6EZ26'), '1.05355')
  assert.equal(accountPrice(7314, 'en-US', 'Futures', 'MESZ26'), '7,314.00')
  assert.equal(accountPrice(24.5), '24.5')
  assert.equal(accountNumber(0.0066555, 8), '0.0066555')
  assert.equal(accountNumber(7314, 2), '7,314')
  for (const value of [null, '', 0, -1, 'bad', Infinity]) {
    assert.equal(accountPrice(value, 'en-US', 'Futures', '6JZ26'), '—')
  }
})
