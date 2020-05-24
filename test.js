const chalk = require('chalk')
const SimpleProgressBar = require('./index')

/**
 * Runs a series of tests
 *
 * @returns {null} returns nothing
 */
const selftest = async function () {
  const delay = (time) => new Promise((resolve) => setTimeout(resolve, time * 1000))

  const records = 154000

  const pb = new SimpleProgressBar({ records: records })

  for (let i = 0; i < records; i += 1) {

    pb.show({ currentRecord: i + 1 })

    /* if (i < 3) {
       if ((i / 100) > 0 && (i / 100) < 5) { */
    // eslint-disable-next-line no-await-in-loop
    /* await delay(3)
       }
       else { */
    // eslint-disable-next-line no-await-in-loop
    await delay(0.05)
    // }

    // i = Math.ceil(i + (Math.random() * records / 100))
  }
}

selftest()