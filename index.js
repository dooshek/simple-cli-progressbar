const moment = require('moment')
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

(function(moment) {
  var STRINGS = {
      nodiff: '',
      year: 'year',
      years: 'years',
      month: 'month',
      months: 'months',
      day: 'day',
      days: 'days',
      hour: 'hour',
      hours: 'hours',
      minute: 'minute',
      minutes: 'minutes',
      second: 'second',
      seconds: 'seconds',
      delimiter: ' '
  };

  function pluralize(num, word) {
      return num + ' ' + STRINGS[word + (num === 1 ? '' : 's')];
  }

  function buildStringFromValues(yDiff, mDiff, dDiff, hourDiff, minDiff, secDiff) {
      var result = [];

      if (yDiff) {
          result.push(pluralize(yDiff, 'year'));
      }
      if (mDiff) {
          result.push(pluralize(mDiff, 'month'));
      }
      if (dDiff) {
          result.push(pluralize(dDiff, 'day'));
      }
      if (hourDiff) {
          result.push(pluralize(hourDiff, 'hour'));
      }
      if (minDiff) {
          result.push(pluralize(minDiff, 'minute'));
      }
      if (secDiff) {
          result.push(pluralize(secDiff, 'second'));
      }

      return result.join(STRINGS.delimiter);
  }

  function buildValueObject(yDiff, mDiff, dDiff, hourDiff, minDiff, secDiff, firstDateWasLater) {
      return {
          "years": yDiff,
          "months": mDiff,
          "days": dDiff,
          "hours": hourDiff,
          "minutes": minDiff,
          "seconds": secDiff,
          "firstDateWasLater": firstDateWasLater
      }
  }
  moment.fn.preciseDiff = function(d2, returnValueObject) {
      return moment.preciseDiff(this, d2, returnValueObject);
  };

  moment.preciseDiff = function(d1, d2, returnValueObject) {
      var m1 = moment(d1), 
m2 = moment(d2), 
firstDateWasLater;
      
      m1.add(m2.utcOffset() - m1.utcOffset(), 'minutes'); // shift timezone of m1 to m2
      
      if (m1.isSame(m2)) {
          if (returnValueObject) {
              return buildValueObject(0, 0, 0, 0, 0, 0, false);
          } 
              return STRINGS.nodiff;
          
      }
      if (m1.isAfter(m2)) {
          var tmp = m1;
          m1 = m2;
          m2 = tmp;
          firstDateWasLater = true;
      }
 else {
          firstDateWasLater = false;
      }

      var yDiff = m2.year() - m1.year();
      var mDiff = m2.month() - m1.month();
      var dDiff = m2.date() - m1.date();
      var hourDiff = m2.hour() - m1.hour();
      var minDiff = m2.minute() - m1.minute();
      var secDiff = m2.second() - m1.second();

      if (secDiff < 0) {
          secDiff = 60 + secDiff;
          minDiff--;
      }
      if (minDiff < 0) {
          minDiff = 60 + minDiff;
          hourDiff--;
      }
      if (hourDiff < 0) {
          hourDiff = 24 + hourDiff;
          dDiff--;
      }
      if (dDiff < 0) {
          var daysInLastFullMonth = moment(m2.year() + '-' + (m2.month() + 1), "YYYY-MM").subtract(1, 'M').daysInMonth();
          if (daysInLastFullMonth < m1.date()) { // 31/01 -> 2/03
              dDiff = daysInLastFullMonth + dDiff + (m1.date() - daysInLastFullMonth);
          }
 else {
              dDiff = daysInLastFullMonth + dDiff;
          }
          mDiff--;
      }
      if (mDiff < 0) {
          mDiff = 12 + mDiff;
          yDiff--;
      }

      if (returnValueObject) {
          return buildValueObject(yDiff, mDiff, dDiff, hourDiff, minDiff, secDiff, firstDateWasLater);
      } 
          return buildStringFromValues(yDiff, mDiff, dDiff, hourDiff, minDiff, secDiff);


  };
}(moment));

module.exports = ProgressBar