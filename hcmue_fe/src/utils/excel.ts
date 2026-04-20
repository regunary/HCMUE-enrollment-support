/**
 * English note: Excel utility helpers powered by SheetJS.
 */
import { utils, writeFile, read } from 'xlsx'

export async function readSheet(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = read(buffer)
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  return utils.sheet_to_json<Record<string, unknown>>(sheet)
}

export function writeSheet(rows: Array<Record<string, unknown>>, fileName: string) {
  const sheet = utils.json_to_sheet(rows)
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, sheet, 'Data')
  writeFile(workbook, fileName)
}
