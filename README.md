# simple-cli-progressbar

Quick and easy to use **progressbar** for **CLI scripts** that mangles a lot of data. Calculates time to the end based on number of iterations passed. When iterations are  

![](https://res.cloudinary.com/dooshekln/image/upload/v1590339547/npmjs/simple-cli-progressbar/example1_brfi8a.gif)

- [simple-cli-progressbar](#simple-cli-progressbar)
  - [Why would I want that?](#why-would-i-want-that)
  - [Installation](#installation)
  - [Simple usage](#simple-usage)

## Why would I want that?
Whenever you run a script that process a lot of data and you want to know when it's going to finish. It gives you a clue if it's gonna be **minutes** or... **hours**. Progress bar is "multi threaded" meaning that you can invoke it many times.

## Installation

Via npm:

```
npm i simple-cli-progressbar --save
```

Or if you just want the GIT repository:

```
git clone git@github.com:dooshek/simple-cli-progressbar.git
```

> You can find every working example in module directory under `examples/` directory.

## Simple usage
```javascript
const SimpleProgressBar = require('simple-progressbar')
const delay = (time) => new Promise((resolve) => setTimeout(resolve, time))

const test = async function () {
  // How many records in total would you 
  const totalRecords = 250
  const progressbar = new SimpleProgressBar({ total: totalRecords })

  for (let i = 0; i < totalRecords; i++) {

    // currentRecord cannot be 0 so you need to add 1 here
    progressbar.show({ currentRecord: i + 1 })

    await delay(20)
  }
}

test()```
![](https://res.cloudinary.com/dooshekln/image/upload/v1590339547/npmjs/simple-cli-progressbar/example1_brfi8a.gif)
