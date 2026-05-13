# Đối chiếu triển khai bách phân vị điểm thi trong `hcmue_be`

Tài liệu này mô tả cách backend đang triển khai bách phân vị cho điểm xét tuyển. Mục tiêu là để đối chiếu giữa nghiệp vụ, cấu trúc dữ liệu BE và nhu cầu hiển thị của FE.

Nguồn tham chiếu công thức ban đầu: <https://dochiase.com/cach-tinh-bach-phan-vi/>

## 1. Nguyên tắc triển khai

Backend tính bách phân vị theo `MajorCombination`.

`MajorCombination` là một bản ghi đại diện cho quan hệ:

```text
Ngành + Tổ hợp xét tuyển
```

Vì vậy, nếu hai ngành cùng dùng tổ hợp `A00`, backend vẫn xem là hai nhóm tính riêng:

```text
Sư phạm Toán + A00  -> MajorCombination #1
Sư phạm Vật lý + A00 -> MajorCombination #2
```

Lý do: cùng một mã tổ hợp có thể cho điểm xét tuyển khác nhau giữa các ngành do `score_offset`, điều kiện ngành, điểm ưu tiên hoặc cấu hình nghiệp vụ riêng.

## 2. Công thức bách phân vị

Backend dùng công thức theo bài chia sẻ:

```text
position = (k / 100) * (n + 1)
```

Trong đó:

- `k`: mốc bách phân vị, ví dụ `10`, `25`, `50`, `75`, `90`.
- `n`: số lượng điểm hợp lệ trong nhóm.
- Dữ liệu điểm được sắp xếp tăng dần trước khi tính.
- Nếu `position` nằm giữa hai vị trí, backend nội suy tuyến tính.

Quy tắc biên đang áp dụng:

- Không có điểm hợp lệ: trả `null`, không tạo point.
- `k <= 0`: lấy điểm nhỏ nhất.
- `k >= 100`: lấy điểm lớn nhất.
- `position <= 1`: lấy điểm nhỏ nhất.
- `position >= n`: lấy điểm lớn nhất.
- Còn lại: nội suy giữa hai điểm liền kề.

Ví dụ:

```text
Điểm đã sắp xếp: 4, 5, 6, 6, 7, 7, 8, 8, 9, 10
P75 = 0.75 * (10 + 1) = 8.25
Giá trị thứ 8 = 8
Giá trị thứ 9 = 9
P75 = 8 + 0.25 * (9 - 8) = 8.25
```

Code đối chiếu:

```text
hcmue_be/src/analytics/services.py
calculate_percentile(scores, percentile)
```

## 3. Dữ liệu đầu vào

Backend không tính bách phân vị trực tiếp trên điểm môn rời rạc. Backend tính điểm xét tuyển theo `MajorCombination`, sau đó mới tính bách phân vị.

Luồng dữ liệu:

```text
Candidate
  -> ScoreBoard
  -> SubjectScore
  -> MajorCombination
  -> điểm xét tuyển theo ngành + tổ hợp
  -> PercentileSnapshot
  -> API table cho FE
```

Các model liên quan:

- `Candidate`: thí sinh.
- `ScoreBoard`: bảng điểm theo nguồn điểm, ví dụ `THPT`, `HOCBA`, `DGNL`, `CB`.
- `SubjectScore`: điểm từng môn trong từng bảng điểm.
- `SubjectCombination`: mã tổ hợp, ví dụ `A00`.
- `CombinationSubject`: môn trong tổ hợp, trọng số, nguồn điểm.
- `Major`: ngành.
- `MajorCombination`: ngành + tổ hợp.
- `Aspiration`: nguyện vọng của thí sinh theo ngành.
- `PercentileSnapshot`: kết quả bách phân vị đã lưu.

## 4. Cách tính điểm xét tuyển theo `MajorCombination`

Với mỗi `MajorCombination`, backend lấy danh sách thí sinh có `Aspiration` vào ngành tương ứng.

Với từng thí sinh, backend tính điểm theo các môn trong `major_combination.subject_combination.subjects`.

Công thức điểm tổ hợp:

```text
weighted_score = SUM(subject_score * weight)
```

Sau đó cộng thêm:

```text
final_score = weighted_score + major_combination.score_offset + region_priority.bonus_score
```

Trong đó:

- `major_combination.score_offset`: điểm lệch theo ngành + tổ hợp.
- `region_priority.bonus_score`: điểm ưu tiên khu vực/đối tượng của thí sinh, nếu có.
- Nếu thí sinh thiếu bảng điểm, thiếu môn hoặc điểm môn là `null`, thí sinh đó không được đưa vào nhóm điểm của `MajorCombination` đó.

Code đối chiếu:

```text
hcmue_be/src/analytics/services.py
calculate_candidate_score_for_major_combination(candidate, major_combination)
scores_for_major_combination(major_combination)
```

## 5. Snapshot bách phân vị

Kết quả tính được lưu vào `PercentileSnapshot`.

Mỗi snapshot được định danh bởi:

```text
major_combination + percentile + round
```

Ví dụ:

```text
MajorCombination #12, P50, round 1 -> score 24.00
MajorCombination #15, P50, round 1 -> score 24.75
```

Nếu chạy recompute lại cùng `major_combination`, `percentile`, `round`, backend cập nhật snapshot cũ thay vì tạo trùng.

Code đối chiếu:

```text
hcmue_be/src/analytics/models.py
PercentileSnapshot
PercentileSnapshotLog

hcmue_be/src/analytics/services.py
recompute_major_combination_percentiles(...)
```

## 6. API recompute

Endpoint:

```text
POST /api/v1/analytics/percentiles/recompute/
```

Mục đích:

- Tính lại bách phân vị.
- Lưu vào `PercentileSnapshot`.
- Trả về danh sách snapshot vừa tính theo từng `MajorCombination`.

Payload:

```json
{
  "round": 1,
  "percentiles": [10, 25, 50, 75, 90],
  "major_combination_id": 12
}
```

Ý nghĩa field:

- `round`: đợt xét tuyển.
- `percentiles`: các mốc bách phân vị cần tính.
- `major_combination_id`: tùy chọn. Nếu có, chỉ tính một `MajorCombination`. Nếu không có, tính toàn bộ `MajorCombination`.

Response:

```json
{
  "success": true,
  "data": [
    {
      "major_combination_id": 12,
      "major_id": "7140209",
      "combination_id": "A00",
      "round": 1,
      "count": 120,
      "points": [
        { "percentile": 10, "score": "18.25" },
        { "percentile": 25, "score": "20.10" },
        { "percentile": 50, "score": "23.40" },
        { "percentile": 75, "score": "25.80" },
        { "percentile": 90, "score": "27.15" }
      ]
    }
  ]
}
```

Code đối chiếu:

```text
hcmue_be/src/analytics/views.py
PercentileRecomputeView

hcmue_be/src/analytics/serializers.py
PercentileRecomputeSerializer

hcmue_be/src/analytics/urls.py
percentiles/recompute/
```

## 7. API table cho FE

Endpoint:

```text
GET /api/v1/analytics/percentiles/tables/?round=1&percentiles=10,25,50,75,90
```

Mục đích:

- Đọc dữ liệu từ `PercentileSnapshot`.
- Pivot sẵn thành dạng FE render table trực tiếp.
- Trả về một bảng `all` không phân theo ngành.
- Trả về nhiều bảng ngành trong `majors`.

Code đối chiếu:

```text
hcmue_be/src/analytics/views.py
PercentileTableView

hcmue_be/src/analytics/serializers.py
PercentileTableQuerySerializer

hcmue_be/src/analytics/services.py
build_percentile_tables(...)
```

## 8. Cấu trúc response table

Response tổng quát:

```json
{
  "success": true,
  "data": {
    "round": 1,
    "percentiles": [10, 25, 50, 75, 90],
    "all": {},
    "majors": []
  }
}
```

### 8.1. Bảng `all`

`data.all` là bảng không phân theo ngành.

FE hiển thị:

- Mỗi cột là một mã tổ hợp.
- Mỗi dòng là một mốc bách phân vị.
- Mỗi cell là điểm ở mốc đó.

Shape:

```json
{
  "title": "Tất cả ngành",
  "columns": [
    {
      "key": "A00",
      "combination_id": "A00",
      "label": "A00"
    }
  ],
  "rows": [
    {
      "percentile": 50,
      "label": "P50",
      "values": {
        "A00": "24.50"
      }
    }
  ]
}
```

Quy ước key:

```text
column.key = combination_id
row.values[combination_id] = score
```

Ví dụ FE đọc cell:

```ts
const score = row.values[column.key]
```

### 8.2. Bảng từng ngành

`data.majors` là danh sách bảng theo ngành.

FE hiển thị:

- Mỗi item trong `majors` là một table.
- Tiêu đề bảng lấy từ `title` hoặc `major_name`.
- Mỗi cột là một `MajorCombination` của ngành.
- Label cột là mã tổ hợp, ví dụ `A00`.
- Key cột là `major_combination_id` dạng chuỗi.

Shape:

```json
{
  "major_id": "7140209",
  "major_name": "Sư phạm Toán",
  "title": "Sư phạm Toán",
  "columns": [
    {
      "key": "12",
      "major_combination_id": 12,
      "combination_id": "A00",
      "label": "A00"
    }
  ],
  "rows": [
    {
      "percentile": 50,
      "label": "P50",
      "values": {
        "12": "24.00"
      }
    }
  ]
}
```

Quy ước key:

```text
column.key = String(major_combination_id)
row.values[String(major_combination_id)] = score
```

Lý do dùng `major_combination_id` làm key cho bảng ngành:

```text
Trong cùng hệ thống, nhiều ngành có thể dùng chung combination_id.
Điểm xét tuyển được tính theo MajorCombination, không tính theo combination_id đơn lẻ.
major_combination_id là khóa không nhập nhằng cho từng cột dữ liệu.
```

## 9. Ví dụ response đầy đủ

```json
{
  "success": true,
  "data": {
    "round": 1,
    "percentiles": [50, 75, 90],
    "all": {
      "title": "Tất cả ngành",
      "columns": [
        { "key": "A00", "combination_id": "A00", "label": "A00" },
        { "key": "D01", "combination_id": "D01", "label": "D01" }
      ],
      "rows": [
        {
          "percentile": 50,
          "label": "P50",
          "values": {
            "A00": "24.50",
            "D01": "23.75"
          }
        },
        {
          "percentile": 75,
          "label": "P75",
          "values": {
            "A00": "26.10",
            "D01": "25.20"
          }
        },
        {
          "percentile": 90,
          "label": "P90",
          "values": {
            "A00": "27.30",
            "D01": "26.40"
          }
        }
      ]
    },
    "majors": [
      {
        "major_id": "7140209",
        "major_name": "Sư phạm Toán",
        "title": "Sư phạm Toán",
        "columns": [
          {
            "key": "12",
            "major_combination_id": 12,
            "combination_id": "A00",
            "label": "A00"
          },
          {
            "key": "13",
            "major_combination_id": 13,
            "combination_id": "A01",
            "label": "A01"
          }
        ],
        "rows": [
          {
            "percentile": 50,
            "label": "P50",
            "values": {
              "12": "24.00",
              "13": "23.50"
            }
          }
        ]
      }
    ]
  }
}
```

## 10. Cách FE render

FE render bảng `all`:

```ts
const table = response.data.all

table.columns.map((column) => column.label)
table.rows.map((row) => row.values[column.key])
```

FE render bảng theo ngành:

```ts
response.data.majors.map((table) => {
  const title = table.title
  const headers = table.columns.map((column) => column.label)
  const cells = table.rows.map((row) =>
    table.columns.map((column) => row.values[column.key])
  )
})
```

FE không cần tự pivot dữ liệu percentile. BE đã trả sẵn `columns` và `rows`.

## 11. Permission

Các endpoint analytics dùng permission:

```text
IsAdminOrCouncil
```

Các vai trò được gọi:

- `admin`
- `council`

## 12. Test đối chiếu

Test hiện có:

```text
hcmue_be/src/analytics/tests.py
```

Các hành vi được test:

- `calculate_percentile` dùng công thức `(n + 1)` và nội suy.
- Recompute tạo snapshot riêng cho từng `MajorCombination`, kể cả khi hai ngành dùng chung mã tổ hợp.
- API table trả shape phù hợp với FE: bảng `all`, bảng từng ngành, columns và rows đã pivot.

Lưu ý môi trường:

```text
python manage.py check
```

đã chạy được.

```text
python manage.py test src.analytics.tests
```

cần PostgreSQL chạy ở `localhost:5432` theo cấu hình `.env`.
