const moment = require('moment')
require('moment-precise-range-plugin')
const assert = require('assert')
const chalk = require('chalk')
const byteSize = require('byte-size')
class ProgressBar {

  constructor(options) {

    this.reset()

    // Load default colors
    if (options && options.colors) {
      this.options.colors = { ...this.options.colors, ...options.colors }
      delete options.colors
    }

    // Load other defaults
    this.options = { ...this.options, ...options }

    ProgressBar._assert(Number.isInteger(this.options.width) && this.options.width > 0, 'width', this.options.width, 'should be integer > 1')
    ProgressBar._assert(Number.isInteger(this.options.total) && this.options.total > 1, 'total', this.options.total, 'should be integer > 1')
    ProgressBar._assert(Number.isInteger(this.options.fps) && this.options.fps >= 1, 'fps', this.options.fps, 'should be integer >= 1')
    ProgressBar._assert(typeof this.options.inplace === 'boolean', 'inplace', this.options.inplace, 'should be boolean')
    ProgressBar._assert(this.options.format === 'bytes' || this.options.format === 'number', 'format', this.options.format, 'should be one of: number, bytes')
    ProgressBar._assert(typeof this.options.colors.percent === 'function', 'colors.percent', typeof this.options.colors.percent, 'should be a chalk function')
    ProgressBar._assert(typeof this.options.colors.pending === 'function', 'colors.pending', typeof this.options.colors.pending, 'should be a chalk function')
    ProgressBar._assert(typeof this.options.colors.completed === 'function', 'colors.completed', typeof this.options.colors.completed, 'should be a chalk function')
    ProgressBar._assert(typeof this.options.colors.records === 'function', 'colors.records', typeof this.options.colors.records, 'should be a chalk function')
    ProgressBar._assert(typeof this.options.colors.remaining === 'function', 'colors.remaining', typeof this.options.colors.remaining, 'should be a chalk function')
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
    this.update = true

    this.options = {
      total: null,
      inplace: true,
      width: 60,
      format: 'number',
      completed: '█',
      pending: '░',
      termtitle: true,
      fps: 25,
      colors: {
        percent: chalk.white.bold,
        completed: chalk.rgb(204, 0, 153).bold,
        pending: chalk.rgb(100, 100, 100).bold,
        records: chalk.white,
        remaining: chalk.rgb(150, 150, 150)
      }
    }

  }

  show({ currentRecord }) {

    if (currentRecord >= this.options.total) {
      this.timeRemaining = `(total time: ${ProgressBar._formatDiff(moment.preciseDiff(moment(), this.totalStartTime))})\n`
      this.update = true
    }

    ProgressBar._assert(Number.isInteger(currentRecord) && currentRecord >= 1, 'currentRecord', currentRecord, 'should be integer >= 1. If you are using currentRecord in iteration, add one to it (ie. currentRecord: i + 1)')
    ProgressBar._assert(this.options.total >= currentRecord, 'total', this.options.total, 'should be integer >= currentRecord')

    if (this.currentRecord === false) {
      this._startMeasuring({ currentRecord: currentRecord })
    }

    if (currentRecord < this.currentRecord) {
      return
    }
    this.currentRecord = currentRecord

    if (false === this.update) {
      return
    }
    this.update = false

    let percent = Math.round(currentRecord / this.options.total * 100)
    percent = percent > 100 ? 100 : percent

    const dLen = Math.floor(this.options.width / 100 * percent)
    const dashes = this.options.colors.completed(this.options.completed.repeat(dLen))
    let fill = ''

    if (this.options.width - Math.floor(this.options.width / 100 * percent) > 0) {
      fill = this.options.colors.pending(this.options.pending.repeat(this.options.width - dLen))
    }

    let extra = ' '
    if (percent < 10 && percent < 100) {
      extra = '  '
    }
    else if (percent >= 100) {
      extra = ''
    }

    let tmpCurrentRecord = currentRecord
    let tmpTotal = this.options.total

    if (this.options.format === 'bytes') {
      tmpCurrentRecord = byteSize(this.currentRecord)
      tmpTotal = byteSize(this.options.total)
    }

    let out = `${this.options.colors.percent(`${percent}%`)}${extra} ${dashes}${fill} ${this.options.colors.records(`${tmpCurrentRecord} of ${tmpTotal}`)} ${this.options.colors.remaining(this.timeRemaining)}`

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

    if (this.options.termtitle === true) {
      const title = `${percent}% - ${tmpCurrentRecord} of ${tmpTotal} ${this.timeRemaining}`
      process.stdout.write(`\x1b]2;${title}\x1b\x5c`)
      process.title = title
    }
  }

  _startMeasuring({ currentRecord }) {
    clearInterval(this.measureInterval)
    this.totalStartTime = moment()
    this.measureCurrentRecord = currentRecord
    this.measureTime = moment()

    const intervalTime = 1000

    this.measureInterval = setInterval(this._measure.bind(this), intervalTime)

    setInterval(this._update.bind(this), 1000 / this.options.fps)
  }

  _update () {
    this.update = true
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
      let avg = ProgressBar._average(this.recordsBetween)
      this.recordsBetween.push(avg)
      this.recordsBetween = this.recordsBetween.slice(-divider)
    }

    const msToFinish = Math.round((timeDiff / ProgressBar._average(this.recordsBetween)) * (this.options.total - this.currentRecord))
    const timeLeftHuman = ProgressBar._formatDiff(moment.preciseDiff(moment(), moment().add(msToFinish, 'ms')))

    this.timeRemaining = timeLeftHuman ? `(${timeLeftHuman} left)` : ''
  }

  static _formatDiff(diff) {
    return diff.replace(/\sseconds?/, 's').replace(/\shours?/, 'h').replace(/\sminutes?/, 'm')
  }

  static _average(ar) {
    return ar.reduce((acc, c) => acc + c, 0) / ar.length
  }

  static _assert(cond, name, value, message) {
    assert(cond, `Argument ${chalk.magenta.bold(name)} (is ${chalk.blue.bold(value)}) ${chalk.yellow(message)}`)
  }

}

module.exports = ProgressBar