const SimpleProgressBar = require('../index')
const chalk = require('chalk')
const delay = (time) => new Promise((resolve) => setTimeout(resolve, time))

const test = async function () {
  // How many records in total? 
  const totalRecords = 500
  const progressbar = new SimpleProgressBar({ 
    total: totalRecords,
    completed: '▲',
    pending: '▽',
    colors: {
      pending: chalk.gray
    }
  })

  for (let i = 0; i < totalRecords; i++) {

    // currentRecord cannot be 0 so you need to add 1 here
    progressbar.show({ currentRecord: i + 1 })

    await delay(20)
  }
}

test()