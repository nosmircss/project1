const COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

export function degreesToCompass(degrees: number): string {
  const index = Math.floor((degrees + 11.25) / 22.5) % 16
  return COMPASS_POINTS[index]
}
