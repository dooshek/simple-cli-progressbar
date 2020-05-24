const moment = require('moment')
require('moment-precise-range-plugin')
const assert = require('assert')
const chalk = require('chalk')
const byteSize = require('byte-size')
class SimpleProgressBar {

  constructor(options) {

    this.reset()

    // Load default colors
    if (options && options.colors) {
      this.options.colors = { ...this.options.colors, ...options.colors }
      delete options.colors
    }

    // Load other defaults
    this.options = { ...this.options, ...options }

    SimpleProgressBar._assert(Number.isInteger(this.options.width) && this.options.width > 0, 'width', this.options.width, 'should be integer > 1')
    SimpleProgressBar._assert(Number.isInteger(this.options.records) && this.options.records > 1, 'records', this.options.records, 'should be integer greather > 1')
    SimpleProgressBar._assert(typeof this.options.inplace === 'boolean', 'inplace', this.options.inplace, 'should be boolean')
    SimpleProgressBar._assert(this.options.format === 'bytes' || this.options.format === 'number', 'format', this.options.format, 'should be one of: number, bytes')
    SimpleProgressBar._assert(typeof this.options.colors.percent === 'function', 'colors.percent', typeof this.options.colors.percent, 'should be a chalk function')
    SimpleProgressBar._assert(typeof this.options.colors.fill === 'function', 'colors.fill', typeof this.options.colors.fill, 'should be a chalk function')
    SimpleProgressBar._assert(typeof this.options.colors.records === 'function', 'colors.records', typeof this.options.colors.records, 'should be a chalk function')
    SimpleProgressBar._assert(typeof this.options.colors.remaining === 'function', 'colors.remaining', typeof this.options.colors.remaining, 'should be a chalk function')
  }

  reset() {

    this.recordsBetween = []
    this.currentRecord = false
    this.measureCurrentRecord = null
    this.measureTime = null
    this.totalStartTime = null
    this.measureInterval = null
    this.timeRemaining = ''
    this.maxOutLen = 0

    this.options = {
      records: null,
      inplace: true,
      width: 60,
      format: 'number',
      colors: {
        percent: chalk.white.bold,
        fill: chalk.rgb(204, 0, 153).bold,
        records: chalk.white,
        remaining: chalk.rgb(150, 150, 150)
      }
    }

  }

  show({ currentRecord }) {

    SimpleProgressBar._assert(Number.isInteger(currentRecord) && currentRecord >= 1, 'currentRecord', currentRecord, 'should be integer >= 1. If you are using currentRecord in iteration, add one to it (ie. currentRecord: i + 1)')
    SimpleProgressBar._assert(this.options.records >= currentRecord, 'records', this.options.records, 'should be integer >= currentRecord')

    if (this.currentRecord === false) {
      this._startMeasuring({ currentRecord: currentRecord })
    }

    if (currentRecord < this.currentRecord) {
      return
    }
    this.currentRecord = currentRecord

    let percent = Math.round(currentRecord / this.options.records * 100)
    percent = percent > 100 ? 100 : percent

    const dashes = '—'.repeat(Math.floor(this.options.width / 100 * percent))
    let fill = ''

    if (this.options.width - Math.floor(this.options.width / 100 * percent) > 0) {
      fill = ' '.repeat(this.options.width - dashes.length)
    }

    let extra = ' '
    if (percent < 10 && percent < 100) {
      extra = '  '
    }
    else if (percent >= 100) {
      extra = ''
    }

    let tmpCurrentRecord = currentRecord
    let tmpRecords = this.options.records

    if (this.options.format === 'bytes') {
      tmpCurrentRecord = byteSize(this.currentRecord)
      tmpRecords = byteSize(this.options.records)
    }

    if (currentRecord >= this.options.records) {
      this.timeRemaining = `(total time: ${SimpleProgressBar._formatDiff(moment.preciseDiff(moment(), this.totalStartTime))})\n`
    }

    let out = `${this.options.colors.percent(`${percent}%`)}${extra} ${this.options.colors.fill(`[${dashes}${fill}]`)} ${this.options.colors.records(`${tmpCurrentRecord} of ${tmpRecords}`)} ${this.options.colors.remaining(this.timeRemaining)}`

    if (this.maxOutLen > out.length) {
      out = `${out} ${' '.repeat(this.maxOutLen - out.length - 1)}`
    }
    this.maxOutLen = out.length

    if (this.options.inplace === true) {
      process.stdout.write(`\r${out}`)
    }
    else {
      process.stdout.write(`${out}\n`)
    }
  }

  _startMeasuring({ currentRecord }) {
    clearInterval(this.measureInterval)
    this.totalStartTime = moment()
    this.measureCurrentRecord = currentRecord
    this.measureTime = moment()

    const intervalTime = 500

    this.measureInterval = setInterval(this._measure.bind(this), intervalTime)
  }

  _measure() {

    let currentTime = moment()
    let recordsDiff = this.currentRecord - this.measureCurrentRecord
    let timeDiff = currentTime.diff(this.measureTime)
    this.measureCurrentRecord = this.currentRecord
    this.measureTime = currentTime

    this.recordsBetween.push(recordsDiff)

    const divider = 500

    // Keep last n run times in memory for calculating remaining time
    if (this.recordsBetween.length > divider) {
      let avg = SimpleProgressBar._average(this.recordsBetween)
      this.recordsBetween.push(avg)
      this.recordsBetween = this.recordsBetween.slice(-divider)
    }

    const msToFinish = Math.round((timeDiff / SimpleProgressBar._average(this.recordsBetween)) * (this.options.records - this.currentRecord))
    const timeLeftHuman = SimpleProgressBar._formatDiff(moment.preciseDiff(moment(), moment().add(msToFinish, 'ms')))

    this.timeRemaining = timeLeftHuman ? `(${timeLeftHuman} left)` : ''
  }

  static _formatDiff(diff) {
    return diff.replace(/\sseconds?/, 's').replace(/\shours?/, 'h').replace(/\sminutes?/, 'm')
  }

  static _average(ar) {
    const total = ar.reduce((acc, c) => acc + c, 0);
    return total / ar.length;
  }

  static _assert(cond, name, value, message) {
    assert(cond, `Argument ${chalk.magenta.bold(name)} (is ${chalk.blue.bold(value)}) ${chalk.yellow(message)}`)
  }

}

module.exports = SimpleProgressBar