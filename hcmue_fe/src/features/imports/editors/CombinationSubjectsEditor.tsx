import { Button, NumberInput } from '../../../components'
import type { CombinationDraftMap } from '../importEntity.helpers'

type CombinationSubjectsEditorProps = {
  options: Array<{ id: string; name: string }>
  map: CombinationDraftMap
  onMapChange: (nextMap: CombinationDraftMap) => void
}

const EPS = 1e-6

function parseWeightsSum(map: CombinationDraftMap): number {
  let sum = 0
  let hasAny = false
  for (const key of Object.keys(map)) {
    const raw = map[key]?.trim() ?? ''
    if (raw === '') {
      continue
    }
    const value = Number(raw)
    if (Number.isFinite(value)) {
      sum += value
      hasAny = true
    }
  }
  return hasAny ? sum : Number.NaN
}

export function CombinationSubjectsEditor({ options, map, onMapChange }: CombinationSubjectsEditorProps) {
  const selectedIds = Object.keys(map)
  const selectedCount = selectedIds.length
  const weightSum = parseWeightsSum(map)
  const sumOk = Number.isFinite(weightSum) && Math.abs(weightSum - 1) <= EPS

  const applyEqualThirds = () => {
    const ids = Object.keys(map)
    if (ids.length !== 3) {
      return
    }
    const third = `${1 / 3}`
    const nextMap: CombinationDraftMap = {}
    ids.forEach((id) => {
      nextMap[id] = third
    })
    onMapChange(nextMap)
  }

  return (
    <div className="grid gap-2">
      <div className="hidden md:grid md:grid-cols-[1fr_140px] md:gap-2">
        <p className="text-xs font-semibold text-muted m-0">Môn</p>
        <p className="text-xs font-semibold text-muted m-0">Trọng số</p>
      </div>
      {options.map((item) => {
        const selected = Object.prototype.hasOwnProperty.call(map, item.id)
        const weightRaw = selected ? map[item.id] : ''
        const weightValue: number | '' =
          weightRaw.trim() === '' ? '' : Number.isFinite(Number(weightRaw)) ? Number(weightRaw) : ''
        const maxReached = selectedCount >= 3 && !selected
        return (
          <div key={item.id} className="grid gap-2 md:grid-cols-[1fr_140px] md:items-center">
            <label className={`inline-flex items-center gap-2 text-sm ${maxReached ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                disabled={maxReached}
                checked={selected}
                title={maxReached ? 'Chỉ được chọn đúng 3 môn.' : undefined}
                onChange={(event) => {
                  const checked = event.target.checked
                  const nextMap = { ...map }
                  if (checked) {
                    const currentCount = Object.keys(nextMap).length
                    if (currentCount >= 3) {
                      return
                    }
                    nextMap[item.id] = nextMap[item.id] ?? ''
                    const afterCount = Object.keys(nextMap).length
                    if (afterCount === 3) {
                      const ids = Object.keys(nextMap)
                      ids.forEach((id) => {
                        nextMap[id] = `${1 / 3}`
                      })
                    }
                  } else {
                    delete nextMap[item.id]
                  }
                  onMapChange(nextMap)
                }}
              />
              {item.id} - {item.name}
            </label>
            <NumberInput
              value={weightValue}
              placeholder="VD: 0.34"
              onChange={(next) => {
                if (!Object.prototype.hasOwnProperty.call(map, item.id)) {
                  return
                }
                onMapChange({
                  ...map,
                  [item.id]: next === '' ? '' : String(next),
                })
              }}
            />
          </div>
        )
      })}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-xs m-0 ${sumOk ? 'text-muted' : 'text-amber-700'}`}>
          Bắt buộc đúng 3 môn. Tổng trọng số phải bằng 1
          {Number.isFinite(weightSum) ? (
            <>
              {' '}
              (hiện ≈ <span className="font-medium">{weightSum.toFixed(4)}</span>)
            </>
          ) : (
            ''
          )}
          .
        </p>
        {selectedCount === 3 ? (
          <Button type="button" variant="secondary" onClick={applyEqualThirds}>
            Chia đều ⅓
          </Button>
        ) : null}
      </div>
    </div>
  )
}
