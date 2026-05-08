#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function loadXlsx() {
  const candidates = [
    'xlsx',
    path.resolve(__dirname, '../../hcmue_fe/node_modules/xlsx'),
  ]
  for (const name of candidates) {
    try {
      return require(name)
    } catch {
      // Try the next location.
    }
  }
  throw new Error('Cannot find xlsx. Run `npm install` in hcmue_fe or install xlsx for this tool.')
}

const XLSX = loadXlsx()

const LEGACY_DATABASES = [
  'tuyensinh2025',
  'tuyensinh2025_nl',
  'tuyensinh2025_nl_sphn',
  'tuyensinh2025_nl_sphn2',
]

const THPT_COLUMNS = [
  'TO',
  'VA',
  'LI',
  'HO',
  'SI',
  'SU',
  'DI',
  'GDCD',
  'GDKTPL',
  'TI',
  'CNCN',
  'CNNN',
  'N1',
  'N2',
  'N3',
  'N4',
  'N5',
  'N6',
  'N7',
]

const HOCBA_COLUMNS = [
  'CNCN_HB',
  'CNNN_HB',
  'DI_HB',
  'GDCD_HB',
  'HO_HB',
  'GDKTPL_HB',
  'LI_HB',
  'SI_HB',
  'SU_HB',
  'TA_HB',
  'TI_HB',
  'TO_HB',
  'VA_HB',
]

const DGNL_COLUMNS = ['VA_NL', 'HO_NL', 'LI_NL', 'TO_NL', 'TA_NL', 'SI_NL']
const APTITUDE_COLUMNS = ['NK2', 'NK3', 'NK4', 'NK5', 'NK6']

const REGION_PRIORITY = new Map([
  ['1', 0.75],
  ['2NT', 0.5],
  ['2', 0.25],
  ['3', 0],
])

const PRIORITY_OBJECT_BONUS_BY_GROUP = new Map([
  ['1', 2],
  ['2', 2],
  ['3', 2],
  ['4', 1],
  ['5', 1],
  ['6', 1],
  ['7', 1],
])

const SUBJECT_NAMES = {
  TO: 'Toan',
  VA: 'Ngu van',
  LI: 'Vat li',
  HO: 'Hoa hoc',
  SI: 'Sinh hoc',
  SU: 'Lich su',
  DI: 'Dia li',
  GDCD: 'Giao duc cong dan',
  GDKTPL: 'Giao duc kinh te va phap luat',
  TI: 'Tin hoc',
  CNCN: 'Cong nghe cong nghiep',
  CNNN: 'Cong nghe nong nghiep',
  TA: 'Tieng Anh',
  N1: 'Ngoai ngu 1',
  N2: 'Ngoai ngu 2',
  N3: 'Ngoai ngu 3',
  N4: 'Ngoai ngu 4',
  N5: 'Ngoai ngu 5',
  N6: 'Ngoai ngu 6',
  N7: 'Ngoai ngu 7',
  NK2: 'Nang khieu 2',
  NK3: 'Nang khieu 3',
  NK4: 'Nang khieu 4',
  NK5: 'Nang khieu 5',
  NK6: 'Nang khieu 6',
}

function parseArgs(argv) {
  const args = {
    input: path.resolve(process.cwd(), 'data/legacy_csv'),
    output: path.resolve(process.cwd(), `data/legacy_exports/${todayStamp()}`),
  }
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--input') {
      args.input = path.resolve(argv[++index])
    } else if (arg === '--output') {
      args.output = path.resolve(argv[++index])
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  return args
}

function todayStamp() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

function printHelp() {
  console.log(`Usage:
  node tools/legacy-export/export_legacy_to_xlsx.js --input data/legacy_csv --output data/legacy_exports/latest

Expected CSV layout:
  data/legacy_csv/tuyensinh2025/datats.csv
  data/legacy_csv/tuyensinh2025/data.csv
  data/legacy_csv/tuyensinh2025/data_hocba.csv
  data/legacy_csv/tuyensinh2025/datank.csv
  data/legacy_csv/tuyensinh2025/nguyenvong_1.csv
  data/legacy_csv/tuyensinh2025/tohop.csv
  data/legacy_csv/tuyensinh2025/nganh.csv

The same table names can exist under tuyensinh2025_nl, tuyensinh2025_nl_sphn, and tuyensinh2025_nl_sphn2.
Missing files are skipped.`)
}

function parseCsv(text) {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]
    const next = normalized[index + 1]
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  if (rows.length === 0) {
    return []
  }
  const headers = rows[0].map((item) => cleanHeader(item))
  return rows.slice(1).filter((items) => items.some((item) => clean(item) !== '')).map((items) => {
    const rowObject = {}
    headers.forEach((header, index) => {
      if (header) {
        rowObject[header] = items[index] ?? ''
      }
    })
    return rowObject
  })
}

function cleanHeader(value) {
  return clean(value).replace(/^\uFEFF/, '')
}

function clean(value) {
  if (value === null || value === undefined) {
    return ''
  }
  const text = String(value).trim()
  if (text.toUpperCase() === 'NULL') {
    return ''
  }
  return text.endsWith('.0') ? text.slice(0, -2) : text
}

function cleanCccd(value) {
  const text = clean(value).replace(/^'/, '')
  if (/^\d{11}$/.test(text)) {
    return text.padStart(12, '0')
  }
  return text
}

function normalizeRegion(value) {
  const text = clean(value).toUpperCase().replace(/KV/g, '').replace(/[-_\s]/g, '')
  if (text === '2NT' || text === '2NONGTHON') {
    return '2NT'
  }
  if (text === '1' || text === '2' || text === '3') {
    return text
  }
  return text
}

function normalizeAcademicLevel(value) {
  const text = clean(value).toLowerCase()
  if (text === '1' || text === 'gioi' || text === 'giỏi') {
    return '1'
  }
  if (text === '0' || text === 'kha' || text === 'khá') {
    return '0'
  }
  return clean(value)
}

function normalizePriorityObjectCode(value) {
  const match = clean(value).match(/^0*([1-7])/)
  return match ? match[1] : ''
}

function valueOrBlank(row, key) {
  const value = clean(row[key])
  return value
}

function readTable(inputDir, database, tableName) {
  const filePath = path.join(inputDir, database, `${tableName}.csv`)
  if (!fs.existsSync(filePath)) {
    return []
  }
  const text = fs.readFileSync(filePath, 'utf8')
  return parseCsv(text)
}

function rowKey(row) {
  return cleanCccd(row.CCCD || row.SOBAODANH)
}

function mergeIfBlank(target, source, fields) {
  let changed = false
  for (const field of fields) {
    const value = valueOrBlank(source, field)
    if (value !== '' && clean(target[field]) === '') {
      target[field] = value
      changed = true
    }
  }
  return changed
}

function collectLegacyData(inputDir) {
  const candidates = new Map()
  const thptScores = new Map()
  const hocbaScores = new Map()
  const dgnlScores = new Map()
  const aptitudeScores = new Map()
  const priorityObjects = new Set()
  const combinations = new Map()
  const majors = new Map()
  const wishes = new Map()
  const invalidCccdRows = []
  const stats = {}

  for (const database of LEGACY_DATABASES) {
    stats[database] = {}
    const datats = readTable(inputDir, database, 'datats')
    stats[database].datats = datats.length
    for (const row of datats) {
      const cccd = rowKey(row)
      if (!cccd) {
        continue
      }
      if (!isValidCccd(cccd)) {
        trackInvalidCccd(invalidCccdRows, database, 'datats', cccd)
        continue
      }
      const current = candidates.get(cccd) ?? { CCCD: cccd, KV: '', DT: '', NamTN: '', HocLuc12: '', DiemTN: '' }
      const region = normalizeRegion(row.KV_DIEM)
      const priorityObject = normalizePriorityObjectCode(row.DT_DIEM)
      if (region && !current.KV) current.KV = region
      if (priorityObject && !current.DT) current.DT = priorityObject
      if (priorityObject) priorityObjects.add(priorityObject)
      if (!current.NamTN) current.NamTN = valueOrBlank(row, 'NamTN')
      if (!current.HocLuc12) current.HocLuc12 = normalizeAcademicLevel(row.Hocluc)
      if (!current.DiemTN) current.DiemTN = valueOrBlank(row, 'DiemTN')
      candidates.set(cccd, current)
    }

    const dataRows = readTable(inputDir, database, 'data')
    stats[database].data = dataRows.length
    for (const row of dataRows) {
      const cccd = rowKey(row)
      if (!cccd) continue
      if (!isValidCccd(cccd)) {
        trackInvalidCccd(invalidCccdRows, database, 'data', cccd)
        continue
      }
      const current = thptScores.get(cccd) ?? { CCCD: cccd }
      mergeIfBlank(current, row, THPT_COLUMNS)
      thptScores.set(cccd, current)
      if (!candidates.has(cccd)) {
        candidates.set(cccd, { CCCD: cccd, KV: '', DT: '', NamTN: '', HocLuc12: '', DiemTN: '' })
      }
    }

    const rawHocbaRows = readTable(inputDir, database, 'data_hocba')
    stats[database].data_hocba = rawHocbaRows.length
    const hocbaRows = [...rawHocbaRows, ...dataRows.filter((row) => row.CCCD)]
    for (const row of hocbaRows) {
      const cccd = rowKey(row)
      if (!cccd) continue
      if (!isValidCccd(cccd)) {
        trackInvalidCccd(invalidCccdRows, database, 'data_hocba_or_data', cccd)
        continue
      }
      const current = hocbaScores.get(cccd) ?? { CCCD: cccd }
      mergeIfBlank(current, row, HOCBA_COLUMNS)
      hocbaScores.set(cccd, current)
      if (!candidates.has(cccd)) {
        candidates.set(cccd, { CCCD: cccd, KV: '', DT: '', NamTN: '', HocLuc12: '', DiemTN: '' })
      }
    }

    const rawDgnlRows = readTable(inputDir, database, 'datanl')
    stats[database].datanl = rawDgnlRows.length
    const dgnlRows = [...rawDgnlRows, ...dataRows.filter((row) => row.CCCD)]
    for (const row of dgnlRows) {
      const cccd = rowKey(row)
      if (!cccd) continue
      if (!isValidCccd(cccd)) {
        trackInvalidCccd(invalidCccdRows, database, 'datanl_or_data', cccd)
        continue
      }
      const current = dgnlScores.get(cccd) ?? { CCCD: cccd }
      mergeIfBlank(current, row, DGNL_COLUMNS)
      dgnlScores.set(cccd, current)
      if (!candidates.has(cccd)) {
        candidates.set(cccd, { CCCD: cccd, KV: '', DT: '', NamTN: '', HocLuc12: '', DiemTN: '' })
      }
    }

    const datankRows = readTable(inputDir, database, 'datank')
    stats[database].datank = datankRows.length
    for (const row of datankRows) {
      const cccd = rowKey(row)
      if (!cccd) continue
      if (!isValidCccd(cccd)) {
        trackInvalidCccd(invalidCccdRows, database, 'datank', cccd)
        continue
      }
      const current = aptitudeScores.get(cccd) ?? { CCCD: cccd }
      mergeIfBlank(current, row, APTITUDE_COLUMNS)
      aptitudeScores.set(cccd, current)
      if (!candidates.has(cccd)) {
        candidates.set(cccd, { CCCD: cccd, KV: '', DT: '', NamTN: '', HocLuc12: '', DiemTN: '' })
      }
    }

    const wishRows = readTable(inputDir, database, 'nguyenvong_1')
    stats[database].nguyenvong_1 = wishRows.length
    for (const row of wishRows) {
      const cccd = rowKey(row)
      const majorCode = clean(row.MaXT)
      const order = valueOrBlank(row, 'TTNV')
      if (!cccd || !majorCode || !order) continue
      if (!isValidCccd(cccd)) {
        trackInvalidCccd(invalidCccdRows, database, 'nguyenvong_1', cccd)
        continue
      }
      wishes.set(`${cccd}|${majorCode}|${order}`, {
        CCCD: cccd,
        MaNganh: majorCode,
        ThuTuNV: order,
      })
      if (!candidates.has(cccd)) {
        candidates.set(cccd, { CCCD: cccd, KV: '', DT: '', NamTN: '', HocLuc12: '', DiemTN: '' })
      }
    }

    const combinationRows = readTable(inputDir, database, 'tohop')
    stats[database].tohop = combinationRows.length
    for (const row of combinationRows) {
      const code = clean(row.ToHop)
      if (!code || combinations.has(code)) continue
      combinations.set(code, {
        MaTH: code,
        Mon1: clean(row.M1),
        Mon2: clean(row.M2),
        Mon3: clean(row.M3),
        TrongSo1: 1,
        TrongSo2: 1,
        TrongSo3: 1,
      })
    }

    const majorRows = readTable(inputDir, database, 'nganh')
    stats[database].nganh = majorRows.length
    for (const row of majorRows) {
      const majorCode = clean(row.MaXT)
      const combinationCode = clean(row.Tohop)
      if (!majorCode || !combinationCode) continue
      majors.set(`${majorCode}|${combinationCode}`, {
        MaNganh: majorCode,
        TenNganh: clean(row.Ten_nganh),
        MaTH: combinationCode,
        DiemSan: valueOrBlank(row, 'DiemSan'),
        DiemLech: valueOrBlank(row, 'dolech'),
      })
    }
  }

  return {
    candidates,
    thptScores,
    hocbaScores,
    dgnlScores,
    aptitudeScores,
    priorityObjects,
    combinations,
    majors,
    wishes,
    invalidCccdRows,
    stats,
  }
}

function isValidCccd(value) {
  return /^\d{12}$/.test(cleanCccd(value))
}

function trackInvalidCccd(invalidCccdRows, database, table, cccd) {
  const key = `${database}|${table}|${cccd}`
  if (invalidCccdRows.some((row) => row.key === key)) {
    return
  }
  invalidCccdRows.push({ key, database, table, cccd })
}

function sortRows(rows, key) {
  return rows.sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'en'))
}

function toRowsWithHeaders(rows, headers) {
  return rows.map((row) => {
    const next = {}
    for (const header of headers) {
      next[header] = row[header] ?? ''
    }
    return next
  })
}

function writeWorkbook(outputDir, fileName, rows, headers) {
  fs.mkdirSync(outputDir, { recursive: true })
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(toRowsWithHeaders(rows, headers), { header: headers })
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, path.join(outputDir, fileName))
}

function buildSubjects() {
  const subjectIds = new Set([
    ...THPT_COLUMNS,
    ...DGNL_COLUMNS.map((column) => column.replace(/_NL$/, '')),
    ...HOCBA_COLUMNS.map((column) => column.replace(/_HB$/, '')),
    ...APTITUDE_COLUMNS,
  ])
  subjectIds.delete('LY')
  return [...subjectIds].sort().map((id) => ({
    MaMon: id,
    TenMon: SUBJECT_NAMES[id] ?? id,
  }))
}

function buildRegions() {
  return [...REGION_PRIORITY.entries()].map(([KV, DiemUT]) => ({ KV, DiemUT }))
}

function buildPriorityObjects(priorityObjects) {
  const codes = new Set(['1', '2', '3', '4', '5', '6', '7'])
  for (const code of priorityObjects) {
    codes.add(normalizePriorityObjectCode(code))
  }
  codes.delete('')
  return [...codes].sort().map((DT) => ({ DT, DiemUT: priorityObjectBonus(DT) }))
}

function priorityObjectBonus(priorityObjectCode) {
  const code = normalizePriorityObjectCode(priorityObjectCode)
  if (!code) {
    return 0
  }
  return PRIORITY_OBJECT_BONUS_BY_GROUP.get(code) ?? 0
}

function writeReport(outputDir, data) {
  const priorityObjectRows = buildPriorityObjects(data.priorityObjects)
  const report = {
    generated_at: new Date().toISOString(),
    source_stats: data.stats,
    output_counts: {
      subjects: buildSubjects().length,
      regions: buildRegions().length,
      priority_objects: priorityObjectRows.length,
      combinations: data.combinations.size,
      majors: data.majors.size,
      candidates_basic: data.candidates.size,
      scores_thpt: data.thptScores.size,
      scores_hocba: data.hocbaScores.size,
      scores_dgnl: data.dgnlScores.size,
      scores_nangkhieu: data.aptitudeScores.size,
      wishes: data.wishes.size,
    },
    notes: [
      'Priority object codes are normalized to groups 1..7. DiemUT rule: groups 1/2/3 = 2, groups 4/5/6/7 = 1.',
      'NK6 is included and requires the new system to have subject NK6 before importing aptitude scores.',
      'When duplicate CCCD data exists across databases, the first non-blank value in database order is kept.',
      'Rows with CCCD not matching exactly 12 digits are excluded from import files.',
    ],
    excluded_invalid_cccd: data.invalidCccdRows.map(({ database, table, cccd }) => ({ database, table, cccd })),
  }
  fs.writeFileSync(path.join(outputDir, 'export_report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

function main() {
  const args = parseArgs(process.argv)
  const data = collectLegacyData(args.input)
  fs.mkdirSync(args.output, { recursive: true })

  writeWorkbook(args.output, '00_subjects.xlsx', buildSubjects(), ['MaMon', 'TenMon'])
  writeWorkbook(args.output, '01_regions.xlsx', buildRegions(), ['KV', 'DiemUT'])
  writeWorkbook(args.output, '02_priority_objects.xlsx', buildPriorityObjects(data.priorityObjects), ['DT', 'DiemUT'])
  writeWorkbook(args.output, '03_combinations.xlsx', sortRows([...data.combinations.values()], 'MaTH'), [
    'MaTH',
    'Mon1',
    'Mon2',
    'Mon3',
    'TrongSo1',
    'TrongSo2',
    'TrongSo3',
  ])
  writeWorkbook(args.output, '04_majors_prepare_only.xlsx', sortRows([...data.majors.values()], 'MaNganh'), [
    'MaNganh',
    'TenNganh',
    'MaTH',
    'DiemSan',
    'DiemLech',
  ])
  writeWorkbook(args.output, '05_candidates_basic.xlsx', sortRows([...data.candidates.values()], 'CCCD'), [
    'CCCD',
    'KV',
    'DT',
    'NamTN',
    'HocLuc12',
    'DiemTN',
  ])
  writeWorkbook(args.output, '06_scores_thpt.xlsx', sortRows([...data.thptScores.values()], 'CCCD'), ['CCCD', ...THPT_COLUMNS])
  writeWorkbook(args.output, '07_scores_hocba.xlsx', sortRows([...data.hocbaScores.values()], 'CCCD'), ['CCCD', ...HOCBA_COLUMNS])
  writeWorkbook(args.output, '08_scores_dgnl.xlsx', sortRows([...data.dgnlScores.values()], 'CCCD'), ['CCCD', ...DGNL_COLUMNS])
  writeWorkbook(args.output, '09_scores_nangkhieu.xlsx', sortRows([...data.aptitudeScores.values()], 'CCCD'), ['CCCD', ...APTITUDE_COLUMNS])
  writeWorkbook(args.output, '10_wishes_prepare_only.xlsx', sortRows([...data.wishes.values()], 'CCCD'), ['CCCD', 'MaNganh', 'ThuTuNV'])
  writeReport(args.output, data)

  console.log(`Exported legacy Excel files to ${args.output}`)
}

main()
