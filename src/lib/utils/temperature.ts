// Temperature conversion and formatting utilities

export type TemperatureUnit = 'celsius' | 'fahrenheit'

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9/5) + 32
}

/**
 * Convert Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5/9
}

/**
 * Convert a temperature value based on the target unit
 * @param value - The temperature value in Celsius (our storage format)
 * @param targetUnit - The unit to convert to
 * @returns The converted temperature value
 */
export function convertTemperature(value: number, targetUnit: TemperatureUnit): number {
  if (targetUnit === 'fahrenheit') {
    return celsiusToFahrenheit(value)
  }
  return value // Already in Celsius
}

/**
 * Format a temperature value with the appropriate unit symbol
 * @param value - The temperature value in Celsius (our storage format)
 * @param unit - The preferred display unit
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted temperature string (e.g., "200°C" or "392°F")
 */
export function formatTemperature(
  value: number | null | undefined,
  unit: TemperatureUnit = 'celsius',
  decimals: number = 0
): string {
  if (value === null || value === undefined) {
    return '—'
  }

  const converted = convertTemperature(value, unit)
  const rounded = decimals > 0 ? converted.toFixed(decimals) : Math.round(converted)
  const symbol = unit === 'fahrenheit' ? '°F' : '°C'

  return `${rounded}${symbol}`
}

/**
 * Parse a temperature input and convert to Celsius for storage
 * @param input - The temperature value entered by the user
 * @param inputUnit - The unit the user entered the value in
 * @returns The temperature in Celsius for storage
 */
export function parseTemperatureInput(input: number, inputUnit: TemperatureUnit): number {
  if (inputUnit === 'fahrenheit') {
    return fahrenheitToCelsius(input)
  }
  return input // Already in Celsius
}

/**
 * Get the unit symbol for display
 */
export function getUnitSymbol(unit: TemperatureUnit): string {
  return unit === 'fahrenheit' ? '°F' : '°C'
}
