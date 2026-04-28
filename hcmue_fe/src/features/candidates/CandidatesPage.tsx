/**
 * English note: Candidate import module page.
 */
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Uploader } from '../../components'
import { candidateSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { writeSheet } from '../../utils/excel'
import { useToast } from '../feedback/useToast'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import { formatImportResultForToast } from '../imports/importResultFormat'
import type { ImportFieldDef, RowModel } from '../imports/importEntity.types'
import type { Candidate } from '../../types/domain'

const CANDIDATE_FIELDS: ImportFieldDef[] = [
  { key: 'idNumber', label: 'Số CCCD', kind: 'text' },
  { key: 'priorityRegion', label: 'Khu vực ưu tiên', kind: 'text' },
  { key: 'priorityBonus', label: 'Điểm ưu tiên KV', kind: 'number' },
  { key: 'priorityGroup', label: 'Đối tượng ưu tiên', kind: 'text' },
  { key: 'graduationYear', label: 'Năm tốt nghiệp', kind: 'number' },
  { key: 'academicLevel', label: 'Học lực lớp 12', kind: 'text' },
  { key: 'graduationScore', label: 'Điểm tốt nghiệp', kind: 'number' },
  { key: 'scoreJson', label: 'Điểm môn (JSON: TO, TO_NL, TO_HB, NK2…)', kind: 'textarea' },
]

export function CandidatesPage() {
  const { showToast } = useToast()
  const [regions, setRegions] = useState<Array<{ code: string; bonus_score: number }>>([])
  const [thptFile, setThptFile] = useState<File | null>(null)
  const [hocBaFile, setHocBaFile] = useState<File | null>(null)
  const [nangLucFile, setNangLucFile] = useState<File | null>(null)
  const [nangKhieuFile, setNangKhieuFile] = useState<File | null>(null)
  const [candidateListVersion, setCandidateListVersion] = useState(0)

  useEffect(() => {
    if (!enrollmentApi.getCandidateRegions) {
      return
    }
    void enrollmentApi
      .getCandidateRegions()
      .then((data) => setRegions(data.map((item) => ({ code: item.code, bonus_score: item.bonus_score }))))
      .catch(() => {
        // keep candidate form usable even when regions endpoint fails
      })
  }, [])

  const candidateSelectOptions = useMemo(() => {
    const regionOptions = [{ value: '', label: 'Chọn khu vực' }, ...regions.map((item) => ({ value: item.code, label: item.code }))]
    const academicOptions = [
      { value: 'Giỏi', label: 'Giỏi' },
      { value: 'Khá', label: 'Khá' },
    ]
    return {
      priorityRegion: regionOptions,
      academicLevel: academicOptions,
    }
  }, [regions])

  const onCandidateDraftChange = (nextDraft: Record<string, string>, changedKey: string) => {
    if (changedKey !== 'priorityRegion') {
      return nextDraft
    }
    const selected = regions.find((item) => item.code === nextDraft.priorityRegion)
    return {
      ...nextDraft,
      priorityBonus: selected ? String(selected.bonus_score) : '',
    }
  }

  const runScoreImport = async (
    file: File | null,
    importer:
      | ((value: File) => Promise<{
          success?: boolean
          created: number
          updated: number
          skipped: number
          errors: Array<Record<string, unknown>>
        }>)
      | undefined,
    label: string,
  ) => {
    if (!file || !importer) {
      showToast(`Chưa chọn file import điểm ${label}.`, 'info')
      return
    }
    try {
      const summary = await importer(file)
      const { message, kind } = formatImportResultForToast(`Import điểm ${label}`, {
        success: summary.success ?? true,
        created: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        errors: summary.errors ?? [],
      })
      showToast(message, kind)
      setCandidateListVersion((v) => v + 1)
    } catch (error) {
      const message = error instanceof Error ? error.message : `Import điểm ${label} thất bại.`
      showToast(message, 'error')
    }
  }

  const saveCandidate = async (
    payload: RowModel,
    selectedRowIndex: number | null,
    rows: RowModel[],
  ): Promise<RowModel[]> => {
    const candidate = payload as Candidate
    if (selectedRowIndex !== null && typeof rows[selectedRowIndex]?._pk === 'string' && enrollmentApi.updateCandidate) {
      const updated = await enrollmentApi.updateCandidate(rows[selectedRowIndex]._pk as string, candidate)
      const pk = rows[selectedRowIndex]._pk
      return rows.map((row, index) => (index === selectedRowIndex ? ({ ...updated, _pk: pk } as RowModel) : row))
    }
    if (enrollmentApi.createCandidate) {
      const created = await enrollmentApi.createCandidate(candidate)
      return [created as RowModel, ...rows]
    }
    if (selectedRowIndex === null) {
      return [payload, ...rows]
    }
    return rows.map((row, index) => (index === selectedRowIndex ? payload : row))
  }

  return (
    <>
      <Card title="Import điểm theo nhóm">
        <p className="text-sm text-muted leading-relaxed">
          Dùng cho các file điểm riêng theo từng nhóm: THPT, ĐGNL và Năng khiếu.
        </p>
        <div className="grid gap-3 mt-3">
          <div className="grid gap-2 md:grid-cols-[140px_1fr_auto] md:items-center">
            <span className="text-sm font-medium">Điểm THPT</span>
            <Uploader onFileSelected={setThptFile} />
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => void runScoreImport(thptFile, enrollmentApi.importCandidateScoresThpt, 'THPT')}>
                Import
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  writeSheet(
                    [
                      {
                        CCCD: '079300000000',
                        TO: 8.5,
                        VA: 7.8,
                        LI: 7.2,
                        HO: '',
                        SI: '',
                        SU: '',
                        DI: '',
                        GDCD: '',
                        GDKTPL: '',
                        TI: '',
                        CNNN: '',
                        CNCN: '',
                        N1: '',
                        N2: '',
                        N3: '',
                        N4: '',
                        N5: '',
                        N6: '',
                        N7: '',
                      },
                    ],
                    'mau-diem-thpt.xlsx',
                  )
                }
              >
                Tải mẫu
              </Button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-[140px_1fr_auto] md:items-center">
            <span className="text-sm font-medium">Điểm học bạ</span>
            <Uploader onFileSelected={setHocBaFile} />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void runScoreImport(hocBaFile, enrollmentApi.importCandidateScoresHocBa, 'học bạ')}
              >
                Import
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  writeSheet(
                    [
                      {
                        CCCD: '079300000000',
                        TO_HB: 8.5,
                        VA_HB: 7.8,
                        LY_HB: 7.2,
                        HO_HB: '',
                        SI_HB: '',
                        SU_HB: '',
                        DI_HB: '',
                        TA_HB: '',
                        TI_HB: '',
                        CNNN_HB: '',
                        CNCN_HB: '',
                        GDCD_HB: '',
                        GDKTPL_HB: '',
                      },
                    ],
                    'mau-diem-hoc-ba.xlsx',
                  )
                }
              >
                Tải mẫu
              </Button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-[140px_1fr_auto] md:items-center">
            <span className="text-sm font-medium">Điểm ĐGNL</span>
            <Uploader onFileSelected={setNangLucFile} />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void runScoreImport(nangLucFile, enrollmentApi.importCandidateScoresNangLuc, 'ĐGNL')}
              >
                Import
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  writeSheet([{ CCCD: '079300000000', TO_NL: 850, VA_NL: 780, LI_NL: 720 }], 'mau-diem-dgnl.xlsx')
                }
              >
                Tải mẫu
              </Button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-[140px_1fr_auto] md:items-center">
            <span className="text-sm font-medium">Điểm năng khiếu</span>
            <Uploader onFileSelected={setNangKhieuFile} />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void runScoreImport(nangKhieuFile, enrollmentApi.importCandidateScoresNangKhieu, 'năng khiếu')}
              >
                Import
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  writeSheet([{ CCCD: '079300000000', NK2: 8.0, NK3: 7.5, NK4: 7.0, NK5: '' }], 'mau-diem-nang-khieu.xlsx')
                }
              >
                Tải mẫu
              </Button>
            </div>
          </div>
        </div>
      </Card>
      <ImportEntityPage
        title="Nhập thông tin cơ bản thí sinh"
        description="Import thông tin cơ bản, cập nhật thủ công và đồng bộ dữ liệu thí sinh."
        uploaderPlaceholder="Chọn file Excel thông tin cơ bản"
        importButtonLabel="Import thông tin cơ bản đã chọn"
        fields={CANDIDATE_FIELDS}
        hiddenTableFieldKeys={['scoreJson']}
        rowSchema={candidateSchema}
        getRows={enrollmentApi.getCandidates}
        importFile={enrollmentApi.importCandidates}
        saveRow={saveCandidate}
        selectOptionsByField={candidateSelectOptions}
        onDraftChange={onCandidateDraftChange}
        listRefreshToken={candidateListVersion}
        sampleRows={[
          {
            idNumber: '079300000000',
            priorityRegion: 'KV1',
            priorityBonus: 0.25,
            priorityGroup: 'UT1',
            graduationYear: 2025,
            academicLevel: 'Giỏi',
            graduationScore: 8.5,
            scoreJson: '{"TO":8.2,"VA":7.8,"LI":7.5,"TO_NL":8.5,"VA_HB":9.0}',
          },
        ]}
      />
    </>
  )
}
