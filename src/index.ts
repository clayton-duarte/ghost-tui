import { exec } from 'child_process'
import { terminal as term } from 'terminal-kit'

interface Country {
  code: string
  name: string
}

interface City {
  name: string
  instance: string
  load: string
}

const commands = {
  status: 'cyberghostvpn --status',
  countries: 'cyberghostvpn --country-code',
  cities: (countryCode: string) =>
    `cyberghostvpn --country-code ${countryCode} --city`,
  connect: (countryCode: string, cityName: string) =>
    `sudo cyberghostvpn --connect --country-code ${countryCode} --city ${cityName}`,
  disconnect: `sudo cyberghostvpn --stop`,
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

function fromTableTextToObject<T>(tableText: string, columns: number): T[] {
  const obj: T[] = []

  const totalColumns = columns + 2
  const tableCells = tableText
    .split('|')
    .map((cell) => cell.replace(/\s|\-|\+|\./g, ''))
  const headers = tableCells
    .slice(0, totalColumns)
    .map((header) =>
      header.toLowerCase().replace('country', '').replace('city', 'name')
    )

  tableCells
    .slice(totalColumns, tableCells.length - 1)
    .forEach((value, cellIndex) => {
      const rowIndex = Math.floor(cellIndex / totalColumns)

      if (obj[rowIndex] == null) {
        obj[rowIndex] = {} as T
      }

      headers.forEach((columnName, columnIndex) => {
        if (
          columnName !== '' &&
          (cellIndex + totalColumns - columnIndex) % totalColumns === 0
        ) {
          obj[rowIndex] = {
            ...obj[rowIndex],
            [columnName.toLowerCase()]: value,
          }
        }
      })
    })

  return obj
}

function connect(selectedCountry: Country, selectedCity: City) {
  runCommand(
    commands.connect(selectedCountry.code, selectedCity.name),
    (result: string) => {
      term.green(result)
      term.processExit(0)
    }
  )
}

function listCities(country: Country) {
  runCommand(commands.cities(country.code), (tableText) => {
    const cities: City[] = fromTableTextToObject(tableText, 3)

    if (cities.length === 1) {
      connect(country, cities[0])
    }

    term.gridMenu(
      cities.map((city) => city.name),
      { exitOnUnexpectedKey: true },
      (error, response) => {
        if (error == null) {
          const selectedCity = cities[response.selectedIndex]
          term.green('\nSelected: %s\n', selectedCity.name)
          connect(country, selectedCity)
        }
      }
    )
  })
}

function selectCountry(countries: Country[]) {
  term.cyan('Choose a country:\n')
  term.gridMenu(
    countries.map((country) => country.name),
    { exitOnUnexpectedKey: true },
    (error, response) => {
      if (error == null) {
        const selectedCountry = countries[response.selectedIndex]
        term.green('\nSelected: %s\n', selectedCountry.name)
        listCities(selectedCountry)
      }
    }
  )
}

function listCountries() {
  runCommand(commands.countries, async (tableText) => {
    const countries: Country[] = fromTableTextToObject(tableText, 2)
    selectCountry(countries)
  })
}

function init() {
  runCommand(commands.status, async (status) => {
    if (status.startsWith('No VPN connections found')) {
      listCountries()
    } else {
      term.green(`\n${status}\nDo you want to disconnect?[y/n]`)
      const wantDisconnect = await term.yesOrNo().promise
      if (wantDisconnect) {
        runCommand(commands.disconnect, (result) => {
          term.green(`\n${result}`)
          term.processExit(0)
        })
      }
    }
  })
}

init()
