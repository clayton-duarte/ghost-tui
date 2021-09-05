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

export async function runCommandSync(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execSync(command)
    if (stderr !== '') return stderr
    return stdout
  } catch (err) {
    throw Error(JSON.stringify(err, null, 2))
  }
}

export async function connectCountry(selectedCountry: Country) {
  await runCommandSync(
    `sudo cyberghostvpn --connect --country-code "${selectedCountry.code}"`
  )
  term.green('\nVPN connection established')
  term.processExit(0)
}

export async function connectCity(
  selectedCountry: Country,
  selectedCity: City
) {
  await runCommandSync(
    `sudo cyberghostvpn --connect --country-code "${selectedCountry.code}" --city "${selectedCity.name}"`
  )
  term.green('\nVPN connection established')
  term.processExit(0)
}

export async function listCities(selectedCountry: Country): Promise<City[]> {
  const tableText = await runCommandSync(
    `cyberghostvpn --country-code ${selectedCountry.code} --city`
  )
  return fromTableTextToObject(tableText, 3)
}

export async function selectOption<T extends { name: string }>(
  options: T[]
): Promise<T> {
  const { selectedIndex } = await term.gridMenu(
    options.map((option) => option.name)
  ).promise
  return options[selectedIndex]
}

export async function listCountries(): Promise<Country[]> {
  const tableText = await runCommandSync('cyberghostvpn --country-code')
  return fromTableTextToObject(tableText, 2)
}
