import { terminal as term } from 'terminal-kit'
import { exec } from 'child_process'
import util from 'util'

const execSync = util.promisify(exec)

interface Country {
  code: string
  name: string
}

interface City {
  name: string
  instance: string
  load: string
}

async function runCommandSync(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execSync(command)
    if (stderr !== '') return stderr
    return stdout
  } catch (err) {
    throw Error(JSON.stringify(err, null, 2))
  }
}

function fromTableTextToObject<T>(tableText: string, columns: number): T[] {
  const obj: T[] = []

  const totalColumns = columns + 2
  const tableCells = tableText
    .split('|')
    .map((cell) => cell.trim().replace(/\-|\+|\./g, ''))
  const headers = tableCells.slice(0, totalColumns).map((header) =>
    header
      .toLowerCase()
      .replace(/\s|\-|\+|\.|country/g, '')
      .replace('city', 'name')
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
            [columnName]: value,
          }
        }
      })
    })

  return obj
}

async function connectCountry(selectedCountry: Country) {
  const result = await runCommandSync(
    `sudo cyberghostvpn --connect --country-code "${selectedCountry.code}"`
  )
  term.green(result)
  term.processExit(0)
}

async function connectCity(selectedCountry: Country, selectedCity: City) {
  const result = await runCommandSync(
    `sudo cyberghostvpn --connect --country-code "${selectedCountry.code}" --city "${selectedCity.name}"`
  )
  term.green(result)
  term.processExit(0)
}

async function listCities(selectedCountry: Country): Promise<City[]> {
  const tableText = await runCommandSync(
    `cyberghostvpn --country-code ${selectedCountry.code} --city`
  )
  return fromTableTextToObject(tableText, 3)
}

async function selectOption<T extends { name: string }>(
  options: T[]
): Promise<T> {
  const { selectedIndex } = await term.gridMenu(
    options.map((option) => option.name)
  ).promise
  return options[selectedIndex]
}

async function listCountries(): Promise<Country[]> {
  const tableText = await runCommandSync('cyberghostvpn --country-code')
  return fromTableTextToObject(tableText, 2)
}

async function init() {
  // STATUS
  const status = await runCommandSync('cyberghostvpn --status')

  // NOT CONNECTED
  if (status.startsWith('No VPN connections found')) {
    // SELECT COUNTRY
    term.cyan('\nSelect a country:')
    const countries = await listCountries()
    const selectedCountry = await selectOption(countries)
    term.green('\nSelected: %s', selectedCountry.name)

    // SELECT CITY
    const cities = await listCities(selectedCountry)
    if (cities.length === 1) {
      // only one, auto-select
      connectCity(selectedCountry, cities[0])
    } else {
      term.cyan('\nSelect a city:')
      const selectedCity = await selectOption([
        { name: '*Best*', instance: '', load: '' },
        ...cities,
      ])
      term.green('\nSelected: %s', selectedCity.name)
      if (selectedCity.name === '*Best*') {
        connectCountry(selectedCountry)
      } else {
        connectCity(selectedCountry, selectedCity)
      }
    }
  } else {
    // CONNECTED
    term.green(`\n${status}\nDo you want to disconnect? [Y/n]\n`)
    const wantDisconnect = await term.yesOrNo().promise

    if (wantDisconnect) {
      // DISCONNECT
      const result = await runCommandSync(`sudo cyberghostvpn --stop`)
      term.green(`\n${result}`)
      term.processExit(0)
    } else {
      // EXIT
      term.green(`\nNothing to do`)
      term.processExit(0)
    }
  }
}

init()
