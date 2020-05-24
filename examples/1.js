const SimpleProgressBar = require('../index')
const delay = (time) => new Promise((resolve) => setTimeout(resolve, time))

const test = async function () {
  // How many records in total would you 
  const records = 250
  const progressbar = new SimpleProgressBar({ records: records })

  for (let i = 0; i < records; i++) {

    // currentRecord cannot be 0 so you need to add 1 here
    progressbar.show({ currentRecord: i + 1 })

    await delay(20)
  }
}

test()