# Import API Contract

## Common

### Import request
- Method: `POST`
- URL pattern: `/api/v1/{resource}/import/`
- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: multipart/form-data`
- Body:
  - `file` (required): `.xlsx | .xls | .csv`

### API response lỗi (`4xx/5xx`)
```json
{
  "success": false,
  "error": "FILE_INVALID",
  "detail": "Không nhận ra loại file hoặc header không hợp lệ."
}
```

### Phân trang cho GET danh sách
- `page` (optional, mặc định `1`)
- `page_size` (optional, mặc định `20`)

---

## candidate

### get: `/api/v1/candidates/regions/`
- Mô tả: Lấy danh mục khu vực để FE hiển thị dropdown.

Response `200`:
```json
{
  "success": true,
  "results": [
    {
      "code": "KV1",
      "bonus_score": 0.25
    }
  ]
}
```

### post: `/api/v1/candidates/regions/`
- Mô tả: Thêm khu vực thủ công.
- Body:
```json
{
  "code": "KV1",
  "bonus_score": 0.25
}
```

Response `201`:
```json
{
  "success": true,
  "data": {
    "code": "KV1",
    "bonus_score": 0.25
  }
}
```

### post: `/api/v1/candidates/regions/import/`
- Mô tả: Nhập danh mục khu vực trước khi nhập thông tin thí sinh.
- Required columns: `KV, DiemUT`
- Rule:
  - `KV` là mã khu vực tự do, unique theo danh mục.
  - `DiemUT` là điểm ưu tiên khu vực.
  - Khi import thí sinh, cột `KV` phải tồn tại trong danh mục này.
- Error codes:
  - `FILE_INVALID`
  - `MISSING_REQUIRED_COLUMNS`
  - `KV_REQUIRED`
  - `SCORE_OUT_OF_RANGE`

Response `200` (ví dụ):
```json
{
  "success": true,
  "created": 3,
  "updated": 1,
  "skipped": 0,
  "errors": []
}
```

### post: `/api/v1/candidates/`
- Mô tả: Nhập thí sinh thủ công từ form FE.
- Body:
```json
{
  "cccd": "012345678901",
  "graduation_year": 2025,
  "academic_level": "1",
  "graduation_score": 8.5,
  "region_priority": {
    "region_code": "KV1",
    "special_code": "DT1"
  },
  "scores": [
    {
      "score_type": "THPT",
      "subject_id": "TO",
      "score": 8.5
    },
    {
      "score_type": "HOCBA",
      "subject_id": "VA",
      "score": 9.0
    }
  ]
}
```

Validation:
- `cccd`: bắt buộc, đúng 12 chữ số, unique.
- `academic_level`: optional, chỉ nhận `"0"` hoặc `"1"`.
- `graduation_score`: optional, decimal trong `0..10`.
- `region_priority.region_code`: optional, nếu có phải tồn tại trong danh mục khu vực.
- `scores[].score_type`: một trong `HOCBA | THPT | DGNL | CB`.
- `scores[].subject_id`: phải tồn tại trong bảng môn học.
- `scores[].score`: optional, decimal trong `0..10`.
- Không cho trùng cặp `score_type + subject_id` trong cùng payload.

Response `201`:
```json
{
  "success": true,
  "data": {
    "id": "8a7d5c3a-2e11-4f8f-bf11-5a4b7e70d111",
    "cccd": "012345678901",
    "ticket_number": "TS.2026.0001",
    "graduation_year": 2025,
    "academic_level": "1",
    "graduation_score": 8.5,
    "region_priority": {
      "region_code": "KV1",
      "bonus_score": 0.25,
      "special_code": "DT1"
    },
    "scores": [
      {
        "score_type": "THPT",
        "subject_id": "TO",
        "score": 8.5
      }
    ]
  }
}
```

### patch: `/api/v1/candidates/{id}/`
- Mô tả: Cập nhật thí sinh thủ công. Field không gửi thì giữ nguyên. Nếu gửi `scores`, API replace toàn bộ danh sách điểm hiện có.
- Body:
```json
{
  "graduation_score": 8.75,
  "region_priority": {
    "region_code": "KV1",
    "special_code": "DT2"
  },
  "scores": [
    {
      "score_type": "HOCBA",
      "subject_id": "VA",
      "score": 9.25
    }
  ]
}
```

Response `200`: cùng shape với `post /api/v1/candidates/`.

Validation error `400`:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": {
    "cccd": ["CCCD phải đúng 12 chữ số."],
    "region_priority.region_code": ["Khu vực không tồn tại."],
    "scores.0.subject_id": ["Môn học không tồn tại."],
    "scores.1": ["Trùng score_type và subject_id."]
  }
}
```

### post: `/api/v1/candidates/import/`
- Required columns: `CCCD`
- Allowed groups:
  - Thông tin cơ bản: `KV, DT, NamTN, HocLuc12, DiemTN`
  - Điểm thi THPT: `TO, VA, LI, HO, SI, SU, DI, GDCD, GDKTPL, TI, CNNN, CNCN, N1, N2, N3, N4, N5, N6, N7`
  - Điểm thi ĐG Năng lực: `TO_NL, VA_NL, LI_NL, HO_NL, SI_NL, TA_NL`
  - Điểm thi Năng khiếu: `NK2, NK3, NK4, NK5`
  - ĐIểm Học bạ: `TO_HB, VA_HB, LI_HB, HO_HB, SI_HB, SU_HB, DI_HB, TA_HB, TI_HB, CNNN_HB, CNCN_HB, GDCD_HB, GDKTPL_HB`
- Rule: merge theo `CCCD`, ô trống không ghi đè `null`
- Error codes:
  - `FILE_INVALID`
  - `MISSING_REQUIRED_COLUMNS`
  - `CCCD_REQUIRED`
  - `CCCD_FORMAT`
  - `KV_NOT_FOUND`
  - `HOC_LUC_INVALID`
  - `SCORE_OUT_OF_RANGE`
  - `FILE_MIXED_TYPES`

Response `200` (ví dụ):
```json
{
  "success": true,
  "created": 45,
  "updated": 120,
  "skipped": 3,
  "errors": [
    {
      "row": 7,
      "code": "CCCD_FORMAT",
      "message": "CCCD không đúng 12 chữ số",
      "identifier": { "field": "CCCD", "value": "12345" }
    }
  ]
}
```

### post: `/api/v1/candidates/scores/thpt/import/`
- Mô tả: Import điểm thi THPT theo `CCCD`.
- Required columns: `CCCD`
- Score columns: `TO, VA, LI, HO, SI, SU, DI, GDCD, GDKTPL, TI, CNNN, CNCN, N1, N2, N3, N4, N5, N6, N7`
- Rule:
  - Map `CCCD` tới thí sinh đã tồn tại.
  - Ghi vào `ScoreBoard.score_type = THPT`.
  - Mỗi cột điểm map trực tiếp tới `Subject.id` cùng mã.
  - Ô trống không ghi đè điểm hiện có.
  - Điểm hợp lệ trong khoảng `0..10`.

Response `200`:
```json
{
  "success": true,
  "created": 2,
  "updated": 1,
  "skipped": 0,
  "errors": []
}
```

### post: `/api/v1/candidates/scores/nang-luc/import/`
- Mô tả: Import điểm thi đánh giá năng lực theo `CCCD`.
- Required columns: `CCCD`
- Score columns: `TO_NL, VA_NL, LI_NL, HO_NL, SI_NL, TA_NL`
- Rule:
  - Map `CCCD` tới thí sinh đã tồn tại.
  - Ghi vào `ScoreBoard.score_type = DGNL`.
  - Cột `*_NL` map về môn gốc, ví dụ `TO_NL -> TO`, `VA_NL -> VA`.
  - Ô trống không ghi đè điểm hiện có.
  - Điểm hợp lệ trong khoảng `0..1200`.

Response `200`: cùng shape với import điểm THPT.

### post: `/api/v1/candidates/scores/nang-khieu/import/`
- Mô tả: Import điểm thi năng khiếu theo `CCCD`.
- Required columns: `CCCD`
- Score columns: `NK2, NK3, NK4, NK5`
- Rule:
  - Map `CCCD` tới thí sinh đã tồn tại.
  - Ghi vào `ScoreBoard.score_type = CB`.
  - Mỗi cột điểm map trực tiếp tới `Subject.id` cùng mã.
  - Ô trống không ghi đè điểm hiện có.
  - Điểm hợp lệ trong khoảng `0..10`.

Response `200`: cùng shape với import điểm THPT.

Score import error codes:
- `FILE_INVALID`
- `MISSING_REQUIRED_COLUMNS`
- `CCCD_REQUIRED`
- `CCCD_FORMAT`
- `CANDIDATE_NOT_FOUND`
- `SUBJECT_NOT_FOUND`
- `SCORE_OUT_OF_RANGE`

### get: `/api/v1/candidates/`
- Mô tả: Lấy danh sách thí sinh đã import (có phân trang).
- Dữ liệu trả về: đầy đủ tất cả trường hiện có của thí sinh.

Response `200` (ví dụ):
```json
{
  "success": true,
  "page": 1,
  "page_size": 20,
  "count": 2,
  "results": [
    {
      "cccd": "012345678901",
      "info": {
        "priority_region": 1,
        "priority_group": 0,
        "graduation_year": 2025,
        "academic_performance_12": 2,
        "graduation_exam_score": 8.5
      },
      "scores": {
        "TO": 8.5,
        "VA": 7.0,
        "LI": 7.5,
        "HO": null,
        "SI": null,
        "SU": null,
        "DI": null,
        "GDCD": null,
        "GDKTPL": null,
        "TI": null,
        "CNNN": null,
        "CNCN": null,
        "N1": null,
        "N2": null,
        "N3": null,
        "N4": null,
        "N5": null,
        "N6": null,
        "N7": null,
        "TO_NL": null,
        "VA_NL": null,
        "LI_NL": null,
        "HO_NL": null,
        "SI_NL": null,
        "TA_NL": null,
        "NK2": null,
        "NK3": null,
        "NK4": null,
        "NK5": null,
        "TO_HB": null,
        "VA_HB": null,
        "LI_HB": null,
        "HO_HB": null,
        "SI_HB": null,
        "SU_HB": null,
        "DI_HB": null,
        "TA_HB": null,
        "TI_HB": null,
        "CNNN_HB": null,
        "CNCN_HB": null,
        "GDCD_HB": null,
        "GDKTPL_HB": null
      }
    }
  ]
}
```

### get sample: `/api/v1/candidates/sample/?type=thong_tin_co_ban|diem_thi_thpt|diem_nang_luc|diem_nang_khieu|diem_hoc_ba`
- Mô tả: Tải file mẫu `.xlsx`.

---

## combination

### post: `/api/v1/combinations/`
- Mô tả: Nhập tổ hợp thủ công từ form FE.
- Body:
```json
{
  "id": "A00",
  "name": "Toán Lí Hóa",
  "subjects": [
    {
      "score_type": "THPT",
      "subject_id": "TO",
      "weight": 1
    },
    {
      "score_type": "THPT",
      "subject_id": "LI",
      "weight": 1
    },
    {
      "score_type": "THPT",
      "subject_id": "HO",
      "weight": 1
    }
  ]
}
```

FE mapping:
- `id`: mã tổ hợp.
- `name`: tên hiển thị optional.
- `subjects[]`: danh sách dòng động. Mỗi dòng gồm:
  - `score_type`: chọn từ `HOCBA | THPT | DGNL | CB`.
  - `subject_id`: chọn từ danh mục môn học.
  - `weight`: trọng số môn trong tổ hợp.

Validation:
- `id`: bắt buộc khi tạo mới, unique, không đổi khi update.
- `subjects[].subject_id`: phải tồn tại trong danh mục môn học.
- Không cho trùng `subject_id` trong cùng tổ hợp.
- Tổng `weight` phải lớn hơn `0`.

Response `201`:
```json
{
  "success": true,
  "data": {
    "id": "A00",
    "name": "Toán Lí Hóa",
    "subjects": [
      {
        "score_type": "THPT",
        "subject_id": "TO",
        "weight": 1,
        "position": 1
      }
    ]
  }
}
```

### patch: `/api/v1/combinations/{id}/`
- Mô tả: Cập nhật tổ hợp thủ công. Field không gửi thì giữ nguyên. Nếu gửi `subjects`, API replace toàn bộ danh sách môn hiện có.
- Body:
```json
{
  "name": "Toán Văn",
  "subjects": [
    {
      "score_type": "THPT",
      "subject_id": "TO",
      "weight": 1
    },
    {
      "score_type": "THPT",
      "subject_id": "VA",
      "weight": 2
    }
  ]
}
```

Response `200`: cùng shape với `post /api/v1/combinations/`.

Validation error `400`:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": {
    "id": ["Mã tổ hợp đã tồn tại."],
    "subjects.0.subject_id": ["Môn học không tồn tại."],
    "subjects.1": ["Trùng môn trong tổ hợp."]
  }
}
```

### post: `/api/v1/combinations/import/`
- Required columns: `MaTH, Mon1, Mon2, Mon3, TrongSo1, TrongSo2, TrongSo3`
- Rule:
  - Import Excel dùng format cũ, mỗi dòng có đúng 3 môn.
  - `score_type` của các môn import mặc định là `THPT`.
  - Import merge theo `MaTH`; nếu tổ hợp đã tồn tại thì replace danh sách môn theo file.
- Error codes:
  - `FILE_INVALID`
  - `MISSING_REQUIRED_COLUMNS`
  - `CODE_REQUIRED`
  - `FIELD_REQUIRED`
  - `WEIGHTS_ZERO`
  - `SUBJECT_NOT_FOUND`
  - `SUBJECTS_DUPLICATE`

Response `200` (ví dụ):
```json
{
  "success": true,
  "created": 10,
  "updated": 5,
  "skipped": 1,
  "errors": []
}
```

### get: `/api/v1/combinations/`
- Mô tả: Lấy danh sách tổ hợp đã import/nhập tay.
- Dữ liệu trả về: đầy đủ tất cả trường của tổ hợp.

Response `200` (ví dụ):
```json
{
  "success": true,
  "results": [
    {
      "id": "A00",
      "name": "Toán Lí Hóa",
      "subjects": [
        {
          "score_type": "THPT",
          "subject_id": "TO",
          "weight": 1,
          "position": 1
        }
      ]
    }
  ]
}
```

### get sample: `/api/v1/combinations/sample/`
- Mô tả: Tải file mẫu `.xlsx`.

---

## major

### post: `/api/v1/majors/import/`
- Required columns: `MaNganh, TenNganh, MaTH`
- Optional columns: `DiemSan, DiemLech`
- Error codes:
  - `FILE_INVALID`
  - `MISSING_REQUIRED_COLUMNS`
  - `CODE_REQUIRED`
  - `NAME_REQUIRED`
  - `COMBINATION_NOT_FOUND`
  - `COMBINATION_DUPLICATE`

Response `200` (ví dụ):
```json
{
  "success": true,
  "created": 3,
  "updated": 2,
  "skipped": 0,
  "errors": []
}
```

### get: `/api/v1/majors/`
- Mô tả: Lấy danh sách ngành đã import (có phân trang).
- Dữ liệu trả về: đầy đủ tất cả trường của ngành và danh sách tổ hợp.

Response `200` (ví dụ):
```json
{
  "success": true,
  "page": 1,
  "page_size": 20,
  "count": 2,
  "results": [
    {
      "code": "7480201",
      "name": "Công nghệ thông tin",
      "combinations": [
        { "code": "A00", "floor_score": 18.0, "delta": 0.0 }
      ]
    }
  ]
}
```

### get sample: `/api/v1/majors/sample/`
- Mô tả: Tải file mẫu `.xlsx`.

---

## wish

### post: `/api/v1/wishes/import/`
- Required columns: `CCCD, MaNganh, ThuTuNV`
- Error codes:
  - `FILE_INVALID`
  - `MISSING_REQUIRED_COLUMNS`
  - `CCCD_INVALID`
  - `MAJOR_NOT_FOUND`
  - `ORDER_INVALID`
  - `ORDER_DUPLICATE`
  - `CANDIDATE_NOT_FOUND`

Response `200` (ví dụ):
```json
{
  "success": true,
  "created": 20,
  "updated": 12,
  "skipped": 2,
  "errors": []
}
```

### get: `/api/v1/wishes/`
- Mô tả: Lấy danh sách nguyện vọng đã import (có phân trang).
- Dữ liệu trả về: đầy đủ tất cả trường của nguyện vọng.

Response `200` (ví dụ):
```json
{
  "success": true,
  "page": 1,
  "page_size": 20,
  "count": 2,
  "results": [
    {
      "cccd": "012345678901",
      "major_code": "7480201",
      "order": 1
    }
  ]
}
```

### get sample: `/api/v1/wishes/sample/`
- Mô tả: Tải file mẫu `.xlsx`.

---

## exclusion

### post: `/api/v1/exclusions/import/`
- Required columns: `CCCD, MaNganh, PhuongThuc, LyDo`
- Error codes:
  - `FILE_INVALID`
  - `MISSING_REQUIRED_COLUMNS`
  - `CCCD_INVALID`
  - `MAJOR_NOT_FOUND`
  - `METHOD_INVALID`
  - `REASON_REQUIRED`

Response `200` (ví dụ):
```json
{
  "success": true,
  "created": 6,
  "updated": 1,
  "skipped": 0,
  "errors": [],
  "results": [
    {
      "cccd": "012345678901",
      "major_code": "7480201",
      "method": 1,
      "reason": "Đã trúng tuyển theo phương thức xét học bạ"
    }
  ]
}
```

### get: `/api/v1/exclusions/`
- Mô tả: Lấy danh sách loại bỏ đã import (có phân trang).
- Dữ liệu trả về: đầy đủ tất cả trường của exclusion.

Response `200` (ví dụ):
```json
{
  "success": true,
  "page": 1,
  "page_size": 20,
  "count": 2,
  "results": [
    {
      "cccd": "012345678901",
      "major_code": "7480201",
      "method": 1,
      "reason": "Đã trúng tuyển theo phương thức xét học bạ"
    }
  ]
}
```

### get sample: `/api/v1/exclusions/sample/`
- Mô tả: Tải file mẫu `.xlsx`.

---

## criteria

### post: `/api/v1/criteria/import/`
- Required columns: `MaNganh, MaTH, DieuKienJson`
- `DieuKienJson`: JSON DSL dạng cây điều kiện, rõ ràng để backend parse và evaluate.
- Ví dụ `DieuKienJson` trong file:
  - `{"logic":"and","rules":[{"field":"NK2","operator":">=","value":6.5},{"field":"NK3","operator":">=","value":6.5}]}`
- Error codes:
  - `FILE_INVALID`
  - `MISSING_REQUIRED_COLUMNS`
  - `MAJOR_NOT_FOUND`
  - `COMBINATION_NOT_FOUND`
  - `COMBINATION_NOT_IN_MAJOR`
  - `CONDITION_REQUIRED`
  - `CONDITION_JSON_INVALID`
  - `CONDITION_UNKNOWN_FIELD`

Response `200` (ví dụ):
```json
{
  "success": true,
  "created": 8,
  "updated": 4,
  "skipped": 1,
  "errors": []
}
```

### get: `/api/v1/criteria/`
- Mô tả: Lấy danh sách điều kiện đã import (có phân trang).
- Dữ liệu trả về: đầy đủ tất cả trường của criteria.

Response `200` (ví dụ):
```json
{
  "success": true,
  "page": 1,
  "page_size": 20,
  "count": 2,
  "results": [
    {
      "major_code": "7140231",
      "combination_code": "NK45",
      "condition_json": {
        "logic": "and",
        "rules": [
          { "field": "NK2", "operator": ">=", "value": 6.5 },
          { "field": "NK3", "operator": ">=", "value": 6.5 }
        ]
      }
    }
  ]
}
```

### get sample: `/api/v1/criteria/sample/`
- Mô tả: Tải file mẫu `.xlsx`.
