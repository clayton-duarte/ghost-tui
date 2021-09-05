import { terminal as term } from 'terminal-kit'

import {
  runCommandSync,
  connectCountry,
  listCountries,
  selectOption,
  connectCity,
  listCities,
} from './helpers'

async function init() {
  // STATUS
  const status = await runCommandSync('cyberghostvpn --status')

  // NOT CONNECTED
  if (status.startsWith('No VPN connections found')) {
    // SELECT COUNTRY
    term.cyan('\nSelect a country:')
    const countries = await listCountries()
    const selectedCountry = await selectOption(countries)
    term.green(`\nSelected: ${selectedCountry.name}`)

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
      term.green(`\nSelected: ${selectedCity.name}`)
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
      await runCommandSync(`sudo cyberghostvpn --stop`)
      term.green('\nVPN connection disband')
      term.processExit(0)
    } else {
      // EXIT
      term.green(`\nNothing to do`)
      term.processExit(0)
    }
  }
}

init()
