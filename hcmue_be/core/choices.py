from django.db import models


class ActionsChoices(models.TextChoices):
    CREATE = 'create', 'Tạo mới'
    UPDATE = 'update', 'Cập nhật'
    DELETE = 'delete', 'Xóa'


class ScoreTypeChoices(models.TextChoices):
    HOCBA = 'HOCBA', 'Học bạ'
    THPT  = 'THPT',  'Thi THPT'
    DGNL  = 'DGNL',  'Đánh giá năng lực'
    CB    = 'CB',    'Chuyên biệt'


class AdmissionStatusChoices(models.TextChoices):
    ADMITTED = 'admitted', 'Trúng tuyển'
    REJECTED = 'rejected', 'Không đậu'
    PENDING  = 'pending',  'Chờ xét'


class ImportStatusChoices(models.TextChoices):
    PENDING    = 'pending',    'Chờ'
    PROCESSING = 'processing', 'Đang xử lý'
    DONE       = 'done',       'Hoàn thành'
    FAILED     = 'failed',     'Lỗi'


class RoleChoices(models.TextChoices):
    ADMIN   = 'admin',   'Quản trị viên'
    COUNCIL = 'council', 'Hội đồng tuyển sinh'
    FACULTY = 'faculty', 'Giảng viên'
