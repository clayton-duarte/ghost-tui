import { exec } from 'child_process'

const commands = {
  countries: 'cyberghostvpn --country-code',
  status: 'cyberghostvpn --status',
}

function runCommand(command: string, callback: (result: string) => void): void {
  exec(command, (error, stdout, stderr) => {
    if (error != null) {
      callback(stderr)
    } else {
      callback(stdout)
    }
  })
}

function listCountries() {
  runCommand(commands.countries, (table) => {
    const countries: { countryCode: string; countryName: string }[] = []
    const tableCells = table.split('|')
    tableCells.slice(4, tableCells.length - 1).forEach((value, cellIndex) => {
      const rowIndex = Math.floor(cellIndex / 4)

      if (countries[rowIndex] == null) {
        countries[rowIndex] = {
          countryCode: '',
          countryName: '',
        }
      }

      const isSecondColumn = (cellIndex + 1) % 4 === 0
      if (isSecondColumn) {
        countries[rowIndex].countryCode = value.trim()
      }

      const isThirdColumn = (cellIndex + 2) % 4 === 0
      if (isThirdColumn) {
        countries[rowIndex].countryName = value.trim()
      }
    })

    console.log(countries)
  })
}

function init() {
  runCommand(commands.status, (status) => {
    if (status.startsWith('No VPN connections found')) {
      listCountries()
    } else {
      console.log(status)
    }
  })
}

init()
