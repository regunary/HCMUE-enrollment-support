# Legacy Admissions Export

Tool này gộp dữ liệu tuyển sinh cũ từ các CSV export từ phpMyAdmin và sinh các file Excel đúng header import của hệ thống mới.

## Input

Export CSV từ phpMyAdmin theo cấu trúc thư mục:

```text
data/legacy_csv/
  tuyensinh2025/
    datats.csv
    data.csv
    data_hocba.csv
    datank.csv
    nguyenvong_1.csv
    tohop.csv
    nganh.csv
  tuyensinh2025_nl/
    data.csv
    datanl.csv
    data_hocba.csv
    datank.csv
    nguyenvong_1.csv
    tohop.csv
    nganh.csv
  tuyensinh2025_nl_sphn/
    ...
  tuyensinh2025_nl_sphn2/
    ...
```

Thiếu file nào script sẽ bỏ qua file đó. CSV nên dùng UTF-8, dấu phân cách comma, dòng đầu là header.

## Run

```powershell
node tools/legacy-export/export_legacy_to_xlsx.js --input data/legacy_csv --output data/legacy_exports/latest
```

Script dùng package `xlsx`. Repo hiện đã có `hcmue_fe/node_modules/xlsx`, nên chạy từ root repo thường không cần cài thêm.

## Output

```text
data/legacy_exports/latest/
  00_subjects.xlsx
  01_regions.xlsx
  02_priority_objects.xlsx
  03_combinations.xlsx
  04_majors_prepare_only.xlsx
  05_candidates_basic.xlsx
  06_scores_thpt.xlsx
  07_scores_hocba.xlsx
  08_scores_dgnl.xlsx
  09_scores_nangkhieu.xlsx
  10_wishes_prepare_only.xlsx
  export_report.json
```

Các file `prepare_only` được xuất để chuẩn bị dữ liệu nhưng backend hiện chưa mount API import thật cho majors/wishes.

## Mapping Rules

- Gộp các database theo thứ tự: `tuyensinh2025`, `tuyensinh2025_nl`, `tuyensinh2025_nl_sphn`, `tuyensinh2025_nl_sphn2`.
- Khi cùng `CCCD` có nhiều dòng, giữ giá trị không trống đầu tiên theo thứ tự trên.
- `SOBAODANH` được xem như `CCCD`.
- `KV_DIEM`: chuẩn hóa thành `1`, `2NT`, `2`, `3`.
- Điểm khu vực:
  - `1`: `0.75`
  - `2NT`: `0.5`
  - `2`: `0.25`
  - `3`: `0`
- `DT_DIEM`: chuẩn hóa về nhóm mã `1..7`, ví dụ `01 -> 1`, `03b -> 3`, `06a -> 6`, `07a -> 7`.
- `DiemUT` cho `DT`: nhóm `1/2/3` là `2`, nhóm `4/5/6/7` là `1`.
- `Hocluc`: `0/1` giữ nguyên; text `Khá/Giỏi` được chuẩn hóa về `0/1`.
- Tổ hợp cũ không có trọng số từng môn nên xuất `TrongSo1..3 = 1`.
- Mã môn trong tổ hợp được giữ theo legacy. Backend import mới tách suffix `*_HB` thành `HOCBA`, `*_NL` thành `DGNL`, và `NK*` thành `CB`.
- `NK6` được giữ trong file năng khiếu, yêu cầu hệ thống mới có môn `NK6`.

## Import Order

1. `00_subjects.xlsx`
2. `01_regions.xlsx`
3. `02_priority_objects.xlsx`
4. `03_combinations.xlsx`
5. `05_candidates_basic.xlsx`
6. `06_scores_thpt.xlsx`
7. `07_scores_hocba.xlsx`
8. `08_scores_dgnl.xlsx`
9. `09_scores_nangkhieu.xlsx`

Sau khi có API backend cho ngành/nguyện vọng, có thể dùng:

- `04_majors_prepare_only.xlsx`
- `10_wishes_prepare_only.xlsx`
